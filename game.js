(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  const context = canvas.getContext("2d");
  const startButton = document.getElementById("start-game");
  const pauseButton = document.getElementById("pause-game");
  const message = document.getElementById("game-message");
  const scoreElement = document.getElementById("score");
  const highScoreElement = document.getElementById("high-score");
  const levelElement = document.getElementById("level");
  const nicknameInput = document.getElementById("nickname");
  const playerCountInput = document.getElementById("player-count");
  const playerStatus = document.getElementById("player-status");
  const width = canvas.width;
  const height = canvas.height;
  const highScoreKey = "fish-eat-fish-high-score";
  const directions = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 }
  };
  const playerProfiles = [
    { color: "#55e6a5", keys: { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right" }, label: "P1" },
    { color: "#65b7ff", keys: { KeyI: "up", KeyK: "down", KeyJ: "left", KeyL: "right" }, label: "P2" },
    { color: "#ffd166", keys: { KeyT: "up", KeyG: "down", KeyF: "left", KeyH: "right" }, label: "P3" }
  ];
  let state = null;
  let animationFrame = 0;
  let lastTime = 0;

  highScoreElement.textContent = Number(localStorage.getItem(highScoreKey) || 0);

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createFish(size, color, player, index) {
    const angle = random(0, Math.PI * 2);
    return {
      x: player ? width * (0.28 + index * 0.22) : random(size, width - size),
      y: player ? height * (0.35 + (index % 2) * 0.3) : random(size, height - size),
      size, color, player: Boolean(player), index: index || 0,
      direction: { ...directions.right }, speed: player ? 170 : random(28, 62),
      angle, velocity: { x: Math.cos(angle), y: Math.sin(angle) },
      turnTimer: random(0.3, 1.5), score: 0, alive: true
    };
  }

  function createState() {
    const count = Number(playerCountInput.value);
    return {
      running: true, paused: false, score: 0, level: 1,
      players: Array.from({ length: count }, (_, index) => createFish(22, playerProfiles[index].color, true, index)),
      fish: [
        createFish(12, "#b8f2e6"), createFish(14, "#ff8fab"), createFish(17, "#f9c74f"),
        createFish(22, "#ff6b6b"), createFish(28, "#b47cff"), createFish(36, "#f27c38"),
        createFish(46, "#9b5de5")
      ],
      worms: Array.from({ length: 7 }, () => ({ x: random(20, width - 20), y: random(20, height - 20), size: 8 }))
    };
  }

  function startGame() {
    state = createState();
    startButton.textContent = "다시 시작";
    pauseButton.disabled = false;
    pauseButton.textContent = "일시정지";
    message.hidden = true;
    playerStatus.textContent = `${state.players.length}인 모드 · ${playerProfiles[0].label}: 화살표/WASD`;
    updateScoreboard();
    cancelAnimationFrame(animationFrame);
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(loop);
  }

  function updateScoreboard() {
    scoreElement.textContent = state ? state.score : 0;
    levelElement.textContent = state ? state.level : 1;
  }

  function addScore(amount, player) {
    player.score += amount;
    if (player.index === 0) {
      state.score = player.score;
      state.level = Math.floor(state.score / 3) + 1;
      const highScore = Math.max(state.score, Number(localStorage.getItem(highScoreKey) || 0));
      localStorage.setItem(highScoreKey, highScore);
      highScoreElement.textContent = highScore;
      updateScoreboard();
    }
  }

  function growFish(player, amount) {
    player.size = Math.min(player.size + amount, 88);
    if (player.index === 0) updateScoreboard();
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function setDirection(player, name) {
    if (!state || !state.running || state.paused || !player.alive) return;
    const next = directions[name];
    if (!next) return;
    const current = player.direction;
    const isReverse = next.x === -current.x && next.y === -current.y;
    if (!isReverse) player.direction = { ...next };
  }

  function moveFish(fish, delta) {
    if (fish.player) {
      fish.x += fish.direction.x * fish.speed * delta;
      fish.y += fish.direction.y * fish.speed * delta;
    } else {
      fish.turnTimer -= delta;
      if (fish.turnTimer <= 0) {
        fish.angle += random(-1.6, 1.6);
        fish.velocity = { x: Math.cos(fish.angle), y: Math.sin(fish.angle) };
        fish.turnTimer = random(0.45, 1.8);
      }
      fish.x += fish.velocity.x * fish.speed * delta;
      fish.y += fish.velocity.y * fish.speed * delta;
      if (fish.x <= fish.size || fish.x >= width - fish.size) {
        fish.velocity.x *= -1;
        fish.angle = Math.atan2(fish.velocity.y, fish.velocity.x);
      }
      if (fish.y <= fish.size || fish.y >= height - fish.size) {
        fish.velocity.y *= -1;
        fish.angle = Math.atan2(fish.velocity.y, fish.velocity.x);
      }
    }
    fish.x = Math.max(fish.size, Math.min(width - fish.size, fish.x));
    fish.y = Math.max(fish.size, Math.min(height - fish.size, fish.y));
  }

  function gameOver(player) {
    state.running = false;
    pauseButton.disabled = true;
    const name = nicknameInput.value.trim() || "플레이어 1";
    message.textContent = `${player.index === 0 ? name : `플레이어 ${player.index + 1}`}가 탈락했습니다 · P1 점수 ${state.score}점`;
    message.hidden = false;
  }

  function togglePause() {
    if (!state || !state.running) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "계속하기" : "일시정지";
    message.textContent = state.paused ? "일시정지" : "";
    message.hidden = !state.paused;
  }

  function handlePlayerCollisions() {
    for (let i = 0; i < state.players.length; i += 1) {
      const first = state.players[i];
      if (!first.alive) continue;
      for (let j = i + 1; j < state.players.length; j += 1) {
        const second = state.players[j];
        if (!second.alive || distance(first, second) >= first.size + second.size) continue;
        const winner = first.size >= second.size ? first : second;
        const loser = winner === first ? second : first;
        growFish(winner, 4);
        addScore(3, winner);
        loser.alive = false;
        if (loser.index === 0) gameOver(loser);
      }
    }
  }

  function update(delta) {
    state.players.filter((player) => player.alive).forEach((player) => moveFish(player, delta));
    state.fish.forEach((fish) => moveFish(fish, delta));
    const mainPlayer = state.players[0];
    if (!mainPlayer.alive) return;

    state.worms = state.worms.filter((worm) => {
      const eater = state.players.find((player) => player.alive && distance(player, worm) < player.size + worm.size);
      if (!eater) return true;
      growFish(eater, 1.5);
      addScore(1, eater);
      return false;
    });

    state.fish = state.fish.filter((fish) => {
      const eater = state.players.find((player) => player.alive && distance(player, fish) < player.size + fish.size);
      if (!eater) return true;
      if (eater.size >= fish.size) {
        growFish(eater, Math.max(3, fish.size * 0.18));
        addScore(2, eater);
        return false;
      }
      gameOver(eater);
      return true;
    });
    handlePlayerCollisions();
    while (state.fish.length < 7) {
      const size = random(11, Math.min(46, 14 + state.level * 2));
      const colors = ["#b8f2e6", "#ff8fab", "#f9c74f", "#ff6b6b", "#b47cff", "#f27c38", "#9b5de5"];
      state.fish.push(createFish(size, colors[Math.floor(random(0, colors.length))]));
    }
    while (state.worms.length < 5) state.worms.push({ x: random(20, width - 20), y: random(20, height - 20), size: 8 });
  }

  function drawFish(fish) {
    if (!fish.alive) return;
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
    if (fish.player) {
      context.fillStyle = "#eef6ff";
      context.font = "bold 10px system-ui";
      context.textAlign = "center";
      context.fillText(`P${fish.index + 1}`, 0, -fish.size - 8);
    }
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
    state.players.forEach(drawFish);
  }

  function loop(time) {
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (state.running && !state.paused) update(delta);
    draw();
    if (state.running) animationFrame = requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", (event) => {
    if (!state) return;
    if (event.key === "p" || event.key === "P") {
      togglePause();
      return;
    }
    const player = state.players.find((candidate) => candidate.alive && playerProfiles[candidate.index].keys[event.code]);
    if (player) {
      event.preventDefault();
      setDirection(player, playerProfiles[player.index].keys[event.code]);
    }
  });
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("pointerdown", () => setDirection(state && state.players[0], button.dataset.direction));
  });
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", togglePause);
  draw();
})();
