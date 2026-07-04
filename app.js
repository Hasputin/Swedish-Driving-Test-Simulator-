const EXAM_LENGTH = 65;
const PASS_MARK = 52;
const DURATION_SECONDS = 50 * 60;
const STORAGE_KEY = "swedish-driving-sim-state-v1";

let questionPool = [];
let state = null;
let timerInterval = null;

const el = (id) => document.getElementById(id);

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadQuestions() {
  const res = await fetch("questions.json");
  questionPool = await res.json();
  el("bank-size").textContent = questionPool.length;
}

function buildExam() {
  const picked = shuffle(questionPool).slice(0, EXAM_LENGTH);
  const examQuestions = picked.map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return {
      id: q.id,
      source: q.source,
      chapter: q.chapter,
      question: q.question,
      images: q.images || [],
      explanation: q.explanation,
      options: order.map((i) => q.options[i]),
      correctIndex: order.indexOf(q.correctIndex),
    };
  });
  return {
    examQuestions,
    answers: {},
    flagged: {},
    currentIndex: 0,
    startTime: Date.now(),
    submitted: false,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadSavedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.submitted) return null;
    const elapsed = (Date.now() - parsed.startTime) / 1000;
    if (elapsed >= DURATION_SECONDS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function showScreen(name) {
  ["start", "exam", "results"].forEach((s) => {
    el(`screen-${s}`).classList.toggle("hidden", s !== name);
  });
}

function startNewExam() {
  state = buildExam();
  saveState();
  showScreen("exam");
  renderNav();
  renderQuestion();
  startTimer();
}

function resumeExam() {
  state = loadSavedState();
  showScreen("exam");
  renderNav();
  renderQuestion();
  startTimer();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  tickTimer();
  timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
  const elapsed = (Date.now() - state.startTime) / 1000;
  const remaining = Math.max(0, DURATION_SECONDS - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = Math.floor(remaining % 60);
  const timerEl = el("timer");
  timerEl.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  timerEl.classList.toggle("low", remaining <= 300);
  if (remaining <= 0) {
    clearInterval(timerInterval);
    submitExam(true);
  }
}

function renderNav() {
  const nav = el("question-nav");
  nav.innerHTML = "";
  state.examQuestions.forEach((q, i) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.textContent = i + 1;
    if (state.answers[q.id] !== undefined) btn.classList.add("answered");
    if (state.flagged[q.id]) btn.classList.add("flagged");
    if (i === state.currentIndex) btn.classList.add("current");
    btn.addEventListener("click", () => {
      state.currentIndex = i;
      renderNav();
      renderQuestion();
    });
    nav.appendChild(btn);
  });
  el("answered-count").textContent = Object.keys(state.answers).length;
}

function renderQuestion() {
  const q = state.examQuestions[state.currentIndex];
  el("q-index").textContent = `Question ${state.currentIndex + 1} of ${EXAM_LENGTH}`;
  el("q-chapter").textContent = q.chapter;
  el("q-source").textContent = q.source === "book-verified" ? "Book-verified" : "AI-generated practice";
  el("q-text").textContent = q.question;

  const imagesEl = el("q-images");
  imagesEl.innerHTML = "";
  (q.images || []).forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    imagesEl.appendChild(img);
  });

  const optionsEl = el("q-options");
  optionsEl.innerHTML = "";
  q.options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.className = "option";
    if (state.answers[q.id] === i) div.classList.add("selected");
    div.textContent = opt;
    div.addEventListener("click", () => {
      state.answers[q.id] = i;
      saveState();
      renderNav();
      renderQuestion();
    });
    optionsEl.appendChild(div);
  });

  el("btn-flag").textContent = state.flagged[q.id] ? "Unflag" : "Flag for review";
  el("btn-prev").disabled = state.currentIndex === 0;
  el("btn-next").disabled = state.currentIndex === EXAM_LENGTH - 1;
}

function submitExam(auto = false) {
  if (timerInterval) clearInterval(timerInterval);
  state.submitted = true;
  saveState();

  let correct = 0;
  state.examQuestions.forEach((q) => {
    if (state.answers[q.id] === q.correctIndex) correct++;
  });
  const passed = correct >= PASS_MARK;

  el("result-headline").textContent = passed ? "Pass" : "Fail";
  el("result-headline").style.color = passed ? "var(--success)" : "var(--danger)";
  el("result-score").textContent =
    `${correct} / ${EXAM_LENGTH} correct (need ${PASS_MARK} to pass)` +
    (auto ? " — time ran out" : "");

  renderReview();
  el("review-list").classList.add("hidden");
  el("btn-review-toggle").textContent = "Show review";
  showScreen("results");
  clearState();
}

function renderReview() {
  const list = el("review-list");
  list.innerHTML = "";
  state.examQuestions.forEach((q, i) => {
    const userAnswer = state.answers[q.id];
    const isCorrect = userAnswer === q.correctIndex;
    const div = document.createElement("div");
    div.className = `review-item ${isCorrect ? "correct" : "incorrect"}`;
    const userText = userAnswer !== undefined ? q.options[userAnswer] : "(not answered)";
    div.innerHTML = `
      <strong>${i + 1}. ${escapeHtml(q.question)}</strong>
      <div class="tag">${escapeHtml(q.chapter)}</div>
      <p class="your-answer">Your answer: ${escapeHtml(userText)}</p>
      ${!isCorrect ? `<p class="correct-answer">Correct answer: ${escapeHtml(q.options[q.correctIndex])}</p>` : ""}
      <p class="explanation">${escapeHtml(q.explanation)}</p>
      ${(q.images || []).map((src) => `<img src="${src}">`).join("")}
    `;
    list.appendChild(div);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function init() {
  loadQuestions().then(() => {
    const saved = loadSavedState();
    if (saved) {
      el("resume-note").classList.remove("hidden");
    }
    el("btn-resume").addEventListener("click", resumeExam);
    el("btn-discard").addEventListener("click", () => {
      clearState();
      el("resume-note").classList.add("hidden");
    });
  });

  el("btn-start").addEventListener("click", startNewExam);
  el("btn-restart").addEventListener("click", () => {
    clearState();
    showScreen("start");
    el("resume-note").classList.add("hidden");
  });

  el("btn-prev").addEventListener("click", () => {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderNav();
      renderQuestion();
    }
  });
  el("btn-next").addEventListener("click", () => {
    if (state.currentIndex < EXAM_LENGTH - 1) {
      state.currentIndex++;
      renderNav();
      renderQuestion();
    }
  });
  el("btn-flag").addEventListener("click", () => {
    const q = state.examQuestions[state.currentIndex];
    state.flagged[q.id] = !state.flagged[q.id];
    saveState();
    renderNav();
    renderQuestion();
  });
  el("btn-submit").addEventListener("click", () => {
    const unanswered = EXAM_LENGTH - Object.keys(state.answers).length;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question(s). Submit anyway?`
      : "Submit your test now?";
    if (confirm(msg)) submitExam(false);
  });
  el("btn-review-toggle").addEventListener("click", () => {
    const list = el("review-list");
    const showing = !list.classList.contains("hidden");
    list.classList.toggle("hidden");
    el("btn-review-toggle").textContent = showing ? "Show review" : "Hide review";
  });
}

init();
