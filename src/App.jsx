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
  { id: 'water', name: 'Su Şişesi', size: 1, icon: '💧', spawn: [6, 8] }, // 6 ile 8 arası
  { id: 'soup', name: 'Çorba', size: 1, icon: '🥫', spawn: [6, 8] },     // 6 ile 8 arası
  { id: 'radio', name: 'Radyo', size: 1, icon: '📻', spawn: [1, 2] },
  { id: 'medkit', name: 'İlk Yardım', size: 2, icon: '🩹', spawn: [1, 2] },
  { id: 'axe', name: 'Balta', size: 2, icon: '🪓', spawn: [1, 1] },
  { id: 'mask', name: 'Gaz Maskesi', size: 1, icon: '🤿', spawn: [1, 2] },
];

function App() {
  const [gameState, setGameState] = useState('start'); // start, playing, survival, gameover
  
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
  const [supplies, setSupplies] = useState({ soup: 0, water: 0, medkit: 0, radio: 0, axe: 0, mask: 0 });
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

  // Phase 1 (Saniye)
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

  // Phase 1 Bitişi
  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      const distToShelter = Math.hypot(
        playerRef.current.x - SHELTER_POS.x, 
        playerRef.current.y - SHELTER_POS.y
      );
      if (distToShelter <= SHELTER_POS.radius + 20) {
        setupSurvival(); // Sığınağa geçti
      } else {
        setGameState('gameover'); 
      }
    }
  }, [timeLeft, gameState]);

  // Klavye Dinleyicileri (Sadece Playing)
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

  // Oyun Döngüsü
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

  const addLog = (msg) => setLogs(prev => [`[Gün ${day}] ${msg}`, ...prev]);

  const setupSurvival = () => {
    const saved = shelterItemsRef.current;
    
    // Varsayılan Ana Karakter
    const survs = [{
      id: 'me', name: 'Sen', icon: '👤',
      isAlive: true, isSick: false, 
      needsFood: false, needsWater: false, 
      daysHungry: 0, daysThirsty: 0, daysSick: 0, 
      status: 'shelter', expeditionDays: 0
    }];

    // Toplanan İnsanlar
    const hasChild = saved.some(i => i.id === 'child');
    const hasSpouse = saved.some(i => i.id === 'spouse');
    
    if (hasChild) survs.push({ id: 'child', name: 'Çocuk', icon: '🧒', isAlive: true, isSick: false, needsFood: false, needsWater: false, daysHungry: 0, daysThirsty: 0, daysSick: 0, status: 'shelter', expeditionDays: 0 });
    if (hasSpouse) survs.push({ id: 'spouse', name: 'Eş', icon: '🧑', isAlive: true, isSick: false, needsFood: false, needsWater: false, daysHungry: 0, daysThirsty: 0, daysSick: 0, status: 'shelter', expeditionDays: 0 });

    setSurvivors(survs);

    // Eşyaları objeye dök
    const initialSupplies = { soup: 0, water: 0, medkit: 0, radio: 0, axe: 0, mask: 0 };
    saved.forEach(item => {
      if (initialSupplies[item.id] !== undefined) {
        initialSupplies[item.id]++;
      }
    });
    // Biraz kıyak geçelim ilk gün için (isteğe bağlı)
    setSupplies(initialSupplies);
    setDay(1);
    setLogs(['Sığınağa ulaştınız. Kapı kapandı.']);
    setGameState('survival');
  };

  const nextDay = () => {
    let currentLog = [];
    let newSupplies = { ...supplies };
    
    // 1. Rastgele Olay (Random Event)
    const eventChance = Math.random();
    if (eventChance < 0.15) {
      newSupplies.water += 1;
      newSupplies.soup += 1;
      setEventModal({ type: 'gift', msg: 'Kapıya gizemli biri paket bırakmış! +1 Su, +1 Çorba' });
      currentLog.push('Dışarıdan erzak yardımı geldi.');
    } else if (eventChance > 0.85 && newSupplies.radio > 0) {
      currentLog.push('Radyodan diğer sığınaklardaki insanların seslerini duydunuz. Moral arttı.');
    }

    const nextDayNum = day + 1;
    // 2. İhtiyaç Kontrolü ve Güncellemesi
    const shouldNeed = (nextDayNum % 3 === 0); // Her 3 günde bir ihtiyaç doğar

    let newSurvivors = survivors.map(s => {
      if (!s.isAlive) return s;

      let ns = { ...s };

      // Keşif mantığı
      if (ns.status === 'expedition') {
        ns.expeditionDays++;
        if (ns.expeditionDays >= 3) {
          // Geri döner (Şans)
          const returnChance = Math.random();
          if (returnChance > 0.3) {
            ns.status = 'shelter';
            ns.expeditionDays = 0;
            const foundWater = Math.floor(Math.random() * 3);
            const foundSoup = Math.floor(Math.random() * 3);
            newSupplies.water += foundWater;
            newSupplies.soup += foundSoup;
            currentLog.push(`${ns.name} keşiften döndü! (+${foundWater} Su, +${foundSoup} Çorba)`);
          } else {
            ns.isAlive = false;
            currentLog.push(`⚠️ ${ns.name} keşfe çıktı ve bir daha geri dönmedi...`);
          }
        }
        return ns; // Dışarıdaysa açlık susuzluk artmaz (kendisi bulur varsayımı)
      }

      // Sığınaktakilerin ihtiyaçları
      if (shouldNeed) {
        ns.needsFood = true;
        ns.needsWater = true;
        currentLog.push(`${ns.name} acıktı ve susadı.`);
      }

      if (ns.needsFood) ns.daysHungry++;
      if (ns.needsWater) ns.daysThirsty++;
      if (ns.isSick) ns.daysSick++;

      // Hastalık ihtimali
      if (!ns.isSick && Math.random() < 0.05) {
        ns.isSick = true;
        currentLog.push(`${ns.name} hastalandı!`);
      }

      // Ölüm Kontrolü
      if (ns.daysThirsty >= 2) { ns.isAlive = false; currentLog.push(`💀 ${ns.name} susuzluktan öldü!`); }
      else if (ns.daysHungry >= 4) { ns.isAlive = false; currentLog.push(`💀 ${ns.name} açlıktan öldü!`); }
      else if (ns.daysSick >= 6) { ns.isAlive = false; currentLog.push(`💀 ${ns.name} hastalıktan öldü!`); }

      return ns;
    });

    setSupplies(newSupplies);
    setSurvivors(newSurvivors);
    setDay(nextDayNum);

    if (currentLog.length > 0) {
      setLogs(prev => [`[Gün ${nextDayNum}] ${currentLog.join(' ')}`, ...prev]);
    }

    // Herkes öldü mü?
    if (newSurvivors.every(s => !s.isAlive)) {
      setGameState('gameover');
    }
  };

  // Eşya Kullanımı
  const feedSurvivor = (id) => {
    if (supplies.soup > 0) {
      setSupplies({ ...supplies, soup: supplies.soup - 1 });
      setSurvivors(survivors.map(s => s.id === id ? { ...s, needsFood: false, daysHungry: 0 } : s));
      addLog(`${survivors.find(s=>s.id===id).name} çorba içti.`);
    }
  };

  const waterSurvivor = (id) => {
    if (supplies.water > 0) {
      setSupplies({ ...supplies, water: supplies.water - 1 });
      setSurvivors(survivors.map(s => s.id === id ? { ...s, needsWater: false, daysThirsty: 0 } : s));
      addLog(`${survivors.find(s=>s.id===id).name} su içti.`);
    }
  };

  const healSurvivor = (id) => {
    if (supplies.medkit > 0) {
      setSupplies({ ...supplies, medkit: supplies.medkit - 1 });
      setSurvivors(survivors.map(s => s.id === id ? { ...s, isSick: false, daysSick: 0 } : s));
      addLog(`${survivors.find(s=>s.id===id).name} tedavi edildi.`);
    }
  };

  const sendExpedition = (id) => {
    setSurvivors(survivors.map(s => s.id === id ? { ...s, status: 'expedition', expeditionDays: 0 } : s));
    addLog(`${survivors.find(s=>s.id===id).name} dışarı keşfe gönderildi.`);
  };

  /* =========================================================
     RENDER
     ========================================================= */
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const usedCapacity = inventory.reduce((total, item) => total + item.size, 0);

  return (
    <div className="game-wrapper">
      
      {/* BAŞLANGIÇ EKRANI */}
      {gameState === 'start' && (
        <div className="overlay-screen">
          <h1 className="title">☢️ 60 SANİYE ☢️</h1>
          <p className="desc">
            Nükleer sirenler çalıyor! Sığınağa girmeden önce eşyaları topla.<br/>
            Eşyaları almak için <strong>E</strong> tuşuna bas. Kapasite (5).
          </p>
          <button className="btn" onClick={startGame}>OYUNA BAŞLA</button>
        </div>
      )}

      {/* PHASE 1: PLAYING */}
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
              {capacityWarning && <div className="capacity-warning">Kapasite Dolu!</div>}
            </div>
          </div>
        </>
      )}

      {/* PHASE 2: SURVIVAL */}
      {gameState === 'survival' && (
        <div className="survival-screen">
          
          {/* Rastgele Event Modalı */}
          {eventModal && (
            <div className="event-modal">
              <div className="event-box">
                <h2>Rastgele Olay</h2>
                <p>{eventModal.msg}</p>
                <button className="btn" onClick={() => setEventModal(null)}>Tamam</button>
              </div>
            </div>
          )}

          <div className="survival-header">
            <h1>{day}. GÜN</h1>
            <button className="btn next-day-btn" onClick={nextDay}>SONRAKİ GÜN ⏭️</button>
          </div>

          <div className="survival-content">
            {/* KAYNAKLAR BÖLÜMÜ */}
            <div className="supplies-panel">
              <h2>Erzaklar</h2>
              <div className="supplies-grid">
                <div className="supply-item">🥫 Çorba: <strong>{supplies.soup}</strong></div>
                <div className="supply-item">💧 Su: <strong>{supplies.water}</strong></div>
                <div className="supply-item">🩹 İlkyardım: <strong>{supplies.medkit}</strong></div>
                <div className="supply-item">📻 Radyo: <strong>{supplies.radio}</strong></div>
                <div className="supply-item">🪓 Balta: <strong>{supplies.axe}</strong></div>
                <div className="supply-item">🤿 Maske: <strong>{supplies.mask}</strong></div>
              </div>
            </div>

            {/* İNSANLAR BÖLÜMÜ */}
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
                          {s.needsFood && <span className="stat warn">Aç ({s.daysHungry}/4)</span>}
                          {s.needsWater && <span className="stat danger">Susuz ({s.daysThirsty}/2)</span>}
                          {s.isSick && <span className="stat sick">Hasta ({s.daysSick}/6)</span>}
                          {!s.needsFood && !s.needsWater && !s.isSick && <span className="stat ok">Sağlıklı</span>}
                        </div>
                      )}
                    </div>
                    
                    {s.isAlive && s.status !== 'expedition' && (
                      <div className="survivor-actions">
                        <button onClick={() => feedSurvivor(s.id)} disabled={supplies.soup <= 0 || !s.needsFood} title="Yedir">🥫</button>
                        <button onClick={() => waterSurvivor(s.id)} disabled={supplies.water <= 0 || !s.needsWater} title="İçir">💧</button>
                        <button onClick={() => healSurvivor(s.id)} disabled={supplies.medkit <= 0 || !s.isSick} title="İyileştir">🩹</button>
                        <button onClick={() => sendExpedition(s.id)} title="Keşfe Gönder">🗺️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* GÜNLÜK BÖLÜMÜ */}
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

      {/* GAMEOVER */}
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
