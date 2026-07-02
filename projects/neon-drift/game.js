const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  score: document.querySelector("#score"),
  level: document.querySelector("#level"),
  lives: document.querySelector("#lives"),
  energy: document.querySelector("#energyBar"),
  intro: document.querySelector("#introScreen"),
  end: document.querySelector("#endScreen"),
  endCopy: document.querySelector("#endCopy"),
  start: document.querySelector("#startButton"),
  retry: document.querySelector("#retryButton"),
  pause: document.querySelector("#pauseButton"),
  mute: document.querySelector("#muteButton"),
};

const colors = {
  paper: "#f4f2e8",
  muted: "rgba(244,242,232,.48)",
  lime: "#d8f35e",
  teal: "#19b4a5",
  ember: "#f0573f",
  gold: "#ffb23a",
  cobalt: "#4f74ff",
};

const keys = new Set();
const pointer = { active: false, x: 0, y: 0 };

let w = 0;
let h = 0;
let dpr = 1;
let lastTime = 0;
let spawnTimer = 0;
let shardTimer = 0;
let shake = 0;
let audioMuted = false;
let audioContext;

const game = {
  state: "intro",
  score: 0,
  level: 1,
  lives: 3,
  time: 0,
  speed: 330,
  energy: 100,
  phase: false,
  invincible: 0,
  player: { x: 0, y: 0, r: 18, trail: [] },
  obstacles: [],
  shards: [],
  particles: [],
  stars: [],
};

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = rect.width;
  h = rect.height;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!game.player.x) {
    game.player.x = Math.max(90, w * 0.2);
    game.player.y = h * 0.5;
  }

  seedStars();
}

function seedStars() {
  const count = Math.floor((w * h) / 11000);
  game.stars = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    z: Math.random() * 0.8 + 0.2,
  }));
}

function resetGame() {
  game.state = "running";
  game.score = 0;
  game.level = 1;
  game.lives = 3;
  game.time = 0;
  game.speed = 330;
  game.energy = 100;
  game.phase = false;
  game.invincible = 0;
  game.player = { x: Math.max(90, w * 0.2), y: h * 0.5, r: 18, trail: [] };
  game.obstacles = [];
  game.shards = [];
  game.particles = [];
  spawnTimer = 0;
  shardTimer = 0.7;
  shake = 0;
  ui.intro.classList.remove("is-visible");
  ui.end.classList.remove("is-visible");
  ui.pause.textContent = "Pausa";
  playTone(260, 0.12, "triangle", 0.06);
  playTone(520, 0.18, "sine", 0.05);
}

function endGame() {
  game.state = "ended";
  game.phase = false;
  ui.endCopy.textContent = `Score finale: ${Math.floor(game.score)}`;
  ui.end.classList.add("is-visible");
  playTone(150, 0.22, "sawtooth", 0.04);
  playTone(86, 0.28, "sine", 0.05);
}

function togglePause() {
  if (game.state === "running") {
    game.state = "paused";
    ui.pause.textContent = "Riprendi";
  } else if (game.state === "paused") {
    game.state = "running";
    ui.pause.textContent = "Pausa";
    lastTime = performance.now();
  }
}

function playTone(freq, duration, type = "sine", gain = 0.04) {
  if (audioMuted) return;
  audioContext ||= new AudioContext();
  const osc = audioContext.createOscillator();
  const amp = audioContext.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0, audioContext.currentTime);
  amp.gain.linearRampToValueAtTime(gain, audioContext.currentTime + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  osc.connect(amp).connect(audioContext.destination);
  osc.start();
  osc.stop(audioContext.currentTime + duration + 0.02);
}

function spawnObstacle() {
  const size = 42 + Math.random() * 56;
  const lane = Math.random();
  const y = 110 + lane * Math.max(140, h - 220);
  const type = Math.random() > 0.58 ? "bar" : "diamond";
  game.obstacles.push({
    x: w + size,
    y,
    size,
    type,
    spin: Math.random() * Math.PI,
    drift: (Math.random() - 0.5) * 52,
    hit: false,
  });
}

function spawnShard() {
  game.shards.push({
    x: w + 30,
    y: 110 + Math.random() * Math.max(120, h - 220),
    r: 11,
    pulse: Math.random() * Math.PI * 2,
  });
}

function emit(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 180;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + Math.random() * 0.35,
      max: 0.7,
      color,
    });
  }
}

function inputVector() {
  const vector = { x: 0, y: 0 };
  if (keys.has("arrowleft") || keys.has("a")) vector.x -= 1;
  if (keys.has("arrowright") || keys.has("d")) vector.x += 1;
  if (keys.has("arrowup") || keys.has("w")) vector.y -= 1;
  if (keys.has("arrowdown") || keys.has("s")) vector.y += 1;
  return vector;
}

function update(dt) {
  if (game.state !== "running") return;

  game.time += dt;
  game.level = Math.max(1, Math.floor(game.time / 12) + 1);
  game.speed = 330 + game.level * 26;
  game.score += dt * (18 + game.level * 4);
  game.invincible = Math.max(0, game.invincible - dt);
  shake = Math.max(0, shake - dt * 18);

  const wantsPhase = keys.has(" ") || keys.has("shift");
  game.phase = wantsPhase && game.energy > 3;
  game.energy += (game.phase ? -34 : 18) * dt;
  game.energy = Math.max(0, Math.min(100, game.energy));

  const v = inputVector();
  const moveSpeed = game.phase ? 440 : 350;
  const len = Math.hypot(v.x, v.y) || 1;

  if (pointer.active) {
    const dx = pointer.x - game.player.x;
    const dy = pointer.y - game.player.y;
    game.player.x += dx * Math.min(1, dt * 8);
    game.player.y += dy * Math.min(1, dt * 8);
  } else {
    game.player.x += (v.x / len) * moveSpeed * dt;
    game.player.y += (v.y / len) * moveSpeed * dt;
  }

  game.player.x = Math.max(52, Math.min(w * 0.62, game.player.x));
  game.player.y = Math.max(92, Math.min(h - 92, game.player.y));
  game.player.trail.unshift({ x: game.player.x, y: game.player.y, phase: game.phase });
  game.player.trail = game.player.trail.slice(0, 18);

  spawnTimer -= dt;
  shardTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = Math.max(0.38, 1.05 - game.level * 0.055 + Math.random() * 0.34);
  }
  if (shardTimer <= 0) {
    spawnShard();
    shardTimer = 1.2 + Math.random() * 1.2;
  }

  updateObjects(dt);
  updateParticles(dt);
  updateStars(dt);
  updateUI();
}

function updateObjects(dt) {
  const p = game.player;

  for (const obstacle of game.obstacles) {
    obstacle.x -= game.speed * dt;
    obstacle.y += Math.sin(game.time * 2 + obstacle.x * 0.01) * obstacle.drift * dt;
    obstacle.spin += dt * 1.8;

    const radius = obstacle.type === "bar" ? obstacle.size * 0.62 : obstacle.size * 0.5;
    const distance = Math.hypot(p.x - obstacle.x, p.y - obstacle.y);
    const canHit = !game.phase && game.invincible <= 0 && !obstacle.hit;

    if (canHit && distance < p.r + radius) {
      obstacle.hit = true;
      game.lives -= 1;
      game.invincible = 1.35;
      shake = 1;
      emit(p.x, p.y, colors.ember, 26);
      playTone(96, 0.18, "sawtooth", 0.06);
      if (game.lives <= 0) endGame();
    }
  }

  for (const shard of game.shards) {
    shard.x -= (game.speed + 35) * dt;
    shard.pulse += dt * 5;

    if (Math.hypot(p.x - shard.x, p.y - shard.y) < p.r + shard.r) {
      shard.collected = true;
      game.score += 160 + game.level * 18;
      game.energy = Math.min(100, game.energy + 20);
      emit(shard.x, shard.y, colors.lime, 18);
      playTone(680, 0.08, "triangle", 0.035);
      playTone(920, 0.12, "sine", 0.025);
    }
  }

  game.obstacles = game.obstacles.filter((item) => item.x > -120);
  game.shards = game.shards.filter((item) => !item.collected && item.x > -40);
}

function updateParticles(dt) {
  for (const particle of game.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 1 - dt * 2.4;
    particle.vy *= 1 - dt * 2.4;
    particle.life -= dt;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);
}

function updateStars(dt) {
  for (const star of game.stars) {
    star.x -= game.speed * star.z * dt * 0.28;
    if (star.x < -10) {
      star.x = w + 10;
      star.y = Math.random() * h;
      star.z = Math.random() * 0.8 + 0.2;
    }
  }
}

function updateUI() {
  ui.score.textContent = Math.floor(game.score);
  ui.level.textContent = game.level;
  ui.lives.textContent = game.lives;
  ui.energy.style.transform = `scaleX(${game.energy / 100})`;
  ui.mute.setAttribute("aria-pressed", String(audioMuted));
  ui.mute.textContent = audioMuted ? "Muto" : "Audio";
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake * 9, (Math.random() - 0.5) * shake * 9);
  }

  drawBackground();
  drawObjects();
  drawPlayer();
  drawParticles();

  if (game.state === "paused") {
    drawPauseVeil();
  }

  ctx.restore();
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#080908");
  grad.addColorStop(0.55, "#11110e");
  grad.addColorStop(1, "#15110f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = "rgba(216,243,94,.09)";
  ctx.lineWidth = 1;
  for (let y = h * 0.18; y < h; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(game.time + y * 0.01) * 8);
    ctx.lineTo(w, y + Math.cos(game.time + y * 0.01) * 8);
    ctx.stroke();
  }
  for (let x = -80; x < w + 80; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x - ((game.time * 70) % 90), h);
    ctx.lineTo(w * 0.56, h * 0.22);
    ctx.stroke();
  }
  ctx.restore();

  for (const star of game.stars) {
    ctx.fillStyle = `rgba(244,242,232,${0.18 + star.z * 0.42})`;
    ctx.fillRect(star.x, star.y, 14 * star.z, 1.5);
  }
}

function drawObjects() {
  for (const shard of game.shards) {
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.pulse * 0.6);
    ctx.shadowColor = colors.lime;
    ctx.shadowBlur = 18;
    ctx.fillStyle = colors.lime;
    diamond(0, 0, shard.r + Math.sin(shard.pulse) * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const obstacle of game.obstacles) {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(obstacle.spin);
    ctx.globalAlpha = obstacle.hit ? 0.28 : 1;
    ctx.shadowColor = obstacle.type === "bar" ? colors.ember : colors.gold;
    ctx.shadowBlur = 18;
    ctx.fillStyle = obstacle.type === "bar" ? colors.ember : colors.gold;

    if (obstacle.type === "bar") {
      roundedRect(-obstacle.size * 0.22, -obstacle.size * 0.82, obstacle.size * 0.44, obstacle.size * 1.64, 6);
      ctx.fill();
      ctx.rotate(Math.PI / 2);
      roundedRect(-obstacle.size * 0.12, -obstacle.size * 0.52, obstacle.size * 0.24, obstacle.size * 1.04, 6);
      ctx.fill();
    } else {
      diamond(0, 0, obstacle.size * 0.55);
      ctx.fill();
      ctx.strokeStyle = "rgba(9,10,10,.7)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPlayer() {
  const p = game.player;

  ctx.save();
  for (let i = game.player.trail.length - 1; i >= 0; i -= 1) {
    const dot = game.player.trail[i];
    const alpha = (1 - i / game.player.trail.length) * 0.42;
    ctx.fillStyle = dot.phase ? `rgba(79,116,255,${alpha})` : `rgba(25,180,165,${alpha})`;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, p.r * (1 - i / 24), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(p.x, p.y);
  ctx.rotate(Math.sin(game.time * 5) * 0.08);
  ctx.shadowColor = game.phase ? colors.cobalt : colors.teal;
  ctx.shadowBlur = game.phase ? 28 : 18;
  ctx.globalAlpha = game.invincible > 0 ? 0.58 + Math.sin(game.time * 42) * 0.28 : 1;
  ctx.fillStyle = game.phase ? colors.cobalt : colors.teal;
  ctx.beginPath();
  ctx.moveTo(p.r + 10, 0);
  ctx.lineTo(-p.r, -p.r * 0.82);
  ctx.lineTo(-p.r * 0.48, 0);
  ctx.lineTo(-p.r, p.r * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colors.lime;
  ctx.beginPath();
  ctx.arc(2, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const particle of game.particles) {
    const alpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3 + alpha * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawPauseVeil() {
  ctx.fillStyle = "rgba(0,0,0,.42)";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colors.paper;
  ctx.font = "900 42px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Pausa", w / 2, h / 2);
}

function diamond(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function loop(now) {
  const dt = Math.min(0.034, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);

  if (key === "enter" && (game.state === "intro" || game.state === "ended")) resetGame();
  if (key === "p") togglePause();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  if (game.state === "intro") resetGame();
});

canvas.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

window.addEventListener("pointerup", () => {
  pointer.active = false;
});

ui.start.addEventListener("click", resetGame);
ui.retry.addEventListener("click", resetGame);
ui.pause.addEventListener("click", togglePause);
ui.mute.addEventListener("click", () => {
  audioMuted = !audioMuted;
  updateUI();
});

resize();
updateUI();
requestAnimationFrame((time) => {
  lastTime = time;
  requestAnimationFrame(loop);
});
