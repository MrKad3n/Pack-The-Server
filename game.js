const GAP = 4;
const PAD = 6;
let CELL = 54;
let TRAY_CELL = 30;
let GRID = 4;
let SERVER_COUNT = 4;

const step = () => CELL + GAP;
const gridPx = () => PAD * 2 + GRID * CELL + (GRID - 1) * GAP;
const spanPx = (n) => n * CELL + (n - 1) * GAP;

const JOB_TYPES = {
  website: { name: "Website", emoji: "🌐", color: "#3b82f6", w: 2, h: 2 },
  game:    { name: "Game", emoji: "🎮", color: "#22c55e", w: 2, h: 3 },
  school:  { name: "School Files", emoji: "📚", color: "#facc15", w: 1, h: 3, dark: true },
  music:   { name: "Music", emoji: "🎵", color: "#a855f7", w: 3, h: 2 },
  video:   { name: "Video Chat", emoji: "📹", color: "#ec4899", w: 2, h: 2 },
  email:   { name: "Email", emoji: "✉️", color: "#f97316", w: 2, h: 1 },
  movies:  { name: "Movies", emoji: "🍿", color: "#06b6d4", w: 4, h: 1 },
  photos:  { name: "Photos", emoji: "🖼️", color: "#14b8a6", w: 3, h: 1 },
  maps:    { name: "Maps", emoji: "🗺️", color: "#84cc16", w: 1, h: 2, dark: true },
  chat:    { name: "Chat", emoji: "💬", color: "#f43f5e", w: 1, h: 1 },
  weather: { name: "Weather", emoji: "⛅", color: "#38bdf8", w: 1, h: 1 },
  store:   { name: "Online Store", emoji: "🛒", color: "#ef4444", w: 2, h: 4 },
  science: { name: "Science Lab", emoji: "🔬", color: "#6366f1", w: 3, h: 3 },
  backup:  { name: "Backups", emoji: "💾", color: "#64748b", w: 5, h: 1 },
  space:   { name: "Space Sim", emoji: "🚀", color: "#0f766e", w: 4, h: 3 },
  calendar: { name: "Calendar", emoji: "📅", color: "#fb7185", shape: ["X.", "XX"] },
  art:      { name: "Art App", emoji: "🎨", color: "#f59e0b", shape: ["X.", "X.", "XX"], dark: true },
  robot:    { name: "Robot Class", emoji: "🤖", color: "#d946ef", shape: ["XXX", ".X."] },
  coding:   { name: "Coding Club", emoji: "💻", color: "#b45309", shape: [".XX", "XX."] },
  sports:   { name: "Sports", emoji: "⚽", color: "#65a30d", shape: [".X.", "XXX", ".X."] },
  library:  { name: "Library", emoji: "📖", color: "#be185d", shape: ["X.X", "XXX"] },
  news:     { name: "News", emoji: "📰", color: "#78716c", shape: ["X..", "X..", "XXX"] },
  puzzle:   { name: "Puzzle Game", emoji: "🧩", color: "#7c3aed", shape: ["XX.", ".X.", ".XX"] },
};

function normalize(cells) {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  const moved = cells.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return {
    cells: moved,
    w: Math.max(...moved.map((c) => c[0])) + 1,
    h: Math.max(...moved.map((c) => c[1])) + 1,
  };
}

function shapeCells(type) {
  const cells = [];
  if (type.shape) {
    type.shape.forEach((row, y) => [...row].forEach((ch, x) => ch === "X" && cells.push([x, y])));
  } else {
    for (let y = 0; y < type.h; y++) for (let x = 0; x < type.w; x++) cells.push([x, y]);
  }
  return normalize(cells);
}

const rotateCells = (cells, h) => normalize(cells.map(([x, y]) => [h - 1 - y, x]));

const state = {
  difficulty: "easy",
  stage: 0,
  servers: [],
  jobs: [],
  results: [],
  won: false,
  broken: [],
  fixedLabel: "",
};

const makeJob = (key) => {
  const { shape, ...type } = JOB_TYPES[key];
  return { id: key, ...type, ...shapeCells(JOB_TYPES[key]), server: null, x: 0, y: 0 };
};
const area = (job) => job.cells.length;
const jobById = (id) => state.jobs.find((j) => j.id === id);
const jobsOn = (s) => state.jobs.filter((j) => j.server === s);
const serversOn = () => state.servers.filter((_, i) => jobsOn(i).length > 0).length;
const allPlaced = () => state.jobs.every((j) => j.server !== null);
const workingServers = () => state.servers.filter((s) => !s.broken).length;
const jobNames = (keys) =>
  keys.map((k) => `<b>${JOB_TYPES[k].name}</b> ${JOB_TYPES[k].emoji}`).join(", ").replace(/, ([^,]*)$/, " and $1");

/* ---------- Level events ---------- */

function resetServers(keys) {
  state.servers = Array.from({ length: SERVER_COUNT }, () => ({ broken: false }));
  state.jobs = keys.map((k, i) => ({ ...makeJob(k), server: i }));
  state.results = [];
  state.broken = [];
}

function addJobs(...keys) {
  state.jobs.push(...keys.map(makeJob));
}

function finishJobs(...keys) {
  state.jobs = state.jobs.filter((j) => !keys.includes(j.id));
}

function breakServers(count) {
  state.broken = [];
  for (let n = 0; n < count; n++) {
    let pick = -1;
    state.servers.forEach((s, i) => {
      if (!s.broken && (pick < 0 || jobsOn(i).length > jobsOn(pick).length)) pick = i;
    });
    state.servers[pick].broken = true;
    jobsOn(pick).forEach((j) => (j.server = null));
    state.broken.push(pick);
  }
}

function repairAll() {
  if (state.broken.length) state.fixedLabel = `${brokenLabel()} ${state.broken.length > 1 ? "ARE" : "IS"} FIXED`;
  state.servers.forEach((s) => (s.broken = false));
  state.broken = [];
}

function brokenLabel() {
  const nums = [...state.broken].sort((a, b) => a - b).map((i) => i + 1);
  return nums.length > 1 ? `SERVERS ${nums.join(" AND ")}` : `SERVER ${nums[0]}`;
}

/* ---------- Level building blocks ---------- */

const WIN = {
  pack: () => ({
    icon: "🎉",
    title: `${state.jobs.length} computers → ${serversOn()} computers!`,
    html: `<p>Awesome packing! This is the big idea behind <b>virtualization</b>:</p>
           <p class="big-idea">One physical computer can act like several separate computers.</p>
           <p>So we don't need a separate machine for every job. Fewer machines means less hardware to build and less energy used. 🌱</p>`,
  }),
  add: {
    icon: "🌟",
    title: "No new server needed!",
    html: `<p>You used empty space on servers that were <b>already on</b>.</p>
           <p>Using what we already have, instead of buying and powering more machines, is called <b>green computing</b>. ♻️</p>`,
  },
  addOne: {
    icon: "🧩",
    title: "Just one more server!",
    html: `<p>Sometimes there really are too many jobs for the servers that are on.</p>
           <p>Smart packers turn on <b>just one more</b> server, not a new one for every job. ⚡</p>`,
  },
  broken: {
    icon: "🛟",
    title: "Rescue complete!",
    html: `<p>When a physical server breaks, virtualization lets us <b>move its jobs</b> to other servers.</p>
           <p>Everything kept running, you fit in the new jobs too, and nobody even noticed!</p>`,
  },
  night: {
    icon: "🌙",
    title: "Lights out!",
    html: `<p>When fewer people are online, data centers slide the jobs together and <b>turn empty servers off</b>.</p>
           <p>That saves a lot of energy every single night! 💤</p>`,
  },
  rush: {
    icon: "☀️",
    title: "Rush hour handled!",
    html: `<p>Everyone went online at once, and you still kept the servers packed tight.</p>
           <p>Every server you <b>didn't</b> turn on is energy saved. 🌍</p>`,
  },
};

const intro = (keys) => ({
  short: "1 Job = 1 PC",
  title: "One Job, One Computer",
  text: `Right now, every job has its <b>own</b> computer. That's <b>${keys.length} jobs = ${keys.length} computers</b>, all plugged in and using energy ⚡.<br>
         But look closely... each computer is only using a <b>little bit</b> of its space!`,
  locked: true,
  next: "What if we combine them? →",
  setup: () => resetServers(keys),
});

const pack = (target, hint) => ({
  short: "Pack It",
  title: "Pack the Servers",
  text: `Move the jobs so they <b>share</b> servers. Can you fit all of them onto just <b>${target} servers</b>?
         Empty servers go to sleep 💤 and stop using energy.`,
  target,
  hint,
  win: WIN.pack,
});

const newJobs = (keys, target, hint, extraServer) => ({
  short: "New Job",
  title: keys.length > 1 ? "New Jobs Arrive" : "A New Job Arrives",
  text: extraServer
    ? `Too many jobs! Add ${jobNames(keys)} using only <b>${target} servers</b>. That's just one more.`
    : `Add ${jobNames(keys)} to servers that are already on. Keep it at <b>${target} servers</b>!`,
  card: () => ({
    icon: "📈",
    title: keys.length > 1 ? "NEW JOBS!" : "NEW JOB!",
    html: extraServer
      ? `<p>${jobNames(keys)} just arrived!</p>
         <p>They won't all fit on the servers that are on. Can you add them by turning on <b>only one more</b> server?</p>`
      : `<p>${jobNames(keys)} just arrived!</p>
         <p>Add ${keys.length > 1 ? "them" : "it"} <b>without</b> turning on another server, if you can.</p>`,
    color: "#2563eb",
  }),
  setup: () => addJobs(...keys),
  target,
  hint,
  win: extraServer ? WIN.addOne : WIN.add,
});

const serverDown = (count, target, hint, addKeys = [], name = count > 1 ? "Double Trouble" : "Server Down") => ({
  short: name,
  title: name + "!",
  text: `Move the jobs from the broken server${count > 1 ? "s" : ""} onto ones that still work${addKeys.length ? `, and fit in ${jobNames(addKeys)}` : ""}. Can you use only <b>${target} servers</b>?`,
  card: () => ({
    icon: "⚠️",
    title: `${brokenLabel()} ${count > 1 ? "ARE" : "IS"} BROKEN!`,
    html: `<p>Oh no! Move all of ${count > 1 ? "their" : "its"} jobs onto the remaining servers so nothing stops working.</p>` +
      (addKeys.length ? `<p>And at the same time, ${jobNames(addKeys)} just arrived! 😱</p>` : ""),
    color: "#dc2626",
  }),
  setup() {
    breakServers(count);
    addJobs(...addKeys);
  },
  target,
  hint,
  win: WIN.broken,
});

const nightTime = (keys, target, hint) => ({
  short: "Night Time",
  title: "Night Time",
  text: `Some jobs are finished for the day. Slide the rest together and turn servers off. Get down to <b>${target} servers</b>!`,
  card: () => ({
    icon: "🌙",
    title: "NIGHT TIME!",
    html: `<p>Everyone is going to bed. ${jobNames(keys)} ${keys.length > 1 ? "are" : "is"} done for today and ${keys.length > 1 ? "have" : "has"} been shut down.</p>
           <p>Now lots of servers are only a little bit full. Can you pack the rest together and turn servers <b>off</b>?</p>`,
    color: "#1e3a8a",
  }),
  setup: () => finishJobs(...keys),
  target,
  hint,
  win: WIN.night,
});

const rushHour = (keys, target, hint) => ({
  short: "Rush Hour",
  title: "Rush Hour!",
  text: `Everyone is online! Fit all <b>${keys.length} new jobs</b> in, using only <b>${target} servers</b>. This one is tricky!`,
  card: () => ({
    icon: "🚀",
    title: state.fixedLabel ? `${state.fixedLabel}... AND MORE JOBS!` : "RUSH HOUR!",
    html: `<p>${jobNames(keys)} all need a home!</p>
           <p>You could turn on lots of servers... but can you squeeze everything onto just <b>${target}</b>?</p>`,
    color: "#7c3aed",
  }),
  setup() {
    repairAll();
    addJobs(...keys);
  },
  target,
  hint,
  win: WIN.rush,
});

/* ---------- Difficulties ---------- */

const DIFFICULTIES = {
  easy: {
    label: "Easy",
    icon: "🟢",
    grid: 4,
    servers: 4,
    shapes: "simple blocks",
    stages: [
      intro(["website", "game", "school", "music"]),
      pack(2, "Start with the biggest jobs (Game and Music). Put them on different servers, then fill the gaps with the smaller jobs."),
      newJobs(["video"], 2, "Look for an empty 2×2 space on a server that is already ON. You might need to slide a job over to make room."),
      serverDown(1, 2, "Tap Music to stand it up. Game and Music standing side by side fill the top of one server, and School Files lies flat under them. Website and Video Chat go side by side on the other server, with Photos lying underneath.", ["photos"]),
      rushHour(["email", "movies"], 2, "Every single square gets used! Server A: Game and Music standing up, with Movies along the bottom. Server B: Website and Video Chat on top, then School Files and Photos lying flat, with Email standing up in the corner."),
    ],
  },
  medium: {
    label: "Medium",
    icon: "🟡",
    grid: 4,
    servers: 5,
    shapes: "+ L & T shapes",
    stages: [
      intro(["website", "game", "school", "music", "art"]),
      pack(2, "Game and Music standing up side by side fill the top 3 rows of a server. School Files lies along the bottom. Website and Art App share the other server."),
      newJobs(["video", "store", "robot"], 3, "Online Store and Game fit together on one server. Music, Website, and Art App share another. Video Chat, Robot Class, and School Files share the third.", true),
      serverDown(1, 3, "Server A: Online Store, Website, and Video Chat (completely full!). Server B: Game and Music standing up, School Files underneath. Server C: the bendy shapes (Robot Class, Coding Club, Calendar, and Art App) fit together like a puzzle.", ["calendar", "coding"]),
      nightTime(["game", "store", "video"], 2, "Music, Website, and Art App share one server. Robot Class, School Files, Coding Club, and Calendar share the other."),
      rushHour(["game", "email", "movies", "maps"], 3, "Game and Music standing up, with Movies along the bottom, make one perfect server. Website, Art App, Calendar, School Files, and Email fill a second one. The rest share the third."),
      serverDown(1, 3, "Only 2 empty squares in the whole data center! Keep Game, Music, and Movies together. Photos and Chat fit in the gaps next to Robot Class, Coding Club, and Maps.", ["photos", "chat"], "Final Crash"),
    ],
  },
  hard: {
    label: "Hard",
    icon: "🔴",
    grid: 5,
    servers: 5,
    shapes: "+ tricky shapes",
    stages: [
      intro(["science", "store", "sports", "library", "news"]),
      pack(2, "Science Lab and Online Store (standing up) fit side by side at the top of one server. Library fits underneath."),
      newJobs(["music", "robot", "coding"], 2, "Server A: Science Lab and Online Store side by side, with Music lying flat under the Science Lab. Server B: all the bendy shapes (Sports, News, Robot Class, Coding Club, and Library) fit together like a puzzle."),
      serverDown(1, 2, "Only 2 empty squares allowed! Use the packing from the last level. Chat and Weather fit in the last two squares next to Music.", ["chat", "weather"]),
      newJobs(["backup", "photos", "email", "puzzle"], 3, "Backups fills a whole row. Put it along the bottom of the server with Sports and News. Puzzle Game, Robot Class, and Coding Club can share the new server.", true),
      nightTime(["science", "store", "music"], 2, "Sports, News, Library, Photos, Chat, Weather, and Backups all fit on one server. Puzzle Game, Robot Class, Coding Club, and Email share the other."),
      rushHour(["space", "game", "maps", "art"], 3, "Put Space Sim in a corner with Game lying flat under it and Backups standing up along the side. Email fits in the last gap. A perfect server!"),
      serverDown(2, 3, "Only 4 empty squares in the whole data center! Keep Space Sim, Game, Backups, and Email together. Calendar and Website squeeze in with Puzzle Game, Coding Club, Art App, and Photos.", ["calendar", "website"]),
    ],
  },
};

let STAGES = DIFFICULTIES.easy.stages;

/* ---------- Helpers ---------- */

const $ = (sel) => document.querySelector(sel);

function el(tag, className, html) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function canPlace(job, s, x, y, shape = job) {
  if (s === null || state.servers[s].broken) return false;
  if (x < 0 || y < 0 || x + shape.w > GRID || y + shape.h > GRID) return false;
  const taken = new Set();
  jobsOn(s).forEach((o) => o !== job && o.cells.forEach(([cx, cy]) => taken.add(`${o.x + cx},${o.y + cy}`)));
  return shape.cells.every(([cx, cy]) => !taken.has(`${x + cx},${y + cy}`));
}

function findSpot(job, s, shape) {
  for (let y = 0; y <= GRID - shape.h; y++)
    for (let x = 0; x <= GRID - shape.w; x++)
      if (canPlace(job, s, x, y, shape)) return { x, y };
  return null;
}

/* ---------- Rendering ---------- */

function pieceEl(job, onGrid, size = onGrid ? CELL : TRAY_CELL) {
  const st = size + GAP;
  const span = (n) => n * size + (n - 1) * GAP;
  const small = size < 36;
  const p = el("div", "piece" + (job.dark ? " dark-text" : "") + (STAGES[state.stage].locked ? " locked" : ""));
  p.dataset.id = job.id;
  p.dataset.size = size;
  p.style.width = span(job.w) + "px";
  p.style.height = span(job.h) + "px";
  p.style.fontSize = Math.max(small ? 11 : 10, size * 0.27) + "px";
  if (onGrid) {
    p.style.left = PAD + job.x * step() + "px";
    p.style.top = PAD + job.y * step() + "px";
  }

  const has = new Set(job.cells.map(([x, y]) => `${x},${y}`));
  const r = Math.round(size * 0.16) + "px";
  job.cells.forEach(([x, y]) => {
    const right = has.has(`${x + 1},${y}`), down = has.has(`${x},${y + 1}`);
    const left = has.has(`${x - 1},${y}`), up = has.has(`${x},${y - 1}`);
    const c = el("div", "pcell");
    c.style.left = x * st + "px";
    c.style.top = y * st + "px";
    c.style.width = size + (right ? GAP : 0) + "px";
    c.style.height = size + (down ? GAP : 0) + "px";
    c.style.background = job.color;
    c.style.borderRadius = [!up && !left, !up && !right, !down && !right, !down && !left].map((round) => (round ? r : "0")).join(" ");
    p.append(c);
  });

  const n = area(job);
  const isRect = n === job.w * job.h;
  const label = el("div", isRect ? "plabel" : "plabel compact");
  if (isRect) {
    Object.assign(label.style, { left: 0, top: 0, width: span(job.w) + "px", height: span(job.h) + "px" });
  } else {
    const [ax, ay] = job.cells.reduce((best, c) =>
      Math.hypot(c[0] + 0.5 - job.w / 2, c[1] + 0.5 - job.h / 2) < Math.hypot(best[0] + 0.5 - job.w / 2, best[1] + 0.5 - job.h / 2) ? c : best);
    Object.assign(label.style, { left: ax * st + "px", top: ay * st + "px", width: size + "px", height: size + "px" });
  }
  const showName = small ? isRect && job.w > 1 && job.h > 1 : isRect ? job.w > 1 || job.h > 2 : true;
  label.innerHTML = `<span class="emoji">${job.emoji}</span>` +
    (showName ? `<span class="label">${job.name}</span>` : "") +
    (isRect && n > 1 && !small ? `<span class="size">${n} squares</span>` : "");
  p.append(label);
  p.title = `${job.name}: ${n} square${n > 1 ? "s" : ""}`;
  return p;
}

function renderServers() {
  const dc = $("#datacenter");
  dc.innerHTML = "";
  state.servers.forEach((srv, i) => {
    const jobs = jobsOn(i);
    const on = jobs.length > 0;
    const used = jobs.reduce((n, j) => n + area(j), 0);
    const status = srv.broken ? "⚠️ BROKEN" : on ? "⚡ ON" : "💤 OFF";

    const card = el("div", "server " + (srv.broken ? "broken" : on ? "on" : "off"));
    card.append(el("div", "server-head",
      `<span class="leds"><i></i><i></i><i></i></span><span class="name">Server ${i + 1}</span><span class="status">${status}</span>`));

    const grid = el("div", "grid");
    grid.dataset.server = i;
    grid.style.width = grid.style.height = gridPx() + "px";
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const c = el("div", "cell");
        c.dataset.x = x;
        c.dataset.y = y;
        c.style.left = PAD + x * step() + "px";
        c.style.top = PAD + y * step() + "px";
        c.style.width = c.style.height = CELL + "px";
        grid.append(c);
      }
    }
    jobs.forEach((j) => grid.append(pieceEl(j, true)));
    if (srv.broken) {
      const mark = el("div", "broken-mark", "⚠️");
      mark.style.fontSize = CELL * 1.2 + "px";
      grid.append(mark);
    }
    card.append(grid);

    const foot = srv.broken ? "Out of order!" : on ? `${used} of ${GRID * GRID} squares used` : "Sleeping, no energy used 🌱";
    card.append(el("div", "server-foot", foot));
    dc.append(card);
  });
}

function renderTray() {
  const tray = $("#tray");
  tray.innerHTML = "";
  const waiting = state.jobs.filter((j) => j.server === null);
  if (!waiting.length) tray.append(el("span", "empty", "All jobs are running! ✅"));
  waiting.forEach((j) => tray.append(pieceEl(j, false)));
}

function renderStats() {
  const stage = STAGES[state.stage];
  const on = serversOn();
  $("#serversOn").textContent = on;
  $("#serversOff").textContent = workingServers() - on;

  const pct = (on / SERVER_COUNT) * 100;
  const fill = $("#meterFill");
  fill.style.width = pct + "%";
  fill.style.background = pct <= 50 ? "#22c55e" : pct < 80 ? "#f59e0b" : "#ef4444";
  $("#energyText").textContent = `${on} of ${SERVER_COUNT} servers`;

  const goal = $("#goalText");
  goal.className = "stat-sub";
  if (!stage.target) {
    goal.textContent = "1 point per server. Fewer is better!";
  } else if (!allPlaced()) {
    const left = state.jobs.filter((j) => j.server === null).length;
    goal.textContent = `🎯 Goal: ${stage.target} servers · ${left} job${left > 1 ? "s" : ""} waiting`;
  } else if (on <= stage.target) {
    goal.textContent = "🎯 Goal reached!";
    goal.classList.add("good");
  } else {
    goal.textContent = `All jobs running! Can you get down to ${stage.target}?`;
    goal.classList.add("warn");
  }

  const skip = $("#skipBtn");
  skip.hidden = !stage.target || state.won || !allPlaced() || on <= stage.target;
  skip.textContent = `Move on with ${on} servers →`;
}

function renderStory() {
  const stage = STAGES[state.stage];
  const diff = DIFFICULTIES[state.difficulty];
  $("#stageTitle").textContent = `Level ${state.stage + 1}: ${stage.title}`;
  $("#stageText").innerHTML = stage.text;
  $("#hintBtn").hidden = !stage.hint;
  const next = $("#nextBtn");
  next.hidden = !stage.next;
  next.textContent = stage.next || "";
  $("#diffBadge").textContent = `${diff.icon} ${diff.label}`;

  const prog = $("#progress");
  prog.innerHTML = "";
  STAGES.forEach((s, i) => {
    const cls = i < state.stage ? "done" : i === state.stage ? "current" : "";
    prog.append(el("span", "dot " + cls, (i < state.stage ? "✓ " : "") + s.short));
  });
}

function render() {
  renderServers();
  renderTray();
  renderStats();
}

/* ---------- Overlay cards ---------- */

function showCard({ icon, title, html, button, color, onClick, buttons }) {
  const card = $("#card");
  card.style.borderTopColor = color || "#16a34a";
  card.innerHTML = `<div class="icon">${icon}</div><h2>${title}</h2>${html}`;
  const row = el("div", "card-buttons");
  (buttons || [{ label: button, onClick }]).forEach((b) => {
    const btn = el("button", "btn " + (b.cls || "primary"), b.label);
    btn.onclick = () => {
      $("#overlay").hidden = true;
      b.onClick && b.onClick();
    };
    row.append(btn);
  });
  card.append(row);
  $("#overlay").hidden = false;
  row.querySelector("button").focus();
}

function showWelcome() {
  showCard({
    icon: "🖥️",
    title: "Pack the Servers!",
    html: `<p>Every server is a grid of squares. Every computer job takes up some squares.</p>
           <ul>
             <li>🖥️ Each server that is ON = <b>1 point</b></li>
             <li>🎯 Goal: use the <b>fewest</b> servers</li>
             <li>🌱 Fewer servers = less hardware and less energy!</li>
           </ul>
           <p>👆 Drag jobs to move them. Tap a job to turn it sideways.</p>
           <p><b>Pick your level:</b></p>`,
    buttons: Object.entries(DIFFICULTIES).map(([key, d]) => ({
      label: `${d.icon} ${d.label}<small>${d.grid}×${d.grid} servers<br>${d.stages.length} levels<br>${d.shapes}</small>`,
      cls: "diff diff-" + key,
      onClick: () => startGame(key),
    })),
  });
}

function showFinal() {
  const rows = STAGES.map((s, i) => [s, state.results[i], i]).filter(([s]) => s.target);
  const total = rows.reduce((n, [, r]) => n + r, 0);
  const best = rows.reduce((n, [s]) => n + s.target, 0);
  const table = rows.map(([s, r, i]) =>
    `<tr><td>Level ${i + 1}: ${s.title}</td><td>🖥️ ${r}${r <= s.target ? " ⭐" : ` <small>(best ${s.target})</small>`}</td></tr>`).join("");
  const keys = Object.keys(DIFFICULTIES);
  const harder = keys[keys.indexOf(state.difficulty) + 1];
  const buttons = [{ label: "Play again 🔁", cls: harder ? "soft" : "primary", onClick: () => startGame(state.difficulty) }];
  if (harder) {
    const d = DIFFICULTIES[harder];
    buttons.push({ label: `Try ${d.label} ${d.icon} →`, onClick: () => startGame(harder) });
  }
  const perfect = total <= best;
  showCard({
    icon: perfect ? "🏆" : "🎉",
    title: `${DIFFICULTIES[state.difficulty].label} Complete!${perfect ? " Green Data Center Hero!" : ""}`,
    html: `<table>${table}<tr class="total"><td>Total points</td><td>${total}</td></tr></table>
           <p>${perfect ? "That's the <b>best possible score</b>! 🌟" : `The best possible score is <b>${best}</b>. Play again and try to earn a ⭐ on every level!`}</p>
           <p class="big-idea">Without packing, ${state.jobs.length} jobs would need ${state.jobs.length} computers. You ran them all on just ${serversOn()}! 🌍</p>
           <p>That's what virtualization does in real data centers: less hardware, less energy, same jobs done.</p>`,
    buttons,
  });
}

/* ---------- Game flow ---------- */

function startGame(difficulty) {
  const d = DIFFICULTIES[difficulty];
  state.difficulty = difficulty;
  GRID = d.grid;
  SERVER_COUNT = d.servers;
  STAGES = d.stages;
  state.fixedLabel = "";
  startStage(0);
}

function startStage(i) {
  state.stage = i;
  state.won = false;
  $("#hintText").hidden = true;
  const stage = STAGES[i];
  stage.setup && stage.setup();
  renderStory();
  renderStats();
  fitCellSize();
  render();
  if (stage.card) showCard({ ...stage.card(), button: "Got it! 👍" });
}

function checkWin() {
  const stage = STAGES[state.stage];
  if (!stage.target || state.won || !allPlaced() || serversOn() > stage.target) return;
  state.won = true;
  state.results[state.stage] = serversOn();
  renderStats();
  const last = state.stage === STAGES.length - 1;
  const win = typeof stage.win === "function" ? stage.win() : stage.win;
  setTimeout(() => {
    if (last) return showFinal();
    showCard({ ...win, button: "Next challenge →", onClick: () => startStage(state.stage + 1) });
  }, 500);
}

function moveOn() {
  const stage = STAGES[state.stage];
  const used = serversOn();
  const last = state.stage === STAGES.length - 1;
  state.won = true;
  state.results[state.stage] = used;
  renderStats();
  showCard({
    icon: "👍",
    title: `All jobs running on ${used} servers!`,
    html: `<p>Nice work getting every job running.</p>
           <p>The fewest possible was <b>${stage.target} servers</b>. Each extra server that's on uses more energy ⚡, so try for fewer next time!</p>`,
    color: "#2563eb",
    buttons: [
      {
        label: "Keep trying 🔁",
        cls: "soft",
        onClick() {
          state.won = false;
          delete state.results[state.stage];
          renderStats();
        },
      },
      {
        label: last ? "See my score 🏆" : "Next challenge →",
        onClick: () => (last ? showFinal() : startStage(state.stage + 1)),
      },
    ],
  });
}

function shake(id) {
  const p = document.querySelector(`.piece[data-id="${id}"]`);
  if (!p) return;
  p.classList.remove("shake");
  void p.offsetWidth;
  p.classList.add("shake");
}

function rotate(job) {
  const turned = rotateCells(job.cells, job.h);
  if (JSON.stringify(turned.cells) === JSON.stringify(job.cells)) return shake(job.id);
  if (job.server === null || canPlace(job, job.server, job.x, job.y, turned)) {
    Object.assign(job, turned);
  } else {
    const spot = findSpot(job, job.server, turned);
    if (!spot) return shake(job.id);
    Object.assign(job, turned, spot);
  }
  render();
  checkWin();
}

/* ---------- Drag and drop ---------- */

let drag = null;

function dropTarget(e) {
  const job = jobById(drag.id);
  const gx = e.clientX - drag.offX;
  const gy = e.clientY - drag.offY;
  for (const g of document.querySelectorAll(".grid")) {
    const r = g.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue;
    const s = +g.dataset.server;
    const x = Math.round((gx - r.left - PAD) / step());
    const y = Math.round((gy - r.top - PAD) / step());
    return { type: "server", s, x, y, grid: g, ok: canPlace(job, s, x, y) };
  }
  const tr = $("#tray").getBoundingClientRect();
  if (e.clientX >= tr.left && e.clientX <= tr.right && e.clientY >= tr.top && e.clientY <= tr.bottom) {
    return { type: "tray" };
  }
  return { type: "none" };
}

function clearPreview() {
  document.querySelectorAll(".cell.ok, .cell.bad").forEach((c) => c.classList.remove("ok", "bad"));
  $("#tray").classList.remove("drop-hover");
}

function showPreview(t) {
  clearPreview();
  if (t.type === "tray") return $("#tray").classList.add("drop-hover");
  if (t.type !== "server") return;
  const job = jobById(drag.id);
  const cls = t.ok ? "ok" : "bad";
  job.cells.forEach(([cx, cy]) => {
    const c = t.grid.querySelector(`.cell[data-x="${t.x + cx}"][data-y="${t.y + cy}"]`);
    if (c) c.classList.add(cls);
  });
}

function onPointerDown(e) {
  const p = e.target.closest(".piece");
  if (!p || STAGES[state.stage].locked || e.button > 0) return;
  e.preventDefault();
  const r = p.getBoundingClientRect();
  const scale = step() / (+p.dataset.size + GAP);
  drag = {
    id: p.dataset.id,
    el: p,
    startX: e.clientX,
    startY: e.clientY,
    offX: (e.clientX - r.left) * scale,
    offY: (e.clientY - r.top) * scale,
    active: false,
    ghost: null,
  };
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerCancel);
}

function onPointerMove(e) {
  if (!drag) return;
  if (!drag.active) {
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
    drag.active = true;
    drag.ghost = pieceEl(jobById(drag.id), false, CELL);
    drag.ghost.classList.add("ghost");
    document.body.append(drag.ghost);
    drag.el.classList.add("lifted");
  }
  drag.ghost.style.left = e.clientX - drag.offX + "px";
  drag.ghost.style.top = e.clientY - drag.offY + "px";
  showPreview(dropTarget(e));
}

function endDrag() {
  document.removeEventListener("pointermove", onPointerMove);
  document.removeEventListener("pointerup", onPointerUp);
  document.removeEventListener("pointercancel", onPointerCancel);
  if (drag && drag.ghost) drag.ghost.remove();
  clearPreview();
}

function onPointerUp(e) {
  const d = drag;
  const job = jobById(d.id);
  if (!d.active) {
    endDrag();
    drag = null;
    return rotate(job);
  }
  const t = dropTarget(e);
  endDrag();
  drag = null;
  if (t.type === "server" && t.ok) {
    Object.assign(job, { server: t.s, x: t.x, y: t.y });
  } else if (t.type === "tray") {
    job.server = null;
  }
  render();
  if (t.type === "server" && !t.ok) shake(job.id);
  checkWin();
}

function onPointerCancel() {
  endDrag();
  drag = null;
  render();
}

/* ---------- Setup ---------- */

const DC_GAP = 10;
const SERVER_PAD = 8;
const SERVER_CHROME_H = 2 * SERVER_PAD + 28 + 22;
const TRAY_CHROME_H = 78;

function fitCellSize() {
  const main = $("main");
  const cs = getComputedStyle(main);
  const scrollbarRoom = 18;
  const width = main.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - scrollbarRoom;
  const top = $("#datacenter").getBoundingClientRect().top + window.scrollY;
  const gridExtra = 2 * PAD + (GRID - 1) * GAP;
  const tallest = Math.max(2, ...state.jobs.map((j) => j.h));

  const fit = (trayCell) => {
    const trayH = TRAY_CHROME_H + tallest * (trayCell + GAP);
    const availH = window.innerHeight - top - trayH - 8;
    const options = [1, 2, 3].map((rows) => {
      const perRow = Math.ceil(SERVER_COUNT / rows);
      const byWidth = ((width - (perRow - 1) * DC_GAP) / perRow - gridExtra - 2 * SERVER_PAD) / GRID;
      const byHeight = ((availH - (rows - 1) * DC_GAP) / rows - SERVER_CHROME_H - gridExtra) / GRID;
      return { fits: Math.min(byWidth, byHeight, 64), noHeight: Math.min(byWidth, 48) };
    });
    const best = Math.max(...options.map((o) => o.fits));
    if (best < 26) return Math.max(...options.map((o) => o.noHeight));
    return options.find((o) => o.fits >= best * 0.8).fits;
  };

  let cell = fit(TRAY_CELL);
  const tray = Math.round(Math.min(32, Math.max(22, cell * 0.62)));
  cell = Math.floor(Math.min(64, Math.max(26, fit(tray))));
  const changed = cell !== CELL || tray !== TRAY_CELL;
  CELL = cell;
  TRAY_CELL = tray;
  return changed;
}

document.addEventListener("pointerdown", onPointerDown);

$("#nextBtn").addEventListener("click", () => startStage(state.stage + 1));
$("#skipBtn").addEventListener("click", moveOn);
$("#hintBtn").addEventListener("click", () => {
  const h = $("#hintText");
  h.innerHTML = "💡 " + STAGES[state.stage].hint;
  h.hidden = !h.hidden;
  if (fitCellSize()) render();
});
$("#menuBtn").addEventListener("click", showWelcome);

window.addEventListener("resize", () => {
  if (fitCellSize() && !drag) render();
});

startGame("easy");
showWelcome();
