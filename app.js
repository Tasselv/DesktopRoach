(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const today = () => new Date().toLocaleDateString("en-CA");
  const storageKey = "little-roach-club-v1";
  const freshState = {
    name: "阿强",
    coins: 120,
    hunger: 78,
    happy: 86,
    energy: 92,
    born: Date.now(),
    count: 1,
    experience: 0,
    night: false,
    missions: [],
    missionDate: today(),
    giftDate: "",
    journal: [],
    items: [],
  };
  let state = { ...freshState };
  let storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === "object") {
      for (const key of [
        "coins",
        "hunger",
        "happy",
        "energy",
        "born",
        "count",
        "experience",
      ]) {
        if (typeof saved[key] === "number" && Number.isFinite(saved[key]))
          state[key] = saved[key];
      }
      for (const key of ["name", "missionDate", "giftDate"]) {
        if (typeof saved[key] === "string") state[key] = saved[key];
      }
      state.name = state.name.trim().slice(0, 10) || "阿强";
      state.count = clamp(Math.floor(state.count), 1, 8);
      state.coins = clamp(Math.floor(state.coins), 0, 99999);
      state.born = clamp(state.born, 0, Date.now());
      state.experience = clamp(state.experience, 0, 99999);
      state.night = saved.night === true;
      state.items = Array.isArray(saved.items)
        ? saved.items
            .filter(
              (item) =>
                item &&
                ["food", "water", "ball"].includes(item.type) &&
                Number.isFinite(item.x) &&
                Number.isFinite(item.y),
            )
            .slice(0, 28)
        : [];
      state.missions = Array.isArray(saved.missions)
        ? [
            ...new Set(
              saved.missions.filter((m) =>
                ["feed", "play", "clean"].includes(m),
              ),
            ),
          ]
        : [];
      state.journal = Array.isArray(saved.journal)
        ? saved.journal
            .filter(
              (entry) =>
                entry &&
                typeof entry.text === "string" &&
                typeof entry.tag === "string" &&
                Number.isFinite(entry.time),
            )
            .slice(0, 12)
        : [];
    }
  } catch {
    storageAvailable = false;
  }

  const canvas = $("#world");
  const ctx = canvas.getContext("2d");
  const room = $("#room");
  const portrait = $("#portrait").getContext("2d");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 800,
    height = 480,
    mode = null,
    sound = false,
    audio = null;
  let pointer = { x: -1000, y: -1000 },
    drag = null,
    pointerStart = null;
  let roaches = [],
    food = [],
    water = [],
    balls = [],
    particles = [],
    specks = [];
  let toastTimer,
    speechTimer,
    animationFrame = 0,
    lastFrame = 0,
    simulationTime = 0,
    statTime = 0;
  let lastPetReward = -Infinity,
    lastBallReward = -Infinity,
    cleanUntil = 0;
  let home = { x: 0, y: 0 };
  const names = [
    "阿强",
    "小饼干",
    "六六",
    "跑跑",
    "小煤球",
    "闪电",
    "芝麻",
    "勇敢强",
  ];
  const thoughts = [
    "这里的房租，是面包屑吗？",
    "别看我小，我的梦想有桌面那么大。",
    "今天也在认真地活着。",
    "你忙你的，我陪着你。",
    "能不能把周一也扫走？",
    "我不是在摸鱼，我是在巡逻。",
  ];

  function save() {
    // Store relative positions so the same habitat fits desktop and mobile.
    state.items = [
      ...food.map((item) => ({
        type: "food",
        x: item.x / width,
        y: item.y / height,
        bites: item.bites,
      })),
      ...water.map((item) => ({
        type: "water",
        x: item.x / width,
        y: item.y / height,
        life: item.life,
      })),
      ...balls.map((item) => ({
        type: "ball",
        x: item.x / width,
        y: item.y / height,
      })),
    ];
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
    $("#save-status").textContent = storageAvailable
      ? "生活已自动保存"
      : "仅本次陪伴 · 浏览器存档不可用";
  }

  function resetDaily() {
    if (state.missionDate !== today()) {
      state.missionDate = today();
      state.missions = [];
    }
  }

  function updateUI() {
    resetDaily();
    for (const [key, prefix] of [
      ["hunger", "hunger"],
      ["happy", "happy"],
      ["energy", "energy"],
    ]) {
      state[key] = clamp(state[key], 0, 100);
      $(`#${prefix}-bar`).style.width = `${state[key]}%`;
      $(`#${prefix}-text`).textContent = Math.round(state[key]);
    }
    $("#coins").textContent = state.coins;
    $("#pet-name").textContent = state.name;
    $("#resident-count").textContent = state.count;
    $("#level").textContent = Math.min(
      99,
      Math.floor(state.experience / 50) + 1,
    );
    const days = Math.floor((Date.now() - state.born) / 86400000);
    $("#pet-age").textContent = days ? `入住第 ${days + 1} 天` : "今天入住";
    $("#mission-progress").textContent = `${state.missions.length} / 3`;
    $$(".mission").forEach((button) => {
      const completed = state.missions.includes(button.dataset.mission);
      button.classList.toggle("completed", completed);
      button.setAttribute(
        "aria-label",
        `${button.textContent.trim()}，${completed ? "已完成" : "未完成"}`,
      );
    });
    $("#daily-gift").title =
      state.giftDate === today()
        ? "今日补给已领取，明天再来"
        : "领取每日补给 +50";
  }

  function toast(text) {
    $("#toast").textContent = text;
    $("#toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => $("#toast").classList.remove("visible"),
      3200,
    );
  }

  function beep(frequency = 500) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      const oscillator = audio.createOscillator(),
        gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.6,
        audio.currentTime + 0.13,
      );
      gain.gain.setValueAtTime(0.045, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.16);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.17);
    } catch {
      sound = false;
      updateSound();
    }
  }

  function say(text, roach = roaches[0]) {
    const bubble = $("#speech");
    bubble.textContent = text;
    bubble.style.left = `${clamp(roach.x + 22, 12, width - Math.min(190, width - 24))}px`;
    bubble.style.top = `${clamp(roach.y - 61, 55, height - 80)}px`;
    bubble.classList.remove("hidden");
    clearTimeout(speechTimer);
    speechTimer = setTimeout(() => bubble.classList.add("hidden"), 3300);
  }

  function renderJournal() {
    $("#journal").replaceChildren();
    state.journal.slice(0, 6).forEach((entry) => {
      const row = document.createElement("div");
      row.className = "journal-entry";
      const time = document.createElement("time");
      time.textContent = new Date(entry.time).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const text = document.createElement("p");
      text.textContent = entry.text;
      const tag = document.createElement("span");
      tag.textContent = entry.tag;
      row.append(time, text, tag);
      $("#journal").append(row);
    });
  }

  function log(text, tag = "小日常") {
    state.journal.unshift({ text, tag, time: Date.now() });
    state.journal = state.journal.slice(0, 12);
    renderJournal();
    save();
  }

  function completeMission(task) {
    resetDaily();
    if (state.missions.includes(task)) return;
    state.missions.push(task);
    const reward = task === "clean" ? 10 : 15;
    state.coins += reward;
    state.experience += 10;
    toast(`今日小事完成！小强币 +${reward}，小确幸 +1`);
    updateUI();
    save();
  }

  function spend(amount) {
    if (state.coins < amount) {
      toast("小强币不够啦。点击右上角 + 领取每日补给，或完成今日小事。");
      return false;
    }
    state.coins -= amount;
    updateUI();
    save();
    return true;
  }

  function createRoach(index) {
    return {
      x: width * (0.47 + index * 0.035),
      y: height * (0.45 + index * 0.03),
      angle: -0.65 + index,
      target: null,
      phase: Math.random() * 7,
      scale: index ? random(0.73, 0.95) : 1.08,
      color: index % 3,
      wait: index ? 0 : 2.5,
      sleeping: false,
      homeward: false,
      name: index ? names[index] : state.name,
    };
  }

  function resize() {
    const previousWidth = width,
      previousHeight = height;
    const rect = room.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const entity of [...roaches, ...food, ...water, ...balls, ...specks]) {
      entity.x *= width / previousWidth;
      entity.y *= height / previousHeight;
      if (entity.target) entity.target = null;
    }
    const shelter = $(".shelter-door").getBoundingClientRect();
    home = {
      x: shelter.left - rect.left + shelter.width / 2,
      y: shelter.bottom - rect.top - 6,
    };
    for (const roach of roaches)
      if (roach.sleeping) {
        roach.x = home.x;
        roach.y = home.y;
      }
  }

  function drawRoach(context, roach, scale = 1, time = simulationTime) {
    const s = roach.scale * scale;
    context.save();
    context.translate(roach.x, roach.y);
    context.rotate(roach.angle);
    context.scale(s, s);
    context.fillStyle = "#34302518";
    context.beginPath();
    context.ellipse(-2, 4, 25, 12, 0, 0, Math.PI * 2);
    context.fill();
    const legPhase = roach.sleeping ? 0 : roach.phase;
    context.lineWidth = 1.25;
    context.strokeStyle = "#6e573c";
    context.lineCap = "round";
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const x = 9 - i * 10;
        const step = Math.sin(legPhase + i * 2 + (side < 0 ? Math.PI : 0)) * 3;
        context.beginPath();
        context.moveTo(x, side * 5);
        context.lineTo(x - 3 + step, side * (13 + i));
        context.lineTo(x - 9 + step * 1.5, side * (20 + (i === 1 ? 1 : -2)));
        context.lineTo(x - 12 + step * 1.5, side * (21 + (i === 1 ? 1 : -2)));
        context.stroke();
      }
    }
    const palette = [
      ["#b58a52", "#88613b", "#68472d"],
      ["#bfa273", "#94744d", "#745536"],
      ["#9c805b", "#76573b", "#563d2b"],
    ][roach.color];
    const body = context.createLinearGradient(-12, -9, 6, 10);
    body.addColorStop(0, palette[0]);
    body.addColorStop(0.4, palette[1]);
    body.addColorStop(1, palette[2]);
    context.fillStyle = body;
    context.strokeStyle = "#5e442c";
    context.lineWidth = 0.9;
    context.beginPath();
    context.ellipse(-5, 0, 18, 10, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.strokeStyle = "#d8b27a45";
    context.lineWidth = 0.65;
    for (let i = 0; i < 5; i++) {
      context.beginPath();
      context.ellipse(-10 + i * 4, 0, 3, 8.3, 0, -1.3, 1.3);
      context.stroke();
    }
    context.strokeStyle = "#49332299";
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(9, 0);
    context.quadraticCurveTo(-6, 1, -21, 0);
    context.stroke();
    context.strokeStyle = "#d2ae7270";
    context.beginPath();
    context.moveTo(5, -3);
    context.quadraticCurveTo(-10, -7, -19, -3);
    context.stroke();
    context.fillStyle = palette[2];
    context.strokeStyle = "#523a26";
    context.beginPath();
    context.ellipse(11, 0, 8, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = palette[0];
    context.globalAlpha = 0.7;
    context.beginPath();
    context.ellipse(11, -2, 5, 4, -0.2, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.fillStyle = "#5c422b";
    context.beginPath();
    context.ellipse(18, 0, 4.5, 5, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#28261e";
    for (const side of [-1, 1]) {
      context.beginPath();
      context.arc(19.5, side * 3.2, 1.25, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#67533b";
      context.lineWidth = 0.7;
      const wiggle = Math.sin(time * 2.5 + side) * 3;
      context.beginPath();
      context.moveTo(20, side * 2);
      context.bezierCurveTo(
        31,
        side * 5,
        40,
        side * (17 + wiggle),
        43 + wiggle,
        side * 23,
      );
      context.stroke();
    }
    context.restore();
  }

  function burst(x, y, text = "♡", color = "#91a375") {
    for (let i = 0; i < 4; i++)
      particles.push({
        x: x + random(-14, 14),
        y,
        vx: random(-13, 13),
        vy: random(-30, -15),
        life: 1.7,
        text,
        color,
      });
  }

  function setMode(next) {
    mode = mode === next ? null : next;
    $$(".tool").forEach((button) => {
      const selected = button.dataset.tool === mode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", selected);
    });
    const messages = {
      feed: "点击桌面撒面包屑 · 5 币 / 份 · Esc 取消",
      water: "点击桌面放一滴水 · 免费 · Esc 取消",
      play: "点击桌面放个小球 · 10 币 / 个 · Esc 取消",
    };
    $("#placement-hint").hidden = !mode;
    $("#placement-hint").textContent = messages[mode] || "";
    canvas.style.cursor = mode ? "crosshair" : "default";
  }

  function useTool(tool) {
    if (["feed", "water", "play"].includes(tool)) {
      setMode(tool);
      return;
    }
    setMode(null);
    if (tool === "home") {
      const release = roaches.every((r) => r.sleeping || r.homeward);
      roaches.forEach((r) => {
        r.homeward = !release;
        r.sleeping = false;
        r.target = null;
        r.wait = 0;
      });
      say(release ? "休息够了，继续探索！" : "下班啦，回家躺一会儿。");
      $("#room-status").textContent = release
        ? "室友们又开始冒险啦"
        : "室友们正在回小窝";
      log(
        release
          ? "小窝的门开了，新一轮巡逻开始。"
          : "天大地大，自己的纸箱最大。",
        "小憩",
      );
      beep(330);
    }
    if (tool === "clean") {
      food = [];
      water = [];
      balls = [];
      specks = [];
      cleanUntil = simulationTime + 1.1;
      roaches.forEach((r) => {
        r.target = null;
      });
      for (let i = 0; i < 16; i++)
        burst(random(25, width - 25), random(70, height - 40), "✧", "#adb48e");
      state.happy += 5;
      state.energy += 3;
      completeMission("clean");
      updateUI();
      log("桌面被擦得亮晶晶，小强觉得自己住进了豪宅。", "大扫除");
      say("连我的烦恼都一起扫掉了。");
      beep(720);
    }
  }

  function place(x, y) {
    x = clamp(x, 30, width - 30);
    y = clamp(y, 70, height - 43);
    if (mode === "feed") {
      if (food.length >= 16)
        return toast("桌上已经是自助餐了，先等小强吃完吧。");
      if (!spend(5)) return;
      food.push({ x, y, bites: 3, seed: random(0, 10) });
      roaches.forEach((r) => {
        r.sleeping = false;
        r.homeward = false;
        r.target = null;
        r.wait = 0;
      });
      say("闻到了，是碳水的香气！");
      $("#room-status").textContent = "开饭啦，小强正在闻香赶来";
      beep(570);
    } else if (mode === "water") {
      if (water.length >= 8) return toast("水已经够喝啦，别把桌面变成游泳池。");
      water.push({ x, y, life: 45 });
      roaches.forEach((r) => {
        r.sleeping = false;
        r.homeward = false;
        r.target = null;
        r.wait = 0;
      });
      say("吨吨吨，今天也要记得喝水。");
      beep(850);
    } else if (mode === "play") {
      if (balls.length >= 4)
        return toast("四个球已经够热闹啦，打扫后可以换新玩具。");
      if (!spend(10)) return;
      balls.push({
        x,
        y,
        vx: random(-35, 35),
        vy: random(-25, 25),
        rotation: 0,
      });
      roaches.forEach((r) => {
        r.sleeping = false;
        r.homeward = false;
        r.wait = 0;
        r.target = null;
      });
      state.happy += 8;
      completeMission("play");
      updateUI();
      log("一颗小球，让整个桌面变成了游乐场。", "玩耍");
      beep(680);
    }
    save();
  }

  function pet(roach) {
    roach.sleeping = false;
    roach.homeward = false;
    roach.wait = 1.5;
    roach.target = null;
    const words = [
      "是摸摸，不是拍扁，对吧？",
      "收到！今天也喜欢你。",
      "触角已连接，快乐传输中…",
      "我有六只脚，但我一步都不想离开你。",
      "人类，你的手好大。",
      "摸摸可以，加班不行。",
    ];
    say(words[Math.floor(Math.random() * words.length)], roach);
    burst(roach.x, roach.y - 10);
    beep(620);
    if (simulationTime - lastPetReward > 8) {
      state.happy += 3;
      state.experience += 1;
      lastPetReward = simulationTime;
      updateUI();
      save();
    }
  }

  function moveRoach(roach, dt) {
    if (drag === roach) {
      roach.phase += dt * 13;
      return;
    }
    if (roach.sleeping) return;
    if (roach.wait > 0) {
      roach.wait -= dt;
      return;
    }
    let target,
      speed = (state.night ? 42 : 29) * (reducedMotion ? 0.55 : 1);
    let snack = null,
      drink = null,
      toy = null;
    if (roach.homeward) target = home;
    else if (food.length) {
      snack = food.reduce((a, b) =>
        Math.hypot(a.x - roach.x, a.y - roach.y) <
        Math.hypot(b.x - roach.x, b.y - roach.y)
          ? a
          : b,
      );
      target = snack;
      speed *= 1.75;
    } else if (water.length) {
      drink = water.reduce((a, b) =>
        Math.hypot(a.x - roach.x, a.y - roach.y) <
        Math.hypot(b.x - roach.x, b.y - roach.y)
          ? a
          : b,
      );
      target = drink;
    } else if (balls.length) {
      toy = balls[roaches.indexOf(roach) % balls.length];
      target = toy;
      speed *= 1.6;
    } else {
      if (!roach.target)
        roach.target = {
          x: random(38, width - 38),
          y: random(100, height - 54),
        };
      target = roach.target;
      const distance = Math.hypot(pointer.x - roach.x, pointer.y - roach.y);
      if (distance < 68 && !mode) {
        const angle = Math.atan2(roach.y - pointer.y, roach.x - pointer.x);
        roach.target = {
          x: clamp(roach.x + Math.cos(angle) * 95, 35, width - 35),
          y: clamp(roach.y + Math.sin(angle) * 95, 78, height - 45),
        };
        target = roach.target;
        speed *= 2.4;
      }
    }
    const dx = target.x - roach.x,
      dy = target.y - roach.y,
      distance = Math.hypot(dx, dy);
    if (distance < (toy ? 25 : 9)) {
      roach.target = null;
      if (roach.homeward) {
        roach.sleeping = true;
        roach.homeward = false;
        roach.x = home.x + random(-6, 6);
        roach.y = home.y;
        say("小强已下线，梦里有面包。", roach);
        $("#room-status").textContent = "嘘，小窝里传来了轻轻的呼噜声";
      } else if (snack) {
        snack.bites--;
        if (snack.bites <= 0) food.splice(food.indexOf(snack), 1);
        state.hunger += 7;
        state.happy += 2;
        state.experience += 3;
        roach.wait = 1.8;
        burst(roach.x, roach.y - 8, "+7", "#8fa26c");
        completeMission("feed");
        updateUI();
        save();
        $("#room-status").textContent = `${roach.name}正在认真干饭，请勿打扰`;
        if (snack.bites === 2)
          log(`${roach.name}吃到了面包屑，幸福得搓了搓触角。`, "开饭");
        if (Math.random() < 0.5)
          specks.push({ x: roach.x + 12, y: roach.y + 8 });
      } else if (drink) {
        water.splice(water.indexOf(drink), 1);
        state.energy += 10;
        roach.wait = 2;
        burst(roach.x, roach.y - 6, "+10", "#82a4ae");
        updateUI();
        save();
      } else if (toy) {
        const angle = Math.atan2(toy.y - roach.y, toy.x - roach.x);
        toy.vx = Math.cos(angle) * random(75, 120);
        toy.vy = Math.sin(angle) * random(75, 120);
        roach.wait = 0.35;
        if (simulationTime - lastBallReward > 8) {
          state.happy += 1;
          lastBallReward = simulationTime;
          updateUI();
          burst(roach.x, roach.y - 8, "♪", "#b59b7a");
        }
      } else roach.wait = random(0.6, 3);
      return;
    }
    const desired = Math.atan2(dy, dx);
    const turn = Math.atan2(
      Math.sin(desired - roach.angle),
      Math.cos(desired - roach.angle),
    );
    roach.angle += turn * Math.min(1, dt * 7);
    const step = Math.min(distance, speed * dt);
    roach.x += (dx / distance) * step;
    roach.y += (dy / distance) * step;
    roach.x = clamp(roach.x, 26, width - 26);
    roach.y = clamp(roach.y, 68, height - 34);
    roach.phase += dt * speed * 0.5;
  }

  function drawWorld(dt) {
    ctx.clearRect(0, 0, width, height);
    for (const dot of specks) {
      ctx.fillStyle = "#7b68505c";
      ctx.beginPath();
      ctx.ellipse(dot.x, dot.y, 2, 1, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const drop of water) {
      drop.life -= dt;
      ctx.fillStyle = "#a6c3c17a";
      ctx.strokeStyle = "#8bacac88";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(drop.x, drop.y, 15, 10, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#fbffffb0";
      ctx.beginPath();
      ctx.ellipse(drop.x - 2, drop.y - 3, 7, 3, -0.2, Math.PI, Math.PI * 1.7);
      ctx.stroke();
    }
    water = water.filter((drop) => drop.life > 0);
    for (const snack of food) {
      ctx.save();
      ctx.translate(snack.x, snack.y);
      for (let i = 0; i < snack.bites * 3; i++) {
        const angle = i * 2.4 + snack.seed,
          radius = 3 + i * 1.3;
        ctx.save();
        ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.7);
        ctx.rotate(angle);
        ctx.fillStyle = "#80674422";
        ctx.fillRect(-2, 1, 7, 5);
        ctx.fillStyle = i % 2 ? "#c9a569" : "#e1c28a";
        ctx.strokeStyle = "#aa864c";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(-3, -2, 7, 5, 1.5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    for (const ball of balls) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vx *= Math.exp(-1.2 * dt);
      ball.vy *= Math.exp(-1.2 * dt);
      if (ball.x < 20 || ball.x > width - 20) ball.vx *= -1;
      if (ball.y < 80 || ball.y > height - 36) ball.vy *= -1;
      ball.x = clamp(ball.x, 20, width - 20);
      ball.y = clamp(ball.y, 80, height - 36);
      ball.rotation += ((ball.vx + ball.vy) * dt) / 17;
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.fillStyle = "#5660431c";
      ctx.beginPath();
      ctx.ellipse(3, 8, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(ball.rotation);
      ctx.fillStyle = "#c7a488";
      ctx.strokeStyle = "#9e7c61";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = "#ede0bf";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(-7, 0, 10, 14, 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#ffffff45";
      ctx.beginPath();
      ctx.ellipse(-3, -5, 3, 2, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const roach of roaches) {
      moveRoach(roach, dt);
      if (roach.sleeping) {
        ctx.font = "11px Georgia";
        ctx.fillStyle = state.night ? "#cbd2b4" : "#8f9c79";
        ctx.fillText(
          "z",
          roach.x + 5,
          roach.y - 20 - Math.sin(simulationTime) * 3,
        );
        ctx.font = "8px Georgia";
        ctx.fillText(
          "z",
          roach.x + 15,
          roach.y - 30 - Math.sin(simulationTime + 1) * 3,
        );
      } else drawRoach(ctx, roach);
    }
    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      ctx.globalAlpha = clamp(particle.life, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.font = '12px "DM Sans", sans-serif';
      ctx.fillText(particle.text, particle.x, particle.y);
    }
    ctx.globalAlpha = 1;
    particles = particles.filter((particle) => particle.life > 0);
    if (simulationTime < cleanUntil) {
      const progress = 1 - (cleanUntil - simulationTime) / 1.1;
      const gradient = ctx.createLinearGradient(
        width * progress - 70,
        0,
        width * progress + 70,
        0,
      );
      gradient.addColorStop(0, "#ffffff00");
      gradient.addColorStop(0.5, "#ffffff65");
      gradient.addColorStop(1, "#ffffff00");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function frame(timestamp) {
    const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
    lastFrame = timestamp;
    simulationTime += dt;
    statTime += dt;
    drawWorld(dt);
    portrait.clearRect(0, 0, 360, 220);
    drawRoach(
      portrait,
      {
        x: 172,
        y: 107,
        angle: -0.55,
        scale: 2.15,
        phase: Math.sin(simulationTime * 0.5) * 0.4,
        color: 0,
      },
      1,
      reducedMotion ? 0 : simulationTime,
    );
    if (statTime > 10) {
      state.hunger -= 0.45;
      state.happy -= 0.2;
      state.energy += roaches.some((r) => r.sleeping) ? 2 : -0.15;
      statTime = 0;
      updateUI();
      save();
      if (state.hunger < 25) {
        $("#pet-thought").textContent = "肚子里好像住着一只咕咕鸟。";
        $("#room-status").textContent = "小强有一点点饿了，给它来点面包屑吧";
      } else if (Math.random() < 0.35)
        $("#pet-thought").textContent =
          thoughts[Math.floor(Math.random() * thoughts.length)];
    }
    if (!document.hidden) animationFrame = requestAnimationFrame(frame);
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const p = point(event);
    pointerStart = { ...p, moved: false, id: event.pointerId };
    if (mode) {
      place(p.x, p.y);
      pointerStart = null;
      return;
    }
    drag =
      [...roaches]
        .reverse()
        .find((r) => !r.sleeping && Math.hypot(r.x - p.x, r.y - p.y) < 32) ||
      null;
    if (drag) {
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    const p = point(event);
    if (drag) {
      if (Math.hypot(p.x - pointerStart.x, p.y - pointerStart.y) > 5)
        pointerStart.moved = true;
      if (pointerStart.moved) {
        drag.x = clamp(p.x, 25, width - 25);
        drag.y = clamp(p.y, 70, height - 35);
      }
    } else {
      pointer = p;
      if (!mode)
        canvas.style.cursor = roaches.some(
          (r) => !r.sleeping && Math.hypot(r.x - p.x, r.y - p.y) < 32,
        )
          ? "grab"
          : "default";
    }
  });
  function releasePointer(event) {
    if (drag) {
      if (event.type === "pointerup") {
        if (!pointerStart.moved) pet(drag);
        else {
          say("免费观光电梯，好评！", drag);
          burst(drag.x, drag.y - 10);
        }
      }
      drag.target = null;
      drag.homeward = false;
      drag.wait = 0.7;
      if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
    }
    drag = null;
    pointerStart = null;
    pointer = { x: -1000, y: -1000 };
    canvas.style.cursor = mode ? "crosshair" : "default";
  }
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("pointerleave", () => {
    if (!drag) pointer = { x: -1000, y: -1000 };
  });
  canvas.addEventListener("dblclick", (event) => {
    if (mode) return;
    const p = point(event);
    roaches.forEach((r) => {
      r.sleeping = false;
      r.homeward = false;
      r.wait = 0;
      r.target = {
        x: clamp(p.x, 30, width - 30),
        y: clamp(p.y, 75, height - 40),
      };
    });
    toast("集合！小强小分队正在赶来。");
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pet(roaches[0]);
    }
  });

  $$(".tool").forEach((button) =>
    button.addEventListener("click", () => useTool(button.dataset.tool)),
  );
  $$(".mission").forEach((button) =>
    button.addEventListener("click", () => {
      if (state.missions.includes(button.dataset.mission))
        toast("这件小事今天已经完成啦，奖励已自动到账。");
      else useTool(button.dataset.mission);
    }),
  );
  document.addEventListener("keydown", (event) => {
    if (
      event.target.matches("input, textarea, [contenteditable]") ||
      $("dialog[open]") ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    const keys = { 1: "feed", 2: "water", 3: "play", 4: "home", 5: "clean" };
    if (keys[event.key]) {
      event.preventDefault();
      useTool(keys[event.key]);
    }
    if (event.key === "Escape") {
      setMode(null);
      $("#room-window").classList.remove("expanded");
    }
  });

  function setLight() {
    room.classList.toggle("night", state.night);
    $("#light-button").setAttribute("aria-pressed", state.night);
    $("#light-button use").setAttribute(
      "href",
      state.night ? "#i-moon" : "#i-sun",
    );
    $("#light-button>span").textContent = state.night ? "夜晚" : "白天";
  }
  $("#light-button").addEventListener("click", () => {
    state.night = !state.night;
    setLight();
    save();
    beep(300);
    say(
      state.night
        ? "关灯了？我的主场才刚刚开始。"
        : "天亮了，假装是一只勤劳的小强。",
    );
    log(
      state.night
        ? "你关掉了灯，小强的夜生活才刚刚开始。"
        : "桌面亮了起来，又是平凡而美好的一天。",
      state.night ? "晚安" : "早安",
    );
  });
  $("#daily-gift").addEventListener("click", () => {
    resetDaily();
    if (state.giftDate === today())
      return toast("今天的补给已经领取啦，明天再来看看。");
    state.giftDate = today();
    state.coins += 50;
    updateUI();
    log("收到今日补给 50 币，面包屑自由又近了一步。", "补给");
    toast("今日补给 +50 小强币。给小家伙加个餐吧！");
    beep(880);
  });
  $("#guide-button").addEventListener("click", () =>
    $("#guide-dialog").showModal(),
  );
  $("#rename-button").addEventListener("click", () => {
    $("#name-input").value = state.name;
    $("#rename-dialog").showModal();
    $("#name-input").select();
  });
  $("#rename-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#name-input").value.trim();
    if (!name) {
      $("#name-input").setCustomValidity("名字不能只包含空格");
      $("#name-input").reportValidity();
      return;
    }
    const previous = state.name;
    state.name = name;
    roaches[0].name = name;
    $("#rename-dialog").close();
    updateUI();
    log(`${previous}现在有了一个新名字：${name}。`, "新名字");
    say(`我叫${name}，请多多关照！`);
  });
  $("#name-input").addEventListener("input", () =>
    $("#name-input").setCustomValidity(""),
  );
  $("#adopt-button").addEventListener("click", () => {
    if (state.count >= 8)
      return toast("八位室友，已经是个大家庭啦。好好照顾它们吧！");
    $("#adopt-dialog").showModal();
  });
  $("#confirm-adopt").addEventListener("click", () => {
    if (state.count >= 8 || !spend(30)) {
      $("#adopt-dialog").close();
      return;
    }
    const roach = createRoach(state.count);
    roaches.push(roach);
    state.count++;
    $("#adopt-dialog").close();
    updateUI();
    log(`${roach.name}带着六条腿和一颗真诚的心，加入了这个家。`, "新室友");
    say("这么大的桌面，真的有我的位置吗？", roach);
    burst(roach.x, roach.y);
    beep(800);
  });
  $$("[data-close]").forEach((button) =>
    button.addEventListener("click", () => button.closest("dialog").close()),
  );
  $$("dialog").forEach((dialog) =>
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    }),
  );
  $("#fullscreen-button").addEventListener("click", async () => {
    const window = $("#room-window");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (window.requestFullscreen) await window.requestFullscreen();
      else window.classList.toggle("expanded");
    } catch {
      window.classList.toggle("expanded");
    }
  });
  function updateSound() {
    $("#sound-button").setAttribute("aria-pressed", sound);
    $("#sound-button>span").textContent = sound ? "声音开" : "声音关";
  }
  $("#sound-button").addEventListener("click", () => {
    sound = !sound;
    updateSound();
    beep(700);
  });

  resize();
  for (const item of state.items) {
    const position = {
      x: clamp(item.x * width, 30, width - 30),
      y: clamp(item.y * height, 80, height - 43),
    };
    if (item.type === "food" && food.length < 16)
      food.push({
        ...position,
        bites: Number.isFinite(item.bites)
          ? clamp(Math.round(item.bites), 1, 3)
          : 3,
        seed: random(0, 10),
      });
    if (item.type === "water" && water.length < 8)
      water.push({
        ...position,
        life: Number.isFinite(item.life) ? clamp(item.life, 1, 45) : 45,
      });
    if (item.type === "ball" && balls.length < 4)
      balls.push({ ...position, vx: 0, vy: 0, rotation: 0 });
  }
  roaches = Array.from({ length: state.count }, (_, index) =>
    createRoach(index),
  );
  for (let i = 0; i < 8; i++)
    specks.push({
      x: random(width * 0.33, width * 0.72),
      y: random(height * 0.4, height * 0.75),
    });
  new ResizeObserver(resize).observe(room);
  updateUI();
  setLight();
  if (!state.journal.length)
    log(`${state.name}拖着小小的行李，搬进了你的桌面。`, "新生活");
  else {
    renderJournal();
    say("你回来啦，我一直都在。");
  }
  save();
  speechTimer = setTimeout(() => $("#speech").classList.add("hidden"), 6500);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrame);
      save();
    } else {
      lastFrame = 0;
      resetDaily();
      updateUI();
      animationFrame = requestAnimationFrame(frame);
    }
  });
  window.addEventListener("pagehide", save);
  animationFrame = requestAnimationFrame(frame);
})();
