import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const ARENA_WIDTH = 1400;
const ARENA_HEIGHT = 800;
const PLAYER_SIZE = 40;
const SPEED = 6;
const MAX_CAPACITY = 5;
const START_TIME = 15;
const INTERACTION_DISTANCE = 60; 
const SHELTER_POS = { x: 700, y: 400, radius: 100 };

const ITEM_TYPES = [
  { id: 'child', name: 'Çocuk', size: 3, icon: '🧒', spawn: [1, 1] },
  { id: 'spouse', name: 'Eş', size: 3, icon: '🧑', spawn: [1, 1] },
  { id: 'water', name: 'Su Şişesi', size: 1, icon: '💧', spawn: [6, 8] }, 
  { id: 'soup', name: 'Çorba', size: 1, icon: '🥫', spawn: [6, 8] },     
  { id: 'radio', name: 'Radyo', size: 1, icon: '📻', spawn: [1, 2] },
  { id: 'medkit', name: 'İlk Yardım', size: 2, icon: '🩹', spawn: [1, 2] },
  { id: 'axe', name: 'Balta', size: 2, icon: '🪓', spawn: [1, 1] },
  { id: 'mask', name: 'Gaz Maskesi', size: 1, icon: '🤿', spawn: [1, 2] },
  { id: 'gun', name: 'Silah', size: 2, icon: '🔫', spawn: [1, 1] },
  { id: 'ammo', name: 'Mermi', size: 1, icon: '🔘', spawn: [2, 3] },
];

function App() {
  const [gameState, setGameState] = useState('start'); 
  
  // Phase 1 (Toplama) Stateleri
  const [timeLeft, setTimeLeft] = useState(START_TIME);
  const [inventory, setInventory] = useState([]);
  const [itemsOnMap, setItemsOnMap] = useState([]);
  const [capacityWarning, setCapacityWarning] = useState(false);
  const [playerPos, setPlayerPos] = useState({ x: 100, y: 100 });
  const playerRef = useRef({ x: 100, y: 100 });
  const keysRef = useRef({ w: false, a: false, s: false, d: false, e: false });
  const inventoryRef = useRef([]);
  const itemsOnMapRef = useRef([]);
  const shelterItemsRef = useRef([]);
  const requestRef = useRef();

  // Phase 2 (Sığınak / Survival) Stateleri
  const [day, setDay] = useState(1);
  const [survivors, setSurvivors] = useState([]);
  const [supplies, setSupplies] = useState({ soup: 0, water: 0, medkit: 0, radio: 0, axe: 0, mask: 0, gun: 0, ammo: 0 });
  const [logs, setLogs] = useState([]);
  const [eventModal, setEventModal] = useState(null);

  // Rastgele eşyalar oluşturma
  const generateItems = () => {
    const generated = [];
    ITEM_TYPES.forEach(type => {
      const min = type.spawn[0];
      const max = type.spawn[1];
      const count = Math.floor(Math.random() * (max - min + 1)) + min;
      for (let i = 0; i < count; i++) {
        let rx, ry;
        do {
          rx = Math.random() * (ARENA_WIDTH - 100) + 50;
          ry = Math.random() * (ARENA_HEIGHT - 100) + 50;
        } while (Math.hypot(rx - SHELTER_POS.x, ry - SHELTER_POS.y) < SHELTER_POS.radius + 50);

        generated.push({ uid: `${type.id}-${i}-${Date.now()}`, ...type, x: rx, y: ry });
      }
    });
    return generated;
  };

  const startGame = () => {
    setGameState('playing');
    setTimeLeft(START_TIME);
    const initialItems = generateItems();
    itemsOnMapRef.current = initialItems;
    setItemsOnMap(initialItems);
    inventoryRef.current = [];
    setInventory([]);
    shelterItemsRef.current = [];
    playerRef.current = { x: 100, y: 100 };
    setPlayerPos({ x: 100, y: 100 });
    setCapacityWarning(false);
  };

  useEffect(() => {
    let timerId;
    if (gameState === 'playing') {
      timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerId);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [gameState]);

  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      const distToShelter = Math.hypot(
        playerRef.current.x - SHELTER_POS.x, 
        playerRef.current.y - SHELTER_POS.y
      );
      if (distToShelter <= SHELTER_POS.radius + 20) {
        setupSurvival(); 
      } else {
        setGameState('gameover'); 
      }
    }
  }, [timeLeft, gameState]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (keysRef.current.hasOwnProperty(key) || key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
        if (key === 'w' || key === 'arrowup') keysRef.current.w = true;
        if (key === 'a' || key === 'arrowleft') keysRef.current.a = true;
        if (key === 's' || key === 'arrowdown') keysRef.current.s = true;
        if (key === 'd' || key === 'arrowright') keysRef.current.d = true;
        if (key === 'e') keysRef.current.e = true;
      }
    };
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (keysRef.current.hasOwnProperty(key) || key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright') {
        if (key === 'w' || key === 'arrowup') keysRef.current.w = false;
        if (key === 'a' || key === 'arrowleft') keysRef.current.a = false;
        if (key === 's' || key === 'arrowdown') keysRef.current.s = false;
        if (key === 'd' || key === 'arrowright') keysRef.current.d = false;
        if (key === 'e') keysRef.current.e = false;
      }
    };
    if (gameState === 'playing') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const handleControlStart = (key) => { keysRef.current[key] = true; };
  const handleControlEnd = (key) => { keysRef.current[key] = false; };

  const updateGame = () => {
    if (gameState !== 'playing') return;

    let { x, y } = playerRef.current;
    const keys = keysRef.current;

    if (keys.w) y -= SPEED;
    if (keys.s) y += SPEED;
    if (keys.a) x -= SPEED;
    if (keys.d) x += SPEED;

    x = Math.max(PLAYER_SIZE/2, Math.min(ARENA_WIDTH - PLAYER_SIZE/2, x));
    y = Math.max(PLAYER_SIZE/2, Math.min(ARENA_HEIGHT - PLAYER_SIZE/2, y));

    playerRef.current = { x, y };
    setPlayerPos({ x, y }); 

    let closestItem = null;
    let minDistance = INTERACTION_DISTANCE;

    itemsOnMapRef.current.forEach(item => {
      const dist = Math.hypot(item.x - x, item.y - y);
      if (dist < minDistance) {
        minDistance = dist;
        closestItem = item;
      }
    });

    if (keys.e && closestItem) {
      keys.e = false; 
      const usedCap = inventoryRef.current.reduce((tot, i) => tot + i.size, 0);
      if (usedCap + closestItem.size <= MAX_CAPACITY) {
        inventoryRef.current = [...inventoryRef.current, closestItem];
        itemsOnMapRef.current = itemsOnMapRef.current.filter(i => i.uid !== closestItem.uid);
        setInventory([...inventoryRef.current]);
        setItemsOnMap([...itemsOnMapRef.current]);
        setCapacityWarning(false);
      } else {
        setCapacityWarning(true);
        setTimeout(() => setCapacityWarning(false), 2000);
      }
    }

    const distToShelter = Math.hypot(x - SHELTER_POS.x, y - SHELTER_POS.y);
    if (distToShelter <= SHELTER_POS.radius) {
      if (inventoryRef.current.length > 0) {
        shelterItemsRef.current = [...shelterItemsRef.current, ...inventoryRef.current];
        inventoryRef.current = [];
        setInventory([]);
      }
    }
    requestRef.current = requestAnimationFrame(updateGame);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);


  /* =========================================================
     PHASE 2: SURVIVAL MANTIKLARI
     ========================================================= */

  const setupSurvival = () => {
    const saved = shelterItemsRef.current;
    
    const survs = [{
      id: 'me', name: 'Sen', icon: '👤',
      isAlive: true, isSick: false, 
      needsFood: false, needsWater: false, 
      daysHungry: 0, daysThirsty: 0, daysSick: 0, 
      status: 'shelter', expeditionDays: 0
    }];

    const hasChild = saved.some(i => i.id === 'child');
    const hasSpouse = saved.some(i => i.id === 'spouse');
    
    if (hasChild) survs.push({ id: 'child', name: 'Çocuk', icon: '🧒', isAlive: true, isSick: false, needsFood: false, needsWater: false, daysHungry: 0, daysThirsty: 0, daysSick: 0, status: 'shelter', expeditionDays: 0 });
    if (hasSpouse) survs.push({ id: 'spouse', name: 'Eş', icon: '🧑', isAlive: true, isSick: false, needsFood: false, needsWater: false, daysHungry: 0, daysThirsty: 0, daysSick: 0, status: 'shelter', expeditionDays: 0 });

    setSurvivors(survs);

    const initialSupplies = { soup: 0, water: 0, medkit: 0, radio: 0, axe: 0, mask: 0, gun: 0, ammo: 0 };
    saved.forEach(item => {
      if (initialSupplies[item.id] !== undefined) {
        initialSupplies[item.id]++;
      }
    });
    
    setSupplies(initialSupplies);
    setDay(1);
    setLogs(['Sığınağa ulaştınız. Kapı kapandı.']);
    setGameState('survival');
  };

  // ---- EVENT AKSİYONLARI ----
  const fireGun = () => {
    setSupplies(prev => ({ ...prev, ammo: prev.ammo - 1 }));
    setLogs(prev => [`[Gün ${day}] Silahı ateşleyip haydutları korkutarak kaçırdınız! (-1 Mermi)`, ...prev]);
    setEventModal(null);
  };

  const hideFromBandits = () => {
    if (Math.random() < 0.5) {
      setLogs(prev => [`[Gün ${day}] Haydutlar kapıyı kırdı ve erzak çaldılar! (-1 Çorba, -1 Su)`, ...prev]);
      setSupplies(prev => ({ ...prev, soup: Math.max(0, prev.soup - 1), water: Math.max(0, prev.water - 1) }));
    } else {
      setLogs(prev => [`[Gün ${day}] Ses çıkarmadınız. Haydutlar kapıyı zorlayıp vazgeçtiler.`, ...prev]);
    }
    setEventModal(null);
  };

  const tradeWithStranger = (accept) => {
    if (accept) {
      setSupplies(prev => ({ ...prev, water: prev.water - 1, ammo: prev.ammo + 2 }));
      setLogs(prev => [`[Gün ${day}] Yaşlı adama su verdiniz. O da masaya 2 Mermi bıraktı.`, ...prev]);
    } else {
      setLogs(prev => [`[Gün ${day}] Yabancıya kapıyı açmadınız. Homurdanarak uzaklaştı.`, ...prev]);
    }
    setEventModal(null);
  };

  const simpleAck = (msg) => {
    setLogs(prev => [`[Gün ${day}] ${msg}`, ...prev]);
    setEventModal(null);
  }

  // ---------------------------

  const nextDay = () => {
    let currentLog = [];
    let newSupplies = { ...supplies };
    const nextDayNum = day + 1;
    let eventTriggered = false;

    // EVENT (RASTGELE OLAY) KONTROLÜ (%25 şans)
    const eventChance = Math.random();
    if (eventChance < 0.25) {
      eventTriggered = true;
      const eventType = Math.random();
      
      if (eventType < 0.3) {
        // Hediye (Eski mantık)
        newSupplies.water += 1;
        newSupplies.soup += 1;
        setEventModal({
          title: 'Sürpriz Paket!',
          msg: 'Kapıya gizemli biri paket bırakmış! (+1 Su, +1 Çorba)',
          options: [{ label: 'Tamam', condition: true, action: () => simpleAck('Dışarıdan erzak yardımı geldi.') }]
        });
      } else if (eventType < 0.65) {
        // Haydut Saldırısı
        setEventModal({
          title: 'Haydutlar Geldi!',
          msg: 'Yüzü maskeli, baltalı adamlar kapıya vuruyor! İçeri girmeye çalışıyorlar.',
          options: [
            { label: 'Silahla Vur (-1 Mermi)', condition: newSupplies.gun > 0 && newSupplies.ammo > 0, action: fireGun, type: 'action' },
            { label: 'Sessiz Ol (Saklan)', condition: true, action: hideFromBandits, type: 'danger' }
          ]
        });
      } else {
        // İyi Niyetli Takas
        setEventModal({
          title: 'Yaşlı Bir Adam',
          msg: 'Bitkin düşmüş yaşlı bir adam kapınızı çalıyor. Karşılığında eşya vereceğini söyleyerek 1 Su istiyor.',
          options: [
            { label: '1 Su Ver (Kapıyı Aç)', condition: newSupplies.water > 0, action: () => tradeWithStranger(true), type: 'action' },
            { label: 'Açma (Risk Alma)', condition: true, action: () => tradeWithStranger(false), type: 'danger' }
          ]
        });
      }
    } else if (eventChance > 0.90 && newSupplies.radio > 0) {
      currentLog.push('Radyodan diğer sığınaklardaki insanların seslerini duydunuz. Umut arttı.');
    }

    const shouldNeedFood = (nextDayNum % 5 === 0); // 5 günde bir acıkır
    const shouldNeedWater = (nextDayNum % 3 === 0); // 3 günde bir susar

    let newSurvivors = survivors.map(s => {
      if (!s.isAlive) return s;
      let ns = { ...s };

      if (ns.status === 'expedition') {
        ns.expeditionDays++;
        if (ns.expeditionDays >= 3) {
          const returnChance = Math.random();
          if (returnChance > 0.3) {
            ns.status = 'shelter';
            ns.expeditionDays = 0;
            const foundWater = Math.floor(Math.random() * 3);
            const foundSoup = Math.floor(Math.random() * 3);
            const foundAmmo = Math.random() < 0.5 ? 1 : 0; // %50 ihtimalle mermi de bulur
            newSupplies.water += foundWater;
            newSupplies.soup += foundSoup;
            newSupplies.ammo += foundAmmo;
            currentLog.push(`${ns.name} keşiften döndü! (+${foundWater} Su, +${foundSoup} Çorba ${foundAmmo > 0 ? ', +1 Mermi' : ''})`);
          } else {
            ns.isAlive = false;
            currentLog.push(`⚠️ ${ns.name} keşfe çıktı ve bir daha geri dönmedi...`);
          }
        }
        return ns; 
      }

      if (shouldNeedFood) { ns.needsFood = true; }
      if (shouldNeedWater) { ns.needsWater = true; }
      if (shouldNeedFood || shouldNeedWater) currentLog.push(`${ns.name} acıktı/susadı.`);

      if (ns.needsFood) ns.daysHungry++;
      if (ns.needsWater) ns.daysThirsty++;
      
      if (ns.isSick) {
        if (Math.random() < 0.20) {
          ns.isSick = false;
          ns.daysSick = 0;
          currentLog.push(`${ns.name} kendiliğinden iyileşti!`);
        } else {
          ns.daysSick++;
        }
      }

      if (!ns.isSick && Math.random() < 0.05) {
        ns.isSick = true;
        currentLog.push(`${ns.name} hastalandı!`);
      }

      if (ns.daysThirsty >= 3) { ns.isAlive = false; currentLog.push(`💀 ${ns.name} susuzluktan öldü!`); }
      else if (ns.daysHungry >= 5) { ns.isAlive = false; currentLog.push(`💀 ${ns.name} açlıktan öldü!`); }
      else if (ns.daysSick >= 6) { ns.isAlive = false; currentLog.push(`💀 ${ns.name} hastalıktan öldü!`); }

      return ns;
    });

    setSupplies(newSupplies);
    setSurvivors(newSurvivors);
    setDay(nextDayNum);

    if (currentLog.length > 0) {
      setLogs(prev => [`[Gün ${nextDayNum}] ${currentLog.join(' ')}`, ...prev]);
    }

    if (newSurvivors.every(s => !s.isAlive)) {
      setGameState('gameover');
    }
  };

  const feedSurvivor = (id) => {
    if (supplies.soup > 0) {
      setSupplies({ ...supplies, soup: supplies.soup - 1 });
      setSurvivors(survivors.map(s => s.id === id ? { ...s, needsFood: false, daysHungry: 0 } : s));
      setLogs(prev => [`[Gün ${day}] ${survivors.find(s=>s.id===id).name} çorba içti.`, ...prev]);
    }
  };

  const waterSurvivor = (id) => {
    if (supplies.water > 0) {
      setSupplies({ ...supplies, water: supplies.water - 1 });
      setSurvivors(survivors.map(s => s.id === id ? { ...s, needsWater: false, daysThirsty: 0 } : s));
      setLogs(prev => [`[Gün ${day}] ${survivors.find(s=>s.id===id).name} su içti.`, ...prev]);
    }
  };

  const healSurvivor = (id) => {
    if (supplies.medkit > 0) {
      setSupplies({ ...supplies, medkit: supplies.medkit - 1 });
      setSurvivors(survivors.map(s => s.id === id ? { ...s, isSick: false, daysSick: 0 } : s));
      setLogs(prev => [`[Gün ${day}] ${survivors.find(s=>s.id===id).name} tedavi edildi.`, ...prev]);
    }
  };

  const sendExpedition = (id) => {
    setSurvivors(survivors.map(s => s.id === id ? { ...s, status: 'expedition', expeditionDays: 0 } : s));
    setLogs(prev => [`[Gün ${day}] ${survivors.find(s=>s.id===id).name} dışarı keşfe gönderildi.`, ...prev]);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const usedCapacity = inventory.reduce((total, item) => total + item.size, 0);

  return (
    <div className="game-wrapper">
      
      {gameState === 'start' && (
        <div className="overlay-screen">
          <h1 className="title">☢️ 60 SANİYE ☢️</h1>
          <p className="desc">
            Nükleer sirenler çalıyor! Sığınağa girmeden önce eşyaları topla.<br/>
            Eşyaları almak için <strong>E</strong> tuşuna (veya butonuna) bas. Kapasite (5).
          </p>
          <button className="btn" onClick={startGame}>OYUNA BAŞLA</button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="ui-panel">
            <div className={`timer ${timeLeft <= 10 ? 'urgent' : ''}`}>{formatTime(timeLeft)}</div>
            <div className="inventory-info">
              <div className="capacity-text">
                Envanter: {usedCapacity} / {MAX_CAPACITY} 
                <span style={{ fontSize: '1rem', marginLeft: '10px' }}>
                  ({inventory.map(i => i.icon).join('')})
                </span>
              </div>
              <div className="capacity-bar">
                <div className={`capacity-fill ${usedCapacity === MAX_CAPACITY ? 'full' : ''}`} style={{ width: `${(usedCapacity / MAX_CAPACITY) * 100}%` }}></div>
              </div>
            </div>
          </div>

          <div className="arena-container">
            <div className="arena">
              <div className={`shelter ${Math.hypot(playerPos.x - SHELTER_POS.x, playerPos.y - SHELTER_POS.y) < SHELTER_POS.radius ? 'active' : ''}`} style={{ left: SHELTER_POS.x, top: SHELTER_POS.y }}>
                <div className="shelter-inner">☢️</div>
              </div>

              {itemsOnMap.map(item => {
                const isNear = Math.hypot(playerPos.x - item.x, playerPos.y - item.y) < INTERACTION_DISTANCE;
                return (
                  <div key={item.uid} className="item" style={{ left: item.x, top: item.y }}>
                    {item.icon}
                    {isNear && <div className="interaction-hint">E ({item.size})</div>}
                  </div>
                );
              })}

              <div className="player" style={{ left: playerPos.x, top: playerPos.y }}>
                🏃
                {capacityWarning && <div className="capacity-warning">Dolu!</div>}
              </div>
            </div>
          </div>

          <div className="mobile-controls">
            <div className="d-pad">
              <button 
                className="btn-dir up" 
                onPointerDown={() => handleControlStart('w')} onPointerUp={() => handleControlEnd('w')}
                onTouchStart={() => handleControlStart('w')} onTouchEnd={() => handleControlEnd('w')}
              >▲</button>
              <div className="d-pad-middle">
                <button 
                  className="btn-dir left" 
                  onPointerDown={() => handleControlStart('a')} onPointerUp={() => handleControlEnd('a')}
                  onTouchStart={() => handleControlStart('a')} onTouchEnd={() => handleControlEnd('a')}
                >◀</button>
                <div className="d-pad-center"></div>
                <button 
                  className="btn-dir right" 
                  onPointerDown={() => handleControlStart('d')} onPointerUp={() => handleControlEnd('d')}
                  onTouchStart={() => handleControlStart('d')} onTouchEnd={() => handleControlEnd('d')}
                >▶</button>
              </div>
              <button 
                className="btn-dir down" 
                onPointerDown={() => handleControlStart('s')} onPointerUp={() => handleControlEnd('s')}
                onTouchStart={() => handleControlStart('s')} onTouchEnd={() => handleControlEnd('s')}
              >▼</button>
            </div>
            
            <div className="action-pad">
              <button 
                className="btn-action e-btn"
                onPointerDown={() => handleControlStart('e')} onPointerUp={() => handleControlEnd('e')}
                onTouchStart={() => handleControlStart('e')} onTouchEnd={() => handleControlEnd('e')}
              >E</button>
            </div>
          </div>
        </>
      )}

      {gameState === 'survival' && (
        <div className="survival-screen">
          
          {/* İNTERAKTİF EVENT MODALI */}
          {eventModal && (
            <div className="event-modal">
              <div className="event-box">
                <h2>{eventModal.title}</h2>
                <p>{eventModal.msg}</p>
                <div className="event-options">
                  {eventModal.options.map((opt, i) => (
                    <button 
                      key={i} 
                      className={`btn event-btn ${opt.type || ''}`} 
                      onClick={opt.action}
                      disabled={!opt.condition}
                      title={!opt.condition ? "Bunun için gerekli eşyan yok." : ""}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="survival-header">
            <h1>{day}. GÜN</h1>
            {/* Olay varken gün atlanmasın */}
            <button className="btn next-day-btn" onClick={nextDay} disabled={eventModal !== null}>SONRAKİ GÜN ⏭️</button>
          </div>

          <div className="survival-content">
            <div className="supplies-panel">
              <h2>Erzaklar</h2>
              <div className="supplies-grid">
                <div className="supply-item">🥫 Çorba: <strong>{supplies.soup}</strong></div>
                <div className="supply-item">💧 Su: <strong>{supplies.water}</strong></div>
                <div className="supply-item">🩹 İlkyardım: <strong>{supplies.medkit}</strong></div>
                <div className="supply-item">📻 Radyo: <strong>{supplies.radio}</strong></div>
                <div className="supply-item">🪓 Balta: <strong>{supplies.axe}</strong></div>
                <div className="supply-item">🤿 Maske: <strong>{supplies.mask}</strong></div>
                <div className="supply-item highlight">🔫 Silah: <strong>{supplies.gun}</strong></div>
                <div className="supply-item highlight">🔘 Mermi: <strong>{supplies.ammo}</strong></div>
              </div>
            </div>

            <div className="survivors-panel">
              <h2>Sığınaktakiler</h2>
              <div className="survivors-list">
                {survivors.map(s => (
                  <div key={s.id} className={`survivor-card ${!s.isAlive ? 'dead' : ''} ${s.status === 'expedition' ? 'away' : ''}`}>
                    <div className="survivor-icon">{s.isAlive ? s.icon : '💀'}</div>
                    <div className="survivor-info">
                      <div className="survivor-name">{s.name} {s.status === 'expedition' && '(Keşifte)'}</div>
                      {s.isAlive && s.status !== 'expedition' && (
                        <div className="survivor-status">
                          {s.needsFood && <span className="stat warn">Aç ({s.daysHungry}/5)</span>}
                          {s.needsWater && <span className="stat danger">Susuz ({s.daysThirsty}/3)</span>}
                          {s.isSick && <span className="stat sick">Hasta ({s.daysSick}/6)</span>}
                          {!s.needsFood && !s.needsWater && !s.isSick && <span className="stat ok">Sağlıklı</span>}
                        </div>
                      )}
                    </div>
                    
                    {s.isAlive && s.status !== 'expedition' && (
                      <div className="survivor-actions">
                        <button onClick={() => feedSurvivor(s.id)} disabled={supplies.soup <= 0 || !s.needsFood || eventModal !== null} title="Yedir">🥫</button>
                        <button onClick={() => waterSurvivor(s.id)} disabled={supplies.water <= 0 || !s.needsWater || eventModal !== null} title="İçir">💧</button>
                        <button onClick={() => healSurvivor(s.id)} disabled={supplies.medkit <= 0 || !s.isSick || eventModal !== null} title="İyileştir">🩹</button>
                        <button onClick={() => sendExpedition(s.id)} disabled={eventModal !== null} title="Keşfe Gönder">🗺️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="log-panel">
              <h2>Günlük</h2>
              <div className="log-list">
                {logs.map((log, i) => (
                  <div key={i} className="log-item">{log}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="overlay-screen">
          <div className="nuclear-flash"></div>
          <h1 className="title lost">SON!</h1>
          <p className="desc">
            {day > 1 
              ? `Sığınakta ${day} gün hayatta kaldınız, ama maalesef herkes hayatını kaybetti...`
              : 'Süre dolduğunda sığınakta değildin! Nükleer dalga seni yuttu.'}
          </p>
          <button className="btn" onClick={() => window.location.reload()}>BAŞTAN BAŞLA</button>
        </div>
      )}

    </div>
  );
}

export default App;
