(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const context = canvas.getContext("2d");
  const startButton = document.getElementById("start-game");
  const message = document.getElementById("game-message");
  const scoreElement = document.getElementById("score");
  const highScoreElement = document.getElementById("high-score");
  const levelElement = document.getElementById("level");
  const nicknameInput = document.getElementById("nickname");
  const width = canvas.width;
  const height = canvas.height;
  const highScoreKey = "fish-eat-fish-high-score";
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  let state = null;
  let animationFrame = 0;
  let lastTime = 0;

  highScoreElement.textContent = Number(localStorage.getItem(highScoreKey) || 0);

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createFish(size, color, player) {
    return {
      x: random(size, width - size),
      y: random(size, height - size),
      size,
      color,
      player: Boolean(player),
      direction: { ...directions.right },
      speed: player ? 170 : random(22, 48),
      angle: random(0, Math.PI * 2)
    };
  }

  function createState() {
    return {
      running: true,
      score: 0,
      level: 1,
      player: { ...createFish(22, "#55e6a5", true), x: width / 2, y: height / 2 },
      fish: [
        createFish(13, "#ffd166"), createFish(18, "#ff7b9c"),
        createFish(27, "#ff5c5c"), createFish(33, "#b47cff"),
        createFish(42, "#f27c38")
      ],
      worms: Array.from({ length: 5 }, () => ({ x: random(20, width - 20), y: random(20, height - 20), size: 8 }))
    };
  }

  function setDirection(name) {
    if (!state || !state.running) return;
    const next = directions[name];
    if (next) state.player.direction = { ...next };
  }

  function startGame() {
    state = createState();
    startButton.textContent = "다시 시작";
    message.hidden = true;
    updateScoreboard();
    cancelAnimationFrame(animationFrame);
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(loop);
  }

  function updateScoreboard() {
    scoreElement.textContent = state ? state.score : 0;
    levelElement.textContent = state ? state.level : 1;
  }

  function addScore(amount) {
    state.score += amount;
    state.level = Math.floor(state.score / 3) + 1;
    const highScore = Math.max(state.score, Number(localStorage.getItem(highScoreKey) || 0));
    localStorage.setItem(highScoreKey, highScore);
    highScoreElement.textContent = highScore;
    updateScoreboard();
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function moveFish(fish, delta) {
    if (fish.player) {
      fish.x += fish.direction.x * fish.speed * delta;
      fish.y += fish.direction.y * fish.speed * delta;
    } else {
      fish.angle += random(-0.7, 0.7) * delta;
      fish.x += Math.cos(fish.angle) * fish.speed * delta;
      fish.y += Math.sin(fish.angle) * fish.speed * delta;
    }
    fish.x = Math.max(fish.size, Math.min(width - fish.size, fish.x));
    fish.y = Math.max(fish.size, Math.min(height - fish.size, fish.y));
  }

  function gameOver() {
    state.running = false;
    message.textContent = `${nicknameInput.value.trim() || "플레이어"}의 기록: ${state.score}점`;
    message.hidden = false;
  }

  function update(delta) {
    moveFish(state.player, delta);
    state.fish.forEach((fish) => moveFish(fish, delta));

    state.worms = state.worms.filter((worm) => {
      if (distance(state.player, worm) < state.player.size + worm.size) {
        addScore(1);
        return false;
      }
      return true;
    });

    state.fish = state.fish.filter((fish) => {
      if (distance(state.player, fish) >= state.player.size + fish.size) return true;
      if (state.player.size >= fish.size) {
        state.player.size += 2;
        addScore(2);
        return false;
      }
      gameOver();
      return true;
    });

    if (state.worms.length < 3) state.worms.push({ x: random(20, width - 20), y: random(20, height - 20), size: 8 });
  }

  function drawFish(fish) {
    context.save();
    context.translate(fish.x, fish.y);
    const facing = fish.player ? fish.direction.x || 1 : Math.cos(fish.angle) >= 0 ? 1 : -1;
    context.scale(facing, 1);
    context.fillStyle = fish.color;
    context.beginPath();
    context.ellipse(0, 0, fish.size, fish.size * 0.68, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(-fish.size * 0.7, 0);
    context.lineTo(-fish.size * 1.35, -fish.size * 0.65);
    context.lineTo(-fish.size * 1.35, fish.size * 0.65);
    context.closePath();
    context.fill();
    context.fillStyle = "#07111f";
    context.beginPath();
    context.arc(fish.size * 0.5, -fish.size * 0.18, Math.max(2, fish.size * 0.1), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawWorm(worm) {
    context.strokeStyle = "#f9a8d4";
    context.lineWidth = 5;
    context.beginPath();
    context.arc(worm.x, worm.y, worm.size, 0.2, Math.PI * 1.6);
    context.stroke();
  }

  function draw() {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0b4055");
    gradient.addColorStop(1, "#062033");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 22; i += 1) context.fillRect((i * 83) % width, (i * 47) % height, 2, 2);
    if (!state) return;
    state.worms.forEach(drawWorm);
    state.fish.forEach(drawFish);
    drawFish(state.player);
  }

  function loop(time) {
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (state.running) update(delta);
    draw();
    if (state.running) animationFrame = requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", (event) => {
    const keys = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (keys[event.key]) {
      event.preventDefault();
      setDirection(keys[event.key]);
    }
  });
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("pointerdown", () => setDirection(button.dataset.direction));
  });
  startButton.addEventListener("click", startGame);
  draw();
})();
