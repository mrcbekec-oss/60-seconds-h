import React, { useState, useEffect, useRef } from 'react';
import './index.css';

const ARENA_WIDTH = 1000;
const ARENA_HEIGHT = 700;
const PLAYER_SIZE = 40;
const SPEED = 6;
const MAX_CAPACITY = 5;
const START_TIME = 60;
const INTERACTION_DISTANCE = 60; 
const SHELTER_POS = { x: 500, y: 350, radius: 80 };

const ITEM_TYPES = [
  { id: 'child', name: 'Çocuk', size: 3, icon: '🧒' },
  { id: 'spouse', name: 'Eş', size: 3, icon: '🧑' },
  { id: 'water', name: 'Su Şişesi', size: 1, icon: '💧' },
  { id: 'soup', name: 'Çorba', size: 1, icon: '🥫' },
  { id: 'radio', name: 'Radyo', size: 1, icon: '📻' },
  { id: 'medkit', name: 'İlk Yardım', size: 2, icon: '🩹' },
  { id: 'axe', name: 'Balta', size: 2, icon: '🪓' },
  { id: 'mask', name: 'Gaz Maskesi', size: 1, icon: '🤿' },
  { id: 'book', name: 'Kitap', size: 1, icon: '📖' },
];

function App() {
  const [gameState, setGameState] = useState('start'); // start, playing, won, lost
  const [timeLeft, setTimeLeft] = useState(START_TIME);
  const [inventory, setInventory] = useState([]);
  const [shelterItems, setShelterItems] = useState([]);
  const [itemsOnMap, setItemsOnMap] = useState([]);
  const [capacityWarning, setCapacityWarning] = useState(false);

  // Karakter state
  const [playerPos, setPlayerPos] = useState({ x: 100, y: 100 });
  const playerRef = useRef({ x: 100, y: 100 });
  const keysRef = useRef({ w: false, a: false, s: false, d: false, e: false });
  const interactionRef = useRef({ canInteract: false, item: null });
  const requestRef = useRef();

  // Rastgele eşyalar oluşturma
  const generateItems = () => {
    const generated = [];
    // Her item tipinden rastgele 1 ile 3 adet arası koyalım
    ITEM_TYPES.forEach(type => {
      const count = type.size >= 3 ? 1 : Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        // Sığınağın içine düşmemesi için
        let rx, ry;
        do {
          rx = Math.random() * (ARENA_WIDTH - 100) + 50;
          ry = Math.random() * (ARENA_HEIGHT - 100) + 50;
        } while (Math.hypot(rx - SHELTER_POS.x, ry - SHELTER_POS.y) < SHELTER_POS.radius + 50);

        generated.push({
          uid: `${type.id}-${i}-${Date.now()}`,
          ...type,
          x: rx,
          y: ry
        });
      }
    });
    return generated;
  };

  const startGame = () => {
    setGameState('playing');
    setTimeLeft(START_TIME);
    setInventory([]);
    setShelterItems([]);
    setItemsOnMap(generateItems());
    playerRef.current = { x: 100, y: 100 };
    setPlayerPos({ x: 100, y: 100 });
    setCapacityWarning(false);
  };

  // Saniye sayacı
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

  // Oyun sonu kontrolü
  useEffect(() => {
    if (timeLeft === 0 && gameState === 'playing') {
      // Süre bitti, karakter sığınakta mı?
      const distToShelter = Math.hypot(
        playerRef.current.x - SHELTER_POS.x, 
        playerRef.current.y - SHELTER_POS.y
      );
      if (distToShelter <= SHELTER_POS.radius + 20) {
        setGameState('won'); // Sığınağa yetişti
      } else {
        setGameState('lost'); // Dışarıda kaldı
      }
    }
  }, [timeLeft, gameState]);

  // Klavye Dinleyicileri
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Oyun Döngüsü (Game Loop)
  const updateGame = () => {
    if (gameState !== 'playing') return;

    let { x, y } = playerRef.current;
    const keys = keysRef.current;

    // Hareket hesaplama
    if (keys.w) y -= SPEED;
    if (keys.s) y += SPEED;
    if (keys.a) x -= SPEED;
    if (keys.d) x += SPEED;

    // Sınır kontrolleri
    x = Math.max(PLAYER_SIZE/2, Math.min(ARENA_WIDTH - PLAYER_SIZE/2, x));
    y = Math.max(PLAYER_SIZE/2, Math.min(ARENA_HEIGHT - PLAYER_SIZE/2, y));

    playerRef.current = { x, y };
    setPlayerPos({ x, y }); // UI güncellenmesi için state'e aktarıyoruz (büyük oyunlarda useRef + doğrudan DOM manipulasyonu daha iyidir ama bu boyut için yeterli)

    // React statelerine her frame erişmek riskli olduğundan, callback şeklinde setState kullanıyoruz.
    setItemsOnMap(currentItems => {
      let closestItem = null;
      let minDistance = INTERACTION_DISTANCE;

      // En yakın öğeyi bul
      currentItems.forEach(item => {
        const dist = Math.hypot(item.x - x, item.y - y);
        if (dist < minDistance) {
          minDistance = dist;
          closestItem = item;
        }
      });

      interactionRef.current.canInteract = closestItem !== null;
      interactionRef.current.item = closestItem;

      // Eşya Alma Mantığı
      if (keys.e && closestItem) {
        // Tuşu sıfırla ki ard arda almasın
        keys.e = false;
        
        setInventory(currentInventory => {
          const usedCap = currentInventory.reduce((tot, i) => tot + i.size, 0);
          if (usedCap + closestItem.size <= MAX_CAPACITY) {
            // Haritadan silip envantere ekliyoruz
            const newItems = currentItems.filter(i => i.uid !== closestItem.uid);
            // Uyarıyı temizle
            setCapacityWarning(false);
            // State'i güncelle ve silinmiş diziyi dön
            setTimeout(() => setInventory([...currentInventory, closestItem]), 0);
            return newItems; 
          } else {
            // Kapasite yetersiz
            setCapacityWarning(true);
            setTimeout(() => setCapacityWarning(false), 2000);
            return currentItems;
          }
        });
      }

      return currentItems; // default olarak aynı eşyaları döndür
    });

    // Sığınağa Bırakma Mantığı
    const distToShelter = Math.hypot(x - SHELTER_POS.x, y - SHELTER_POS.y);
    if (distToShelter <= SHELTER_POS.radius) {
      setInventory(currentInventory => {
        if (currentInventory.length > 0) {
          setShelterItems(prev => [...prev, ...currentInventory]);
          return []; // Envanteri boşalt
        }
        return currentInventory;
      });
    }

    requestRef.current = requestAnimationFrame(updateGame);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  // Yardımcı Hesaplamalar
  const usedCapacity = inventory.reduce((total, item) => total + item.size, 0);
  const totalSaved = shelterItems.length;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="game-wrapper">
      {/* BAŞLANGIÇ EKRANI */}
      {gameState === 'start' && (
        <div className="overlay-screen">
          <h1 className="title">☢️ 60 SANİYE (2D) ☢️</h1>
          <p className="desc">
            Nükleer sirenler çalıyor! Sığınağa girmeden önce evdeki eşyaları topla.<br/>
            Eşyaları almak için <strong>E</strong> tuşuna bas. Envanterin dolduğunda (Max 5) eşyaları bırakmak için sığınağa git.<br/>
            Süre bitmeden sığınağın üzerinde olmazsan ölürsün!
          </p>
          <button className="btn" onClick={startGame}>OYUNA BAŞLA</button>
          
          <div className="controls-info">
            <div>Hareket: <span className="control-key">W</span><span className="control-key">A</span><span className="control-key">S</span><span className="control-key">D</span></div>
            <div>Etkileşim: <span className="control-key">E</span></div>
          </div>
        </div>
      )}

      {/* OYUN İÇİ ARAYÜZ (UI) */}
      {(gameState === 'playing' || gameState === 'won' || gameState === 'lost') && (
        <>
          <div className="ui-panel">
            <div className={`timer ${timeLeft <= 10 && gameState === 'playing' ? 'urgent' : ''}`}>
              {formatTime(timeLeft)}
            </div>
            
            <div className="inventory-info">
              <div className="capacity-text">
                Envanter: {usedCapacity} / {MAX_CAPACITY} 
                <span style={{ fontSize: '1rem', marginLeft: '10px' }}>
                  ({inventory.map(i => i.icon).join('')})
                </span>
              </div>
              <div className="capacity-bar">
                <div 
                  className={`capacity-fill ${usedCapacity === MAX_CAPACITY ? 'full' : ''}`} 
                  style={{ width: `${(usedCapacity / MAX_CAPACITY) * 100}%` }}
                ></div>
              </div>
              <div className="shelter-info">
                Sığınaktaki Eşya Sayısı: {totalSaved}
              </div>
            </div>
          </div>

          {/* OYUN ALANI (ARENA) */}
          <div className="arena">
            
            {/* Sığınak */}
            <div 
              className={`shelter ${Math.hypot(playerPos.x - SHELTER_POS.x, playerPos.y - SHELTER_POS.y) < SHELTER_POS.radius ? 'active' : ''}`}
              style={{ left: SHELTER_POS.x, top: SHELTER_POS.y }}
            >
              <div className="shelter-inner">☢️</div>
            </div>

            {/* Eşyalar */}
            {itemsOnMap.map(item => {
              const dist = Math.hypot(playerPos.x - item.x, playerPos.y - item.y);
              const isNear = dist < INTERACTION_DISTANCE;
              return (
                <div 
                  key={item.uid} 
                  className="item" 
                  style={{ left: item.x, top: item.y }}
                >
                  {item.icon}
                  {isNear && <div className="interaction-hint">E (Boyut: {item.size})</div>}
                  <div className="item-tooltip">{item.name}</div>
                </div>
              );
            })}

            {/* Karakter */}
            <div className="player" style={{ left: playerPos.x, top: playerPos.y }}>
              🏃
              {capacityWarning && (
                 <div className="capacity-warning">Kapasite Dolu!</div>
              )}
            </div>

          </div>
        </>
      )}

      {/* BİTİŞ EKRANI */}
      {(gameState === 'won' || gameState === 'lost') && (
        <div className="overlay-screen">
          {gameState === 'lost' && <div className="nuclear-flash"></div>}
          <h1 className={`title ${gameState}`}>
            {gameState === 'won' ? 'HAYATTA KALDIN!' : 'NÜKLEER PATLAMA!'}
          </h1>
          <p className="desc">
            {gameState === 'won' 
              ? `Süre dolduğunda sığınaktaydın. Toplam ${totalSaved} parça eşya/insan kurtardın.`
              : 'Süre dolduğunda sığınakta değildin! Her şey yok oldu...'}
          </p>
          
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3>Kurtarılanlar</h3>
            <div style={{ fontSize: '2rem', display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '400px' }}>
              {shelterItems.length === 0 ? 'Hiçbir şey kurtarılamadı.' : shelterItems.map((i, idx) => <span key={idx} title={i.name}>{i.icon}</span>)}
            </div>
          </div>
          
          <button className="btn" onClick={startGame}>TEKRAR OYNA</button>
        </div>
      )}
    </div>
  );
}

export default App;
