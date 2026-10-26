// script.js
//
// One long scrolling page. Clicking a skill card runs one self-contained demo
// inside the demo panel. Each demo is its own function, so you can read, edit,
// or replace just one without touching the others.

const demoPanel = document.getElementById("demoPanel");
const demoBody = document.getElementById("demoBody");
const demoTitle = document.getElementById("demoTitle");
const closeDemo = document.getElementById("closeDemo");

// Every time a demo starts (or the panel closes) this number goes up.
// Old animations check it and stop themselves, so demos never overlap.
let demoToken = 0;

// ---------- Dark / light theme toggle ----------
// The saved theme is applied by a tiny script in <head> (no flash).
// This part only handles the button.

const THEME_KEY = "digital-resume:theme";
const root = document.documentElement;
const themeToggle = document.getElementById("themeToggle");

function applyTheme(theme) {
  root.dataset.theme = theme;
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
}

applyTheme(root.dataset.theme === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (err) {
    console.error("Could not save theme:", err);
  }
});

// ---------- Save as PDF ----------
// window.print() opens the browser's print dialog, and "Save as PDF" is a
// built-in destination. The @media print rules in style.css shape the result.

document.querySelectorAll("[data-print]").forEach((btn) => {
  btn.addEventListener("click", () => window.print());
});

// ---------- Contact form ----------
// No backend, so "sending" opens the visitor's email app with everything
// pre-filled via a mailto: link. (See the README for a Formspree alternative.)

const contactForm = document.getElementById("contactForm");
const formNote = document.getElementById("formNote");

contactForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("cfName").value.trim();
  const email = document.getElementById("cfEmail").value.trim();
  const message = document.getElementById("cfMessage").value.trim();
  const to = contactForm.dataset.to;

  const subject = encodeURIComponent(`Message from ${name} (via CV site)`);
  const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);

  window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  formNote.textContent = "Your email app should be open now. Press send there to finish. No email app? Use the Copy email button.";
});

// ---------- Skill level dots ----------
// Each .skill-level in index.html has data-level="1-5" and a text label.
// Edit those two things in the HTML as you improve.

document.querySelectorAll(".skill-level").forEach((el) => {
  const pct = (Number(el.dataset.level) || 0) * 20;
  const bar = document.createElement("span");
  bar.className = "bar";
  bar.setAttribute("aria-hidden", "true");
  bar.innerHTML = `<i class="fill" style="--w:${pct}%"></i>`;
  el.append(bar);
});

// ---------- Live GitHub stats ----------
// GitHub's public API, no login needed (~60 requests/hour per visitor).
// Change data-username on #githubStats in index.html if your username changes.

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

async function loadGitHubStats() {
  const section = document.getElementById("githubStats");
  const status = document.getElementById("githubStatus");
  const grid = document.getElementById("githubGrid");
  const skeleton = document.getElementById("githubSkeleton");
  const username = section.dataset.username;

  try {
    const userRes = await fetch(`https://api.github.com/users/${username}`);
    if (!userRes.ok) throw new Error(`User fetch failed: ${userRes.status}`);
    const user = await userRes.json();

    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=1`
    );
    const repos = reposRes.ok ? await reposRes.json() : [];
    const latestRepo = repos[0];

    grid.innerHTML = `
      <div class="github-stat">
        <span class="github-stat-value">${escapeHtml(user.public_repos)}</span>
        <span class="github-stat-label">Public repos</span>
      </div>
      <div class="github-stat">
        <span class="github-stat-value">${escapeHtml(user.followers)}</span>
        <span class="github-stat-label">Followers</span>
      </div>
      <div class="github-stat">
        <span class="github-stat-value">${latestRepo ? escapeHtml(latestRepo.name) : "—"}</span>
        <span class="github-stat-label">Latest repo</span>
      </div>
    `;

    status.textContent = `@${username} on GitHub since ${new Date(user.created_at).getFullYear()}.`;
    skeleton.hidden = true;
    grid.hidden = false;
  } catch (err) {
    // Don't show an error on a public resume: hide the whole card instead.
    skeleton.hidden = true;
    section.hidden = true;
    console.error("GitHub stats failed:", err);
  }
}

loadGitHubStats();

// ---------- Easter egg ----------
// Type "khin" anywhere on the page (not while typing in the contact form).

let typedBuffer = "";
const secretWord = "khin";

const easterToast = document.createElement("div");
easterToast.className = "easter-toast";
easterToast.setAttribute("role", "status");
easterToast.textContent = "🎉 Nakita mo ang lihim! Salamat sa pagbisita.";
document.body.appendChild(easterToast);

window.addEventListener("keydown", (e) => {
  if (e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target && e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  typedBuffer = (typedBuffer + e.key.toLowerCase()).slice(-secretWord.length);

  if (typedBuffer === secretWord) {
    easterToast.classList.add("show");
    setTimeout(() => easterToast.classList.remove("show"), 3200);
  }
});

// ---------- Skill demos ----------

const demoRunners = {
  html: runHtmlDemo,
  css: runCssDemo,
  js: runJsDemo,
  responsive: runResponsiveDemo,
  git: runGitDemo,
  sort: runSortDemo,
};

const skillLabels = {
  html: "HTML",
  css: "CSS Animation — watch it run",
  js: "JavaScript — try it yourself",
  responsive: "Responsive Design — drag the slider",
  git: "Git & GitHub — my real commits",
  sort: "Problem Solving — bubble sort in action",
};

document.getElementById("skillsGrid").addEventListener("click", (e) => {
  const item = e.target.closest(".skill-card");
  if (!item) return;

  document.querySelectorAll(".skill-card").forEach((el) => el.classList.remove("active"));
  item.classList.add("active");

  const token = ++demoToken;
  demoPanel.hidden = false;
  demoTitle.textContent = skillLabels[item.dataset.skill] || "Try it";
  demoBody.innerHTML = "";

  const runner = demoRunners[item.dataset.skill];
  if (runner) runner(token);

  demoPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

closeDemo.addEventListener("click", () => {
  demoToken++; // stops any animation that is still running
  demoPanel.hidden = true;
  document.querySelectorAll(".skill-card").forEach((el) => el.classList.remove("active"));
});

// Types text into an element one character at a time (HTML and Git demos).
function typeLines(container, lines, lineClass = "term-line", speed = 18, token = demoToken) {
  let lineIndex = 0;

  function typeNextLine() {
    if (token !== demoToken || lineIndex >= lines.length) return;

    const p = document.createElement("p");
    p.className = lineClass;
    container.appendChild(p);

    const text = lines[lineIndex];
    let charIndex = 0;

    const interval = setInterval(() => {
      if (token !== demoToken) {
        clearInterval(interval);
        return;
      }
      charIndex++;
      p.textContent = text.slice(0, charIndex);
      if (charIndex >= text.length) {
        clearInterval(interval);
        lineIndex++;
        setTimeout(typeNextLine, 150);
      }
    }, speed);
  }

  typeNextLine();
}

// --- HTML demo: types out a small nested markup snippet ---
function runHtmlDemo(token) {
  const lines = [
    "<section class=\"card\">",
    "  <h2>Hello, recruiter!</h2>",
    "  <p>Semantic markup, done on purpose.</p>",
    "</section>",
  ];
  typeLines(demoBody, lines, "term-line", 14, token);
}

// --- CSS demo: plays a small keyframe animation on a box ---
function runCssDemo() {
  const box = document.createElement("div");
  box.className = "demo-box";
  demoBody.appendChild(box);

  const note = document.createElement("p");
  note.className = "term-line dim";
  note.textContent = "// @keyframes: move + rotate + color + border-radius shift";
  demoBody.appendChild(note);

  requestAnimationFrame(() => box.classList.add("animating"));
}

// --- JavaScript demo: a genuinely interactive counter ---
function runJsDemo() {
  let count = 0;

  const row = document.createElement("div");
  row.className = "counter-row";
  row.innerHTML = `
    <button class="counter-btn" id="decBtn" type="button" aria-label="Decrease">−</button>
    <span class="counter-value" id="countValue" aria-live="polite">0</span>
    <button class="counter-btn" id="incBtn" type="button" aria-label="Increase">+</button>
  `;
  demoBody.appendChild(row);

  const note = document.createElement("p");
  note.className = "term-line dim";
  note.style.marginTop = "0.9rem";
  note.textContent = "// real event listeners, real state. Try clicking.";
  demoBody.appendChild(note);

  const countValue = row.querySelector("#countValue");
  row.querySelector("#incBtn").addEventListener("click", () => {
    count++;
    countValue.textContent = count;
  });
  row.querySelector("#decBtn").addEventListener("click", () => {
    count--;
    countValue.textContent = count;
  });
}

// --- Responsive demo: a slider that resizes a preview, showing reflow ---
function runResponsiveDemo() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <input type="range" class="frame-slider" id="frameSlider" min="220" max="600" value="600" aria-label="Preview width">
    <div class="frame-preview" id="framePreview" style="width: 600px;">
      <div class="frame-card">Card A</div>
      <div class="frame-card">Card B</div>
      <div class="frame-card">Card C</div>
    </div>
    <p class="term-line dim" style="margin-top:0.9rem;">// drag to shrink the viewport. Flexbox reflows automatically.</p>
  `;
  demoBody.appendChild(wrap);

  const slider = wrap.querySelector("#frameSlider");
  const preview = wrap.querySelector("#framePreview");
  slider.addEventListener("input", () => {
    preview.style.width = `${slider.value}px`;
  });
}

// --- Git demo: shows the latest real commits from this site's repo ---
// Falls back to a clearly-labelled sample if GitHub can't be reached.
async function runGitDemo(token) {
  const loading = document.createElement("p");
  loading.className = "term-line dim";
  loading.textContent = "Fetching my latest commits from GitHub…";
  demoBody.appendChild(loading);

  const username = document.getElementById("githubStats").dataset.username;
  let commits = null;

  try {
    const res = await fetch(`https://api.github.com/repos/${username}/Digital-Resume/commits?per_page=4`);
    if (!res.ok) throw new Error(`Commits fetch failed: ${res.status}`);
    const data = await res.json();
    commits = data.map((c) => `${c.sha.slice(0, 7)} ${c.commit.message.split("\n")[0].slice(0, 60)}`);
    if (!commits.length) commits = null;
  } catch (err) {
    console.error("Git demo fetch failed:", err);
  }

  if (token !== demoToken) return; // visitor clicked something else meanwhile
  demoBody.innerHTML = "";

  const lines = commits
    ? ["$ git log --oneline", ...commits, "// pulled live from my GitHub repo"]
    : [
        "$ git log --oneline",
        "a3f9c21 Add responsive nav for mobile",
        "7e21b3d Fix overflow bug on small screens",
        "2b6d4aa Add dark mode toggle",
        "1c9f0aa Initial commit",
        "// sample output: couldn't reach GitHub right now",
      ];

  typeLines(demoBody, lines, "term-line", 14, token);
}

// --- Problem solving demo: a small bubble sort visualization ---
function runSortDemo(token) {
  const values = [5, 2, 8, 1, 9, 3, 7];

  const wrap = document.createElement("div");
  const barsEl = document.createElement("div");
  barsEl.className = "sort-bars";
  wrap.appendChild(barsEl);

  const btn = document.createElement("button");
  btn.className = "run-btn";
  btn.type = "button";
  btn.textContent = "Run bubble sort";
  wrap.appendChild(btn);

  demoBody.appendChild(wrap);

  function renderBars(arr, activeIndices = [], sortedFrom = arr.length) {
    barsEl.innerHTML = "";
    arr.forEach((val, i) => {
      const bar = document.createElement("div");
      bar.className = "sort-bar";
      bar.style.height = `${val * 10 + 14}px`;
      bar.textContent = val;
      if (i >= sortedFrom) bar.classList.add("sorted");
      if (activeIndices.includes(i)) bar.classList.add("comparing");
      barsEl.appendChild(bar);
    });
  }

  renderBars(values);

  btn.addEventListener("click", () => {
    btn.disabled = true;
    const arr = [...values];
    let i = 0, j = 0;

    function step() {
      if (token !== demoToken) return; // demo closed or replaced

      if (i >= arr.length - 1) {
        renderBars(arr, [], 0);
        btn.disabled = false;
        return;
      }

      if (j >= arr.length - i - 1) {
        i++;
        j = 0;
        setTimeout(step, 120);
        return;
      }

      renderBars(arr, [j, j + 1], arr.length - i);

      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }

      j++;
      setTimeout(step, 260);
    }

    step();
  });
}

// ---------- Certificates: hide "Verify" until a real link is added ----------
document.querySelectorAll(".cert-verify").forEach((link) => {
  if (link.getAttribute("href") === "#") link.hidden = true;
});

// ---------- Project screenshots ----------
// Each project has a colored cover with an emoji. If the screenshot loads it
// covers the emoji; if it's missing, we just drop the broken image.
document.querySelectorAll(".project-shot img").forEach((img) => {
  const dropImg = () => img.remove();
  img.addEventListener("error", dropImg);
  if (img.complete && img.naturalWidth === 0) dropImg();
});

// ---------- Copy email button ----------
const copyBtn = document.getElementById("copyEmail");
copyBtn.addEventListener("click", async () => {
  const email = contactForm.dataset.to;
  try {
    await navigator.clipboard.writeText(email);
    copyBtn.textContent = "Copied! ✓";
  } catch (err) {
    // Fallback (e.g. opened as a local file): show the address so it can be copied by hand.
    copyBtn.textContent = email;
  }
  setTimeout(() => (copyBtn.textContent = "Copy email"), 2000);
});

// ---------- Hide any link that still has a placeholder "#" ----------
// Add data-hide-if-empty to a link; until you paste a real URL it stays hidden.
document.querySelectorAll("a[data-hide-if-empty]").forEach((link) => {
  if (link.getAttribute("href") === "#") link.hidden = true;
});

// ---------- Hero photo: fall back to initials if photo.jpg is missing ----------
const heroImg = document.querySelector(".hero-photo img");
if (heroImg) {
  const dropPhoto = () => heroImg.remove();
  heroImg.addEventListener("error", dropPhoto);
  if (heroImg.complete && heroImg.naturalWidth === 0) dropPhoto();
}

// ---------- Highlight the current section in the nav ----------
const navLinks = [...document.querySelectorAll("#siteNav a")];
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          if (link.getAttribute("href") === `#${entry.target.id}`) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  navLinks.forEach((link) => {
    const section = document.getElementById(link.getAttribute("href").slice(1));
    if (section) observer.observe(section);
  });
}

// ---------- Preloader ----------
window.addEventListener("load", () => {
  setTimeout(() => document.body.classList.add("ready"), 650);
});
setTimeout(() => document.body.classList.add("ready"), 2500); // safety net

// ---------- Scroll reveal + animated skill bars ----------
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in"));
}

// ---------- Header state + scroll progress ----------
const header = document.querySelector(".site-header");
const progress = document.getElementById("progress");
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  header.classList.toggle("scrolled", scrollY > 8);
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- Mobile menu ----------
const menuBtn = document.getElementById("menuBtn");
const siteNav = document.getElementById("siteNav");
menuBtn.addEventListener("click", () => {
  const open = siteNav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});
siteNav.addEventListener("click", (e) => {
  if (e.target.closest("a")) { siteNav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
});

// ---------- Count-up numbers in the hero facts ----------
document.querySelectorAll("[data-count]").forEach((el) => {
  const end = Number(el.dataset.count);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = end; return; }
  const t0 = performance.now();
  (function tick(t) {
    const p = Math.min((t - t0) / 1200, 1);
    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
});

// ---------- Live project previews: scale a 1280px-wide iframe to fit its card ----------
const fitPreviews = () => document.querySelectorAll(".live-preview").forEach((f) => {
  f.style.transform = `scale(${f.parentElement.clientWidth / 1280})`;
});
fitPreviews();
window.addEventListener("resize", fitPreviews);
window.addEventListener("load", fitPreviews);
