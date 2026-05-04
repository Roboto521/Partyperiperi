/* game.js — Evita las Bolas · Party Perilingüe · OPTIMIZADO */

document.addEventListener('DOMContentLoaded', function () {

  const ES_MOVIL = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const CFG = {
    PTS_POR_SEGUNDO  : ES_MOVIL ? 25  : 20,
    BONUS_CADA_5S    : ES_MOVIL ? 40  : 30,
    MAX_VIDAS        : ES_MOVIL ? 5   : 3,
    NIVEL_CADA_S     : ES_MOVIL ? 10  : 7,
    STAR_INTERVAL    : ES_MOVIL ? 5   : 8,
    STAR_PTS         : ES_MOVIL ? 150 : 100,
    STREAK_STEP      : ES_MOVIL ? 15  : 20,
    STREAK_MAX_MULT  : 4,
  };

  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  let CW = 360, CH = 414;
  let inputBound = false;
  let touchX = null, touchY = null;

  /* ===== DETECCIÓN MEJORADA DE GAMA BAJA ===== */
  let IS_LOW_END = false;
  (function detectLowEnd() {
    const mem  = navigator.deviceMemory;
    const cpus = navigator.hardwareConcurrency;
    const w    = window.screen.width;
    const dpr  = window.devicePixelRatio || 1;
    if (mem && mem < 3) { IS_LOW_END = true; return; }
    if (cpus && cpus <= 4) { IS_LOW_END = true; return; }
    if (w < 390 && dpr >= 2.5) { IS_LOW_END = true; return; }
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = '#ff' + i.toString(16).padStart(4,'0');
      ctx.fillRect(0, 0, 10, 10);
    }
    if (performance.now() - t0 > 8) IS_LOW_END = true;
  })();

  const PARTICLE_MAX   = IS_LOW_END ? 20  : 60;
  const PARTICLE_SPAWN = IS_LOW_END ? 5   : 12;
  const FTEXT_MAX      = IS_LOW_END ? 3   : 8;
  const DPR_USE        = IS_LOW_END ? 1   : Math.min(window.devicePixelRatio || 1, 2);
  const GLOW           = !IS_LOW_END;

  function safeRoundRect(x, y, w, h, r) {
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function resizeCanvas() {
    const box = document.getElementById('gameBox');
    CW = Math.min(box ? box.offsetWidth : 360, 400);
    CH = Math.round(CW * 1.15);
    canvas.width  = CW * DPR_USE;
    canvas.height = CH * DPR_USE;
    canvas.style.width  = CW + 'px';
    canvas.style.height = CH + 'px';
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(DPR_USE, DPR_USE);
  }

  const BCOLS = ['#ff4d6d','#ff66c4','#9d6bff','#3ddc97','#ff8c42','#ffd93d'];
  let hi = parseInt(localStorage.getItem('evb_hi') || '0');
  let player, balls, particles, heartItems, starItems, floatingTexts;
  let score, elapsed, gameOver, started, frameId, lastTs, ptAcc, lastBonusMark;
  let spawnTimer, heartSpawnTimer, starSpawnTimer, lives;
  let streakTimer, streakActive, streakFlash, streakMult;

  const particlePool = [];
  function getParticle() { return particlePool.pop() || {}; }
  function recycleParticle(p) { if (particlePool.length < 80) particlePool.push(p); }

  function getLevelConfig(l) {
    if (l > 28) l = 28;
    if (l<=2)  return {speed:220, sv:50,  int:0.90, max:5,  w:18};
    if (l<=4)  return {speed:270, sv:60,  int:0.75, max:7,  w:22};
    if (l<=6)  return {speed:320, sv:70,  int:0.62, max:9,  w:27};
    if (l<=8)  return {speed:370, sv:75,  int:0.52, max:11, w:32};
    if (l<=10) return {speed:410, sv:80,  int:0.44, max:13, w:36};
    if (l<=12) return {speed:445, sv:85,  int:0.38, max:15, w:40};
    if (l<=14) return {speed:475, sv:88,  int:0.34, max:16, w:43};
    if (l<=16) return {speed:500, sv:90,  int:0.31, max:17, w:45};
    if (l<=18) return {speed:520, sv:92,  int:0.29, max:18, w:47};
    if (l<=20) return {speed:535, sv:93,  int:0.27, max:19, w:48};
    if (l<=22) return {speed:548, sv:94,  int:0.26, max:20, w:49};
    if (l<=24) return {speed:558, sv:95,  int:0.25, max:21, w:50};
    if (l<=26) return {speed:565, sv:96,  int:0.24, max:21, w:51};
    return           {speed:572, sv:97,  int:0.23, max:22, w:52};
  }

  function getSpikeDepth(l) { return l < 12 ? 0 : 6; }

  function initState() {
    player        = {x:CW/2, y:CH/2, r:14, tx:CW/2, ty:CH/2, hitFlash:0};
    balls         = [];
    if (particles) particles.forEach(p => recycleParticle(p));
    particles     = [];
    heartItems    = []; starItems = []; floatingTexts = [];
    score         = 0; elapsed = 0; ptAcc = 0; lastBonusMark = 0;
    spawnTimer    = 0; heartSpawnTimer = 0; starSpawnTimer = 0;
    streakTimer   = 0; streakActive = false; streakFlash = 0; streakMult = 1;
    gameOver      = false; started = false;
    lives         = CFG.MAX_VIDAS;
    refreshHUD();
  }

  function refreshHUD() {
    const el = document.getElementById('g-lives');
    if (!el) return;
    let s = '';
    for (let i = 0; i < CFG.MAX_VIDAS; i++) s += i < lives ? '❤️' : '🖤';
    el.textContent = s;
    const hEl = document.getElementById('g-hi');
    if (hEl) hEl.textContent = hi;
  }

  function bindInput() {
    if (inputBound) return;
    inputBound = true;
    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      touchX = (e.touches[0].clientX - r.left) * (CW / r.width);
      touchY = (e.touches[0].clientY - r.top)  * (CH / r.height);
      if (!started || gameOver) startGame();
    }, {passive:false});
    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      touchX = (e.touches[0].clientX - r.left) * (CW / r.width);
      touchY = (e.touches[0].clientY - r.top)  * (CH / r.height);
    }, {passive:false});
    canvas.addEventListener('touchend', () => { touchX = null; touchY = null; });
    canvas.addEventListener('mousemove', e => {
      if (!started || gameOver) return;
      const r = canvas.getBoundingClientRect();
      touchX = (e.clientX - r.left) * (CW / r.width);
      touchY = (e.clientY - r.top)  * (CH / r.height);
    });
    canvas.addEventListener('click', () => { if (!started || gameOver) startGame(); });
  }

  function startGame() {
    initState(); started = true; lastTs = performance.now();
    cancelAnimationFrame(frameId);
    setMsg('⭐ Agarra estrellas · ❤️ Corazones · 🔥 ' + CFG.STREAK_STEP + 's sin golpe = x2→x3→x4');
    frameId = requestAnimationFrame(loop);
  }

  function spawnBall(cfg, sd) {
    const speed = cfg.speed + Math.random() * cfg.sv;
    const r = 8 + Math.random() * 10;
    const minX = sd+r+4, maxX = CW-sd-r-4;
    if (maxX <= minX) return;
    balls.push({
      x: minX+Math.random()*(maxX-minX), y:-r,
      vx: (Math.random()-0.5)*speed*0.4, vy: speed,
      color: BCOLS[Math.floor(Math.random()*BCOLS.length)],
      wobble: Math.random()*Math.PI*2,
      wobbleAmp: cfg.w, wobbleSpeed: 1.5+Math.random()*2.5, r
    });
  }

  function spawnHeart(sd) {
    if (lives >= CFG.MAX_VIDAS) return;
    const r = 18, minX = sd+r+10, maxX = CW-sd-r-10;
    if (maxX <= minX) return;
    heartItems.push({x: minX+Math.random()*(maxX-minX), y:-r, r, vy:55+Math.random()*30});
  }

  function spawnStar(sd) {
    const r = 16, minX = sd+r+10, maxX = CW-sd-r-10;
    if (maxX <= minX) return;
    starItems.push({
      x: minX+Math.random()*(maxX-minX), y:-r, r,
      vy: 70+Math.random()*40,
      rot: 0, rotSpeed: (Math.random()-0.5)*4
    });
  }

  function addFloatingText(x, y, text, color) {
    if (floatingTexts.length >= FTEXT_MAX) floatingTexts.shift();
    floatingTexts.push({x, y, text, color, life:1.2, vy:-60});
  }

  function addParticles(x, y, color, n) {
    const count = IS_LOW_END ? Math.min(n, PARTICLE_SPAWN) : Math.min(n, 14);
    if (particles.length >= PARTICLE_MAX) return;
    const toAdd = Math.min(count, PARTICLE_MAX - particles.length);
    for (let i = 0; i < toAdd; i++) {
      const a = (Math.PI*2/toAdd)*i + Math.random()*0.5;
      const sp = 60 + Math.random()*90;
      const p = getParticle();
      p.x = x; p.y = y;
      p.vx = Math.cos(a)*sp; p.vy = Math.sin(a)*sp;
      p.r = 3 + Math.random()*4;
      p.life = 1; p.color = color;
      particles.push(p);
    }
  }

  function drawSpikes(sd) {
    if (sd <= 0) return;
    const sz = 20, p = 1+Math.sin(elapsed*4)*0.07;
    ctx.fillStyle = '#ff2244';
    ctx.beginPath();
    for (let i = -1; i < Math.ceil(CH/sz)+2; i++) {
      const y = i*sz;
      ctx.moveTo(0,y); ctx.lineTo(sd*p,y+sz/2); ctx.lineTo(0,y+sz);
      ctx.moveTo(CW,y); ctx.lineTo(CW-sd*p,y+sz/2); ctx.lineTo(CW,y+sz);
    }
    for (let i = -1; i < Math.ceil(CW/sz)+2; i++) {
      const x = i*sz;
      ctx.moveTo(x,CH); ctx.lineTo(x+sz/2,CH-sd*p); ctx.lineTo(x+sz,CH);
      ctx.moveTo(x,0);  ctx.lineTo(x+sz/2,sd*p);    ctx.lineTo(x+sz,0);
    }
    ctx.fill();
  }

  function checkSpike(sd) {
    if (sd <= 0) return false;
    return player.x-player.r<sd || player.x+player.r>CW-sd ||
           player.y-player.r<sd || player.y+player.r>CH-sd;
  }

  function loseLife() {
    lives--; refreshHUD(); player.hitFlash = 1.2;
    if (streakActive) {
      addFloatingText(player.x, player.y-30, '🔥 Racha perdida', '#ff4d6d');
      streakActive = false;
    }
    streakTimer = 0; streakMult = 1;
    addParticles(player.x, player.y, '#ff4d6d', IS_LOW_END ? 5 : 14);
    if (lives <= 0) endGame();
  }

  let _lastLevelCalc = -1, _cachedLevel = 1, _cachedCfg, _cachedSd;

  function loop(ts) {
    const dt = Math.min((ts-lastTs)/1000, 0.05);
    lastTs = ts; elapsed += dt;

    const level = 1 + Math.floor(elapsed / CFG.NIVEL_CADA_S);
    if (level !== _lastLevelCalc) {
      _lastLevelCalc = level;
      _cachedCfg = getLevelConfig(level);
      _cachedSd  = getSpikeDepth(level);
    }
    const cfg = _cachedCfg, sd = _cachedSd;

    const lvEl = document.getElementById('g-lv');
    if (lvEl) lvEl.textContent = level;

    if (player.hitFlash > 0) player.hitFlash -= dt;
    if (streakFlash > 0) streakFlash -= dt;

    streakTimer += dt;
    const newMult = Math.min(1 + Math.floor(streakTimer / CFG.STREAK_STEP), CFG.STREAK_MAX_MULT);
    if (newMult > streakMult) {
      streakMult = newMult; streakActive = true; streakFlash = 1.5;
      const multColors = {2:'#ff9900', 3:'#ff5500', 4:'#ff0000'};
      addFloatingText(CW/2, CH/2-50, `🔥 ¡RACHA x${streakMult}!`, multColors[streakMult]||'#ff9900');
      addParticles(player.x, player.y, multColors[streakMult]||'#ff9900', IS_LOW_END ? 6 : 20);
    }
    const mult = streakMult;

    const scEl = document.getElementById('g-sc');
    if (scEl) scEl.textContent = (streakActive ? `🔥 x${mult}  ` : '') + Math.round(score);

    const smooth = ES_MOVIL ? 0.45 : 0.35;
    if (touchX !== null) {
      player.tx = Math.max(player.r, Math.min(CW-player.r, touchX));
      player.ty = Math.max(player.r, Math.min(CH-player.r, touchY || player.ty));
    }
    player.x += (player.tx-player.x)*smooth;
    player.y += (player.ty-player.y)*smooth;
    player.x = Math.max(player.r, Math.min(CW-player.r, player.x));
    player.y = Math.max(player.r, Math.min(CH-player.r, player.y));

    if (checkSpike(sd) && player.hitFlash <= 0) { loseLife(); if (gameOver) return; }

    spawnTimer += dt;
    if (spawnTimer >= cfg.int && balls.length < Math.floor(cfg.max)) { spawnBall(cfg,sd); spawnTimer = 0; }
    heartSpawnTimer += dt;
    if (heartSpawnTimer >= (ES_MOVIL ? 10 : 15)) { spawnHeart(sd); heartSpawnTimer = 0; }
    starSpawnTimer += dt;
    if (starSpawnTimer >= CFG.STAR_INTERVAL) { spawnStar(sd); starSpawnTimer = 0; }

    const pr = player.r, px = player.x, py = player.y;
    for (let i = balls.length-1; i >= 0; i--) {
      const b = balls[i];
      b.wobble += b.wobbleSpeed*dt;
      b.x += (b.vx+Math.sin(b.wobble)*b.wobbleAmp)*dt;
      b.y += b.vy*dt;
      if (b.y-b.r>CH+20 || b.x<-50 || b.x>CW+50) { balls.splice(i,1); continue; }
      const dx=px-b.x, dy=py-b.y;
      if (dx*dx+dy*dy < (pr+b.r-2)*(pr+b.r-2) && player.hitFlash<=0) {
        balls.splice(i,1); loseLife(); if (gameOver) return;
      }
    }

    for (let i = heartItems.length-1; i >= 0; i--) {
      const h = heartItems[i]; h.y += h.vy*dt;
      if (h.y-h.r>CH+10) { heartItems.splice(i,1); continue; }
      const dx=px-h.x, dy=py-h.y;
      if (dx*dx+dy*dy < (pr+h.r)*(pr+h.r)) {
        lives=Math.min(CFG.MAX_VIDAS,lives+1); refreshHUD();
        addParticles(h.x,h.y,'#ff4d6d', IS_LOW_END ? 4 : 8);
        addFloatingText(h.x,h.y,'+❤️','#ff4d6d');
        heartItems.splice(i,1);
      }
    }

    for (let i = starItems.length-1; i >= 0; i--) {
      const s = starItems[i];
      s.y += s.vy*dt; s.rot += s.rotSpeed*dt;
      if (s.y-s.r>CH+10) { starItems.splice(i,1); continue; }
      const dx=px-s.x, dy=py-s.y;
      if (dx*dx+dy*dy < (pr+s.r)*(pr+s.r)) {
        const gained = CFG.STAR_PTS * mult;
        score += gained;
        addParticles(s.x,s.y,'#ffd93d', IS_LOW_END ? 6 : 16);
        addFloatingText(s.x,s.y-20, (mult>1?`🔥 x${mult} `:'')+'+'+ gained,'#ffd93d');
        starItems.splice(i,1);
      }
    }

    ptAcc += CFG.PTS_POR_SEGUNDO * mult * dt;
    if (ptAcc >= 1) { const p=Math.floor(ptAcc); score+=p; ptAcc-=p; }

    const bm = Math.floor(elapsed/5);
    if (bm > lastBonusMark) {
      score += CFG.BONUS_CADA_5S * mult; lastBonusMark = bm;
      addParticles(player.x, player.y-30, '#ffd93d', IS_LOW_END ? 4 : 8);
    }

    for (let i = particles.length-1; i >= 0; i--) {
      const p=particles[i];
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=120*dt; p.life-=dt*1.5;
      if (p.life<=0) { recycleParticle(particles.splice(i,1)[0]); }
    }

    for (let i = floatingTexts.length-1; i >= 0; i--) {
      const t=floatingTexts[i]; t.y+=t.vy*dt; t.life-=dt*1.2;
      if (t.life<=0) floatingTexts.splice(i,1);
    }

    draw(level, sd, mult);
    frameId = requestAnimationFrame(loop);
  }

  function getBg(l) {
    if (l<=2)  return '#fff0f5';
    if (l<=5)  return '#ffe0f0';
    if (l<=8)  return '#1a0a2e';
    if (l<=14) return '#0d0019';
    return '#000';
  }

  let heartCache = null, heartCacheSize = 0;
  function getHeartCache(sz) {
    if (heartCache && heartCacheSize === sz) return heartCache;
    heartCacheSize = sz;
    heartCache = document.createElement('canvas');
    heartCache.width = sz*3; heartCache.height = sz*3;
    const hc = heartCache.getContext('2d');
    const x=sz*1.5, y=sz*0.8;
    hc.fillStyle='#ff4d6d';
    hc.beginPath(); hc.moveTo(x,y+sz*0.3);
    hc.bezierCurveTo(x,y,x-sz,y,x-sz,y+sz*0.4);
    hc.bezierCurveTo(x-sz,y+sz*0.9,x,y+sz*1.3,x,y+sz*1.5);
    hc.bezierCurveTo(x,y+sz*1.3,x+sz,y+sz*0.9,x+sz,y+sz*0.4);
    hc.bezierCurveTo(x+sz,y,x,y,x,y+sz*0.3);
    hc.closePath(); hc.fill();
    return heartCache;
  }

  function drawHeart(x, y, sz) {
    const cache = getHeartCache(Math.round(sz));
    const cw = cache.width;
    ctx.drawImage(cache, x - cw/2, y - cw*0.4, cw, cw);
  }

  function drawStar(x, y, r, rot, color) {
    const spikes=5, outerR=r, innerR=r*0.45;
    ctx.save(); ctx.translate(x,y); ctx.rotate(rot);
    if (GLOW) {
      ctx.beginPath(); ctx.arc(0,0,outerR+4,0,Math.PI*2);
      ctx.fillStyle='rgba(255,220,50,0.25)'; ctx.fill();
    }
    ctx.beginPath();
    for (let i=0;i<spikes*2;i++) {
      const angle=(Math.PI/spikes)*i-Math.PI/2, rad=i%2===0?outerR:innerR;
      if (i===0) ctx.moveTo(Math.cos(angle)*rad,Math.sin(angle)*rad);
      else       ctx.lineTo(Math.cos(angle)*rad,Math.sin(angle)*rad);
    }
    ctx.closePath(); ctx.fillStyle=color||'#ffd93d'; ctx.fill();
    ctx.strokeStyle='#ffaa00'; ctx.lineWidth=1.5; ctx.stroke();
    if (GLOW) {
      ctx.beginPath(); ctx.arc(-outerR*0.2,-outerR*0.25,outerR*0.18,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fill();
    }
    ctx.restore();
  }

  function getStreakColor(m) {
    if (m >= 4) return '#ff0000';
    if (m >= 3) return '#ff5500';
    if (m >= 2) return '#ff9900';
    return '#ffd93d';
  }

  function drawStreakBar(mult) {
    const barW=CW-20, barH=5, barX=10, barY=CH-12;
    const stepProgress = mult >= CFG.STREAK_MAX_MULT
      ? 1 : (streakTimer % CFG.STREAK_STEP) / CFG.STREAK_STEP;

    ctx.fillStyle='rgba(255,255,255,0.15)';
    ctx.beginPath(); safeRoundRect(barX,barY,barW,barH,3); ctx.fill();

    const barColor=getStreakColor(mult);
    ctx.fillStyle=barColor;
    ctx.beginPath(); safeRoundRect(barX,barY,barW*stepProgress,barH,3); ctx.fill();

    if (streakActive) {
      const pulse=0.85+Math.sin(elapsed*6)*0.15;
      ctx.globalAlpha=pulse;
      ctx.fillStyle=barColor;
      ctx.font='bold 11px Poppins,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      const label = mult >= CFG.STREAK_MAX_MULT
        ? `🔥 RACHA x${mult} — ¡MÁXIMO!`
        : `🔥 RACHA x${mult} — próximo x${mult+1} en ${Math.ceil(CFG.STREAK_STEP-(streakTimer%CFG.STREAK_STEP))}s`;
      ctx.fillText(label,CW/2,barY-8);
      ctx.globalAlpha=1;
    } else {
      const segsLeft=Math.ceil(CFG.STREAK_STEP-streakTimer);
      ctx.fillStyle='rgba(255,255,255,0.45)';
      ctx.font='10px Poppins,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(`🔥 x2 en ${segsLeft}s`,CW/2,barY-8);
    }
  }

  function draw(level, sd, mult) {
    ctx.fillStyle=getBg(level||1);
    ctx.fillRect(0,0,CW,CH);

    if (streakFlash > 0) {
      ctx.fillStyle=`rgba(255,153,0,${streakFlash*0.12})`;
      ctx.fillRect(0,0,CW,CH);
    }

    if (GLOW) {
      ctx.fillStyle=level>=6?'rgba(255,77,109,0.10)':'rgba(255,102,196,0.06)';
      const lvShow = level;
      ctx.font=`bold ${Math.min(180,80+Math.min(lvShow,28)*7)}px Poppins,sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(lvShow,CW/2,CH/2);
    }

    drawSpikes(sd);
    heartItems.forEach(h => drawHeart(h.x, h.y, h.r*0.9));
    starItems.forEach(s => drawStar(s.x,s.y,s.r,s.rot,'#ffd93d'));

    balls.forEach(b => {
      ctx.fillStyle=b.color;
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
      if (GLOW) {
        ctx.fillStyle='rgba(255,255,255,0.28)';
        ctx.beginPath(); ctx.arc(b.x-b.r*0.3,b.y-b.r*0.3,b.r*0.3,0,Math.PI*2); ctx.fill();
      }
    });

    for (let i=0; i<particles.length; i++) {
      const p=particles[i];
      ctx.globalAlpha=Math.max(0,p.life);
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0.1,p.r*p.life),0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;

    ctx.font='bold 18px Poppins,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    floatingTexts.forEach(t => {
      ctx.globalAlpha=Math.max(0,t.life);
      ctx.fillStyle=t.color;
      ctx.fillText(t.text,t.x,t.y);
    });
    ctx.globalAlpha=1;

    const isHit=player.hitFlash>0 && Math.floor(player.hitFlash*8)%2===0;
    if (!isHit) {
      if (streakActive) {
        ctx.strokeStyle=getStreakColor(mult); ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(player.x,player.y,player.r+3,0,Math.PI*2); ctx.stroke();
      }
      ctx.fillStyle='#ff4d6d';
      ctx.beginPath(); ctx.arc(player.x,player.y,player.r,0,Math.PI*2); ctx.fill();
      if (GLOW) {
        ctx.fillStyle='rgba(255,255,255,0.45)';
        ctx.beginPath(); ctx.arc(player.x-4,player.y-4,4,0,Math.PI*2); ctx.fill();
      }
    }

    if (GLOW && touchX!==null) {
      ctx.strokeStyle='rgba(255,77,109,0.2)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(player.x,player.y); ctx.lineTo(touchX,touchY||player.y); ctx.stroke();
      ctx.setLineDash([]);
    }

    if (started && !gameOver) drawStreakBar(mult);

    if (!started) {
      ctx.fillStyle='rgba(255,77,109,0.93)';
      ctx.beginPath(); safeRoundRect(CW/2-130,CH/2-65,260,130,14); ctx.fill();
      ctx.fillStyle='white'; ctx.font='bold 18px Poppins,sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('Evita las Bolas',CW/2,CH/2-36);
      ctx.font='12px Poppins,sans-serif';
      ctx.fillText('Mueve el dedo para esquivar',CW/2,CH/2-16);
      ctx.font='11px Poppins,sans-serif'; ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.fillText('⭐ Estrellas = +' + CFG.STAR_PTS + ' pts',CW/2,CH/2+4);
      ctx.fillText('❤️ Corazones = +vida  (' + CFG.MAX_VIDAS + ' vidas)',CW/2,CH/2+20);
      ctx.fillText('🔥 ' + CFG.STREAK_STEP + 's sin golpe = x2 → x3 → x4',CW/2,CH/2+36);
      ctx.fillText('Nivel 12+ pinchos',CW/2,CH/2+52);
    }
  }

  function endGame() {
    gameOver=true; cancelAnimationFrame(frameId);
    const gained=Math.round(score);
    const level=1+Math.floor(elapsed/CFG.NIVEL_CADA_S);
    if (gained>hi) {
      hi=gained; localStorage.setItem('evb_hi',hi);
      if (window._subirPuntosJuego) window._subirPuntosJuego(hi);
    }
    setMsg('+'+gained+' pts — Toca para jugar de nuevo');
    ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,CW,CH);
    ctx.fillStyle='white'; ctx.font='bold 28px Poppins,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('Perdiste',CW/2,CH/2-38);
    ctx.font='bold 22px Poppins,sans-serif'; ctx.fillStyle='#ffd93d';
    ctx.fillText('+'+gained+' puntos',CW/2,CH/2+2);
    ctx.font='13px Poppins,sans-serif'; ctx.fillStyle='rgba(255,255,255,0.75)';
    ctx.fillText('Nivel alcanzado: '+level,CW/2,CH/2+28);
    ctx.fillText('Toca para volver a jugar',CW/2,CH/2+50);
    refreshHUD();
  }

  function setMsg(t) { const el=document.getElementById('game-msg'); if(el) el.textContent=t; }

  function openGame() {
    const modal=document.getElementById('gameModal');
    if (!modal) return;
    modal.style.display='flex';
    setTimeout(()=>{ resizeCanvas(); initState(); draw(1,0,1); bindInput(); },80);
  }

  function closeGame() {
    cancelAnimationFrame(frameId); touchX=null; touchY=null;
    const modal=document.getElementById('gameModal');
    if (modal) modal.style.display='none';
  }

  window._cerrarJuego=closeGame;

  /* ===== SOLO LOS LISTENERS DEL JUEGO — ranking lo maneja script.js ===== */
  document.getElementById('game-btn')?.addEventListener('click', openGame);
  document.getElementById('closeGame')?.addEventListener('click', closeGame);
  document.getElementById('gameModal')?.addEventListener('click', e => {
    if (e.target.id === 'gameModal') closeGame();
  });

});
