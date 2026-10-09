/* ============================================================
   النحو الميسّر — المنطق الرئيسي (نظام المستويات + الدروع + الشهادة)
   ============================================================ */

// ==================== الإعدادات العامة ====================
const CONFIG = {
    MAX_HEARTS: 20,
    HEART_REGEN_MS: 10 * 60 * 1000,
    HEART_REGEN_AMOUNT: 3,
    QUESTION_TIME: 30,
    POINTS_PER_CORRECT: 10,
    STREAK_FOR_BONUS_HEART: 5,
    STORAGE_KEY: 'nahw_game_state',
    STATE_VERSION: 2
};

const TOTAL_LEVELS = 270;
const RESET_CODE = "فيلادلفيا";

// ==================== الأصوات ====================
const SOUNDS = {
    ahsant:       { file: 'sounds/Ahsant.mp3',         text: 'أحسنت' },
    momtaz:       { file: 'sounds/Momtaz.mp3',         text: 'ممتاز' },
    momtazAbda3t: { file: 'sounds/Momtaz-abda3t.mp3',  text: 'ممتاز أبدعت' },
    rae3Jedd:     { file: 'sounds/Rae3-jeddn.mp3',     text: 'رائع جداً' },
    ejabaSaheha:  { file: 'sounds/Ejaba-saheha.mp3',   text: 'إجابة صحيحة' },
    yaBatal:      { file: 'sounds/Ya-batal.mp3',       text: 'يا بطل' },
    elaAlamam:    { file: 'sounds/Ela-alamam.mp3',     text: 'إلى الأمام' },
    to3gebony:    { file: 'sounds/To3gebony.mp3',      text: 'تعجبني' }
};

function playSound(key) {
    const sound = SOUNDS[key];
    if (!sound) return;
    try {
        const audio = new Audio(sound.file);
        audio.volume = 0.9;
        const p = audio.play();
        if (p && p.catch) p.catch(() => speakText(sound.text));
    } catch (e) {
        speakText(sound.text);
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ar-SA';
        u.rate = 1.05;
        u.pitch = 1.1;
        window.speechSynthesis.speak(u);
    }
}

function pickPraiseSound() {
    const s = gameState.streak;
    if (s >= 10) return 'momtazAbda3t';
    if (s >= 7)  return 'rae3Jedd';
    if (s >= 5)  return 'yaBatal';
    if (s >= 3)  return 'momtaz';
    const light = ['ahsant', 'ejabaSaheha', 'to3gebony', 'elaAlamam'];
    return light[Math.floor(Math.random() * light.length)];
}

let audioCtx = null;
function playErrorSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.setValueAtTime(110, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) { }
}

// ==================== نظام الدروع ====================
const BADGES = [
    {
        id: 1,
        title: "درع البداية المضيئة",
        rank: "مبتدئ واعد",
        color: "from-amber-700 to-amber-900",
        icon: "fa-seedling",
        range: [1, 5],
        message: "خطوتك الأولى هي أساس كل نجاح عظيم! لقد أضاءت بدايتك عتمة التردد، فاستمر بهذا العزم المنير."
    },
    {
        id: 2,
        title: "درع سفير الحروف",
        rank: "سفير اللسان",
        color: "from-orange-600 to-amber-800",
        icon: "fa-feather",
        range: [6, 10],
        message: "لقد عبرت البدايات وأثبتَّ جدارتك؛ كلماتك تتصاعد بثبات، ومعرفتك تتسع يوماً بعد يوم. إلى الأمام!"
    },
    {
        id: 3,
        title: "درع بطل المعرفة",
        rank: "فارس المعرفة المتمكن",
        color: "from-slate-400 to-slate-600",
        icon: "fa-shield-halved",
        range: [11, 15],
        message: "تجاوزت منتصف الطريق باقتدار! عزيمتك الصلبة تصنع منك بطلًا حقيقيًا لا يعرف اليأس ولا الاستسلام."
    },
    {
        id: 4,
        title: "درع الحكيم اللغوي",
        rank: "حارس القواعد",
        color: "from-yellow-500 to-amber-700",
        icon: "fa-crown",
        range: [16, 20],
        message: "عقلك الراجح وفكرك الثاقب يؤكدان أنك قُمت ببناء قاعدة صلبة من المهارات. لم يبقَ إلا القليل لتصل للقمة!"
    },
    {
        id: 5,
        title: "درع فارس الميدان",
        rank: "عميد الفرسان",
        color: "from-yellow-400 to-yellow-600",
        icon: "fa-medal",
        range: [21, 25],
        message: "أنت على أعتاب القمة الكبرى! شجاعتك في اجتياز هذه المراحل المعقدة تؤهلك لتكون الأبرز بين زملائك."
    },
    {
        id: 6,
        title: "درع الأسطورة",
        rank: "بطل الأبطال الأوحد",
        color: "from-cyan-400 to-blue-600",
        icon: "fa-gem",
        range: [26, 26],
        message: "المجد لمن صبر واجتهد! لقد أتممت الـ 270 مستوى وتجاوزت التحدي الأكبر بجدارة واستحقاق مطلق. أنت الآن أسطورة تُخلَّد في سجل الفرسان الأوائل!"
    }
];

// ==================== الحالة ====================
let gameState = {
    studentName: "",
    nameLocked: false,
    uuid: "",
    hearts: CONFIG.MAX_HEARTS,
    score: 0,
    streak: 0,
    currentStageId: null,
    currentLevel: 1,
    unlockedStages: [1],
    completedStages: [],
    stageProgress: {},
    lastHeartRegenTime: Date.now(),
    version: CONFIG.STATE_VERSION
};

function loadSavedState() {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (!parsed.version || parsed.version < CONFIG.STATE_VERSION) {
                parsed.hearts = CONFIG.MAX_HEARTS;
                parsed.version = CONFIG.STATE_VERSION;
                if (!parsed.stageProgress) parsed.stageProgress = {};
            }
            gameState = { ...gameState, ...parsed };
            if (!gameState.stageProgress) gameState.stageProgress = {};
            if (typeof gameState.nameLocked !== 'boolean') gameState.nameLocked = false;
            if (!gameState.uuid) gameState.uuid = "";
        } catch (e) { console.error("خطأ في تحميل الحالة", e); }
    }
}

function saveState() {
    gameState.version = CONFIG.STATE_VERSION;
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(gameState));
}

// ==================== دوال مساعدة ====================
function getTotalLevelsCompleted() {
    let total = 0;
    for (const stageId in gameState.stageProgress) {
        const p = gameState.stageProgress[stageId];
        if (p && p.completedLevels) total += p.completedLevels.length;
    }
    return total;
}

function getProgressPercent() {
    return Math.round((getTotalLevelsCompleted() / TOTAL_LEVELS) * 100);
}

function getCurrentBadge() {
    const completedStages = gameState.completedStages.length;
    if (completedStages === 0) return null;
    for (let i = BADGES.length - 1; i >= 0; i--) {
        if (completedStages >= BADGES[i].range[0]) return BADGES[i];
    }
    return null;
}

function generateUUID() {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const year = new Date().getFullYear();
    return `NM-${year}-${part1}-${part2}`;
}

// ==================== القلوب ====================
function regenHearts() {
    if (gameState.hearts >= CONFIG.MAX_HEARTS) {
        gameState.lastHeartRegenTime = Date.now();
        return;
    }
    const elapsed = Date.now() - gameState.lastHeartRegenTime;
    if (elapsed >= CONFIG.HEART_REGEN_MS) {
        const cycles = Math.floor(elapsed / CONFIG.HEART_REGEN_MS);
        gameState.hearts = Math.min(CONFIG.MAX_HEARTS, gameState.hearts + cycles * CONFIG.HEART_REGEN_AMOUNT);
        gameState.lastHeartRegenTime += cycles * CONFIG.HEART_REGEN_MS;
        if (gameState.hearts >= CONFIG.MAX_HEARTS) gameState.lastHeartRegenTime = Date.now();
        saveState();
    }
}

function loseHeart() {
    const wasFull = gameState.hearts >= CONFIG.MAX_HEARTS;
    gameState.hearts = Math.max(0, gameState.hearts - 1);
    if (wasFull) gameState.lastHeartRegenTime = Date.now();
    updateGlobalHeader();
    saveState();
}

function gainHeart() {
    gameState.hearts = Math.min(CONFIG.MAX_HEARTS, gameState.hearts + 1);
    if (gameState.hearts >= CONFIG.MAX_HEARTS) gameState.lastHeartRegenTime = Date.now();
}

let heartTimerInterval = null;
function stopHeartTimer() {
    if (heartTimerInterval) { clearInterval(heartTimerInterval); heartTimerInterval = null; }
}

function startHeartTimerCountdown() {
    stopHeartTimer();
    const el = document.getElementById('heart-timer-display');
    const tick = () => {
        if (gameState.hearts >= CONFIG.MAX_HEARTS) {
            stopHeartTimer();
            el.textContent = "ممتلئة ❤️";
            return;
        }
        const elapsed = Date.now() - gameState.lastHeartRegenTime;
        const remaining = Math.max(0, CONFIG.HEART_REGEN_MS - (elapsed % CONFIG.HEART_REGEN_MS));
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        regenHearts();
        if (gameState.hearts > 0) {
            stopHeartTimer();
            goToDashboard();
            showToast("❤️ تمت استعادة القلوب بنجاح!");
        }
    };
    tick();
    heartTimerInterval = setInterval(tick, 1000);
}

// ==================== الشاشات ====================
const welcomeScreen = document.getElementById('welcome-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const trainingScreen = document.getElementById('training-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');
const outOfHeartsScreen = document.getElementById('out-of-hearts-screen');
const globalStatus = document.getElementById('global-status');
const stageRuleModal = document.getElementById('stage-rule-modal');

function hideAllScreens() {
    [welcomeScreen, dashboardScreen, trainingScreen, quizScreen,
     resultScreen, outOfHeartsScreen, stageRuleModal,
     document.getElementById('rules-modal'),
     document.getElementById('reset-modal')]
        .forEach(el => el && el.classList.add('hidden'));
}

function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n;
}

function updateGlobalHeader() {
    document.getElementById('header-hearts').textContent = formatNumber(gameState.hearts);
    document.getElementById('header-score').textContent = formatNumber(gameState.score);
    if (gameState.studentName) {
        document.getElementById('header-student-name').textContent = gameState.studentName;
    }
}

function startJourney() {
    const input = document.getElementById('student-name-input');

    if (gameState.nameLocked) {
        goToDashboard();
        return;
    }

    const name = input.value.trim();
    if (!name) { showToast("الرجاء إدخال اسمك الكريم للبدء!"); return; }
    gameState.studentName = name;
    saveState();
    goToDashboard();
}

function goToDashboard() {
    regenHearts();
    hideAllScreens();
    updateGlobalHeader();
    document.getElementById('nav-buttons').classList.remove('hidden');

    if (gameState.hearts <= 0) {
        outOfHeartsScreen.classList.remove('hidden');
        globalStatus.classList.add('hidden');
        startHeartTimerCountdown();
        return;
    }
    stopHeartTimer();
    globalStatus.classList.remove('hidden');
    dashboardScreen.classList.remove('hidden');
    document.getElementById('welcome-banner-title').textContent =
        `أهلاً بك يا ${gameState.studentName || 'طالب العلم'}`;
    renderStagesGrid();
    renderProgressBar();
}

function goToWelcome() {
    if (typeof questionTimerInterval !== 'undefined' && questionTimerInterval) {
        clearInterval(questionTimerInterval);
    }
    if (typeof stopHeartTimer === 'function') stopHeartTimer();

    hideAllScreens();
    globalStatus.classList.add('hidden');
    document.getElementById('nav-buttons').classList.add('hidden');
    welcomeScreen.classList.remove('hidden');

    const input = document.getElementById('student-name-input');
    const lockIcon = document.getElementById('name-lock-icon');

    if (gameState.studentName) {
        input.value = gameState.studentName;
    }

    if (gameState.nameLocked) {
        input.disabled = true;
        input.classList.add('opacity-60', 'cursor-not-allowed');
        if (lockIcon) lockIcon.classList.remove('hidden');
    } else {
        input.disabled = false;
        input.classList.remove('opacity-60', 'cursor-not-allowed');
        if (lockIcon) lockIcon.classList.add('hidden');
    }
}

function openRulesModal() {
    document.getElementById('rules-modal').classList.remove('hidden');
}
function closeRulesModal() {
    document.getElementById('rules-modal').classList.add('hidden');
}

function openTrainingArena() {
    hideAllScreens();
    globalStatus.classList.remove('hidden');
    document.getElementById('nav-buttons').classList.remove('hidden');
    trainingScreen.classList.remove('hidden');
    renderTrainingTopics();
}

// ==================== شريط التقدم العام ====================
function renderProgressBar() {
    const totalEl = document.getElementById('progress-total-levels');
    const percentEl = document.getElementById('progress-percent');
    const fillEl = document.getElementById('progress-fill');
    const badgeEl = document.getElementById('progress-badge');
    const rankEl = document.getElementById('progress-rank');

    if (!totalEl || !percentEl || !fillEl) return;

    const total = getTotalLevelsCompleted();
    const percent = getProgressPercent();
    const currentBadge = getCurrentBadge();

    totalEl.textContent = `${total} / ${TOTAL_LEVELS}`;
    percentEl.textContent = `${percent}%`;
    fillEl.style.width = `${percent}%`;

    if (currentBadge) {
        if (badgeEl) {
            badgeEl.className = `w-10 h-10 rounded-xl bg-gradient-to-br ${currentBadge.color} flex items-center justify-center text-white shadow-lg`;
            badgeEl.innerHTML = `<i class="fa-solid ${currentBadge.icon}"></i>`;
        }
        if (rankEl) {
            rankEl.textContent = currentBadge.rank;
        }
    } else {
        if (badgeEl) {
            badgeEl.className = `w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 shadow`;
            badgeEl.innerHTML = `<i class="fa-solid fa-lock"></i>`;
        }
        if (rankEl) {
            rankEl.textContent = "لم تبدأ رحلتك بعد";
        }
    }
}

// ==================== عرض المراحل ====================
function renderStagesGrid() {
    const grid = document.getElementById('stages-grid');
    grid.innerHTML = '';

    const stages = [...window.stagesDatabase].sort((a, b) => a.id - b.id);
    document.getElementById('stages-count-badge').textContent = `${stages.length} مراحل`;

    stages.forEach((stage, idx) => {
        const isUnlocked = gameState.unlockedStages.includes(stage.id) || idx === 0;
        const isCompleted = gameState.completedStages.includes(stage.id);
        const progress = gameState.stageProgress[stage.id] || { completedLevels: [] };
        const totalLevels = stage.levels ? stage.levels.length : 0;
        const completedLevels = progress.completedLevels.length;
        const progressText = totalLevels > 0 
            ? `${Math.min(completedLevels + 1, totalLevels)} / ${totalLevels}` 
            : '';

        const card = document.createElement('div');
        card.className = `bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border ${isUnlocked ? 'border-emerald-500/30 shadow-xl' : 'border-slate-800 opacity-60'} transition flex flex-col justify-between group relative overflow-hidden`;

        card.innerHTML = `
            <div class="absolute -top-12 -left-12 w-28 h-28 bg-gradient-to-br ${stage.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition"></div>
            <div class="space-y-4 relative z-10">
                <div class="flex justify-between items-start">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br ${stage.color} flex items-center justify-center text-white shadow-lg">
                        <i class="fa-solid ${stage.icon} text-xl"></i>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${isCompleted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : (isUnlocked ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-800 text-slate-500')}">
                        ${isCompleted ? '<i class="fa-solid fa-check text-emerald-400"></i> مكتملة' : (isUnlocked ? progressText : '<i class="fa-solid fa-lock"></i> مقفلة')}
                    </span>
                </div>
                <div class="space-y-1">
                    <h4 class="text-lg font-bold text-white group-hover:text-emerald-300 transition">${stage.title}</h4>
                    <p class="text-xs text-slate-400 leading-relaxed line-clamp-2">${stage.description}</p>
                </div>
            </div>
            <div class="pt-4 mt-4 border-t border-slate-800/80 flex items-center gap-2 relative z-10">
                <button onclick="openStageRuleModal(${stage.id})" class="flex-1 py-2 bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 font-semibold rounded-xl border border-teal-500/30 transition text-xs flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-book-open"></i> دليل القاعدة
                </button>
                <button ${isUnlocked ? `onclick="startStageQuiz(${stage.id})"` : 'disabled'} class="flex-1 py-2 ${isUnlocked ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'} font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5">
                    <span>${isCompleted ? 'إعادة' : 'ابدأ'}</span> <i class="fa-solid fa-arrow-left"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function openStageRuleModal(stageId) {
    const stage = window.stagesDatabase.find(s => s.id === stageId);
    if (!stage) return;

    const idx = window.stagesDatabase.findIndex(s => s.id === stageId);
    const isUnlocked = gameState.unlockedStages.includes(stageId) || idx === 0;

    document.getElementById('modal-rule-title').textContent = `دليل قسم: ${stage.title}`;
    document.getElementById('modal-rule-content').textContent = stage.ruleSummary;

    const iconContainer = document.getElementById('modal-rule-icon');
    iconContainer.className = `w-12 h-12 rounded-2xl bg-gradient-to-br ${stage.color} flex items-center justify-center text-white shadow-lg`;
    iconContainer.innerHTML = `<i class="fa-solid ${stage.icon} text-xl"></i>`;

    const startBtn = document.getElementById('modal-start-quiz-btn');

    if (isUnlocked) {
        startBtn.disabled = false;
        startBtn.className = "flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg transition text-sm flex items-center justify-center gap-2";
        startBtn.innerHTML = '<i class="fa-solid fa-play"></i> بدء تحدي القسم';
        startBtn.onclick = () => {
            closeStageRuleModal();
            startStageQuiz(stageId);
        };
    } else {
        startBtn.disabled = true;
        startBtn.className = "flex-1 py-3 bg-slate-800 text-slate-500 cursor-not-allowed font-bold rounded-xl border border-slate-700 transition text-sm flex items-center justify-center gap-2";
        startBtn.innerHTML = '<i class="fa-solid fa-lock"></i> المرحلة مقفلة';
        startBtn.onclick = null;
    }

    stageRuleModal.classList.remove('hidden');
}

function closeStageRuleModal() {
    stageRuleModal.classList.add('hidden');
}

function renderTrainingTopics() {
    const container = document.getElementById('training-topics-container');
    container.innerHTML = '';
    const stages = [...window.stagesDatabase].sort((a, b) => a.id - b.id);
    stages.forEach(stage => {
        const card = document.createElement('div');
        card.className = "bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-teal-500/20 shadow-xl space-y-4 flex flex-col justify-between";
        card.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${stage.color} flex items-center justify-center text-white shadow">
                        <i class="fa-solid ${stage.icon}"></i>
                    </div>
                    <h4 class="text-lg font-bold text-teal-200">${stage.title}</h4>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 font-mono">${stage.ruleSummary}</p>
            </div>
            <button onclick="startStageQuiz(${stage.id})" class="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold rounded-xl border border-emerald-500/30 transition text-xs flex items-center justify-center gap-2">
                <i class="fa-solid fa-play"></i> اختبر معلوماتك في هذه القاعدة
            </button>
        `;
        container.appendChild(card);
    });
}

// ==================== منطق الاختبار ====================
let currentStageData = null;
let currentQuestionPool = [];
let questionsAnsweredThisLevel = 0;
let currentQuestion = null;
let questionTimerInterval = null;
let questionTimeLeft = CONFIG.QUESTION_TIME;
let levelTransitionInProgress = false;

function startStageQuiz(stageId) {
    regenHearts();
    if (gameState.hearts <= 0) { goToDashboard(); return; }

    const idx = window.stagesDatabase.findIndex(s => s.id === stageId);
    const isUnlocked = gameState.unlockedStages.includes(stageId) || idx === 0;
    if (!isUnlocked) {
        showToast("🔒 هذه المرحلة مقفلة — أكمل المرحلة السابقة أولاً");
        return;
    }

    const stage = window.stagesDatabase.find(s => s.id === stageId);
    if (!stage || !stage.levels || stage.levels.length === 0) return;

    const progress = gameState.stageProgress[stageId] || { completedLevels: [] };
    let startLevel = 1;
    for (let i = 1; i <= stage.levels.length; i++) {
        if (!progress.completedLevels.includes(i)) { startLevel = i; break; }
    }
    if (progress.completedLevels.length >= stage.levels.length) startLevel = 1;

    currentStageData = stage;
    gameState.currentStageId = stageId;
    gameState.currentLevel = startLevel;
    currentQuestionPool = [...stage.levels[startLevel - 1].questions];
    questionsAnsweredThisLevel = 0;
    currentQuestion = null;
    levelTransitionInProgress = false;

    hideAllScreens();
    globalStatus.classList.remove('hidden');
    document.getElementById('nav-buttons').classList.remove('hidden');
    quizScreen.classList.remove('hidden');
    updateGlobalHeader();
    loadQuizQuestion();
}

function loadQuizQuestion() {
    if (questionTimerInterval) clearInterval(questionTimerInterval);
    levelTransitionInProgress = false;

    if (currentQuestionPool.length === 0) {
        handleLevelComplete();
        return;
    }

    let idx = Math.floor(Math.random() * currentQuestionPool.length);
    if (currentQuestionPool.length > 1 && currentQuestionPool[idx] === currentQuestion) {
        idx = (idx + 1) % currentQuestionPool.length;
    }
    currentQuestion = currentQuestionPool[idx];
    const qData = currentQuestion;

    questionTimeLeft = CONFIG.QUESTION_TIME;
    updateQuestionTimerUI();
    startQuestionTimer();

    const levelData = currentStageData.levels[gameState.currentLevel - 1];
    const totalInLevel = levelData.questions.length;
    const remaining = currentQuestionPool.length;
    const done = totalInLevel - remaining;

    document.getElementById('current-q-index').textContent = Math.min(done + 1, totalInLevel);
    document.getElementById('total-q-index').textContent = totalInLevel;
    document.getElementById('streak-counter').textContent = gameState.streak;
    document.getElementById('quiz-progress-bar').style.width = `${(done / totalInLevel) * 100}%`;
    document.getElementById('quiz-stage-badge').textContent = `${currentStageData.title} — المستوى ${gameState.currentLevel}`;
    document.getElementById('quiz-difficulty-badge').textContent = `مستوى ${qData.difficulty}`;
    document.getElementById('quiz-question-text').textContent = qData.q;

    document.getElementById('quiz-feedback-box').classList.add('hidden');

    const optionsContainer = document.getElementById('quiz-options-container');
    optionsContainer.innerHTML = '';
    const labels = ['أ', 'ب', 'ج', 'د'];

    qData.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = "option-btn w-full text-right p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition font-semibold text-white flex items-center justify-between group shadow-md";
        btn.innerHTML = `
            <span class="text-sm md:text-base">${opt}</span>
            <span class="w-8 h-8 rounded-xl bg-slate-700/80 flex items-center justify-center text-xs text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition">${labels[i] || i + 1}</span>
        `;
        btn.onclick = () => submitAnswer(i, btn);
        optionsContainer.appendChild(btn);
    });
}

function startQuestionTimer() {
    questionTimerInterval = setInterval(() => {
        questionTimeLeft--;
        updateQuestionTimerUI();
        if (questionTimeLeft <= 0) {
            clearInterval(questionTimerInterval);
            handleTimeOut();
        }
    }, 1000);
}

function updateQuestionTimerUI() {
    const txt = document.getElementById('question-timer-text');
    const bar = document.getElementById('question-timer-bar');
    if (!txt || !bar) return;
    txt.textContent = `${questionTimeLeft} ثانية`;
    bar.style.width = `${(questionTimeLeft / CONFIG.QUESTION_TIME) * 100}%`;
    if (questionTimeLeft <= 10) {
        bar.className = "timer-bar bg-gradient-to-r from-rose-500 to-amber-500 h-full";
        txt.className = "font-bold text-rose-400 font-mono";
    } else {
        bar.className = "timer-bar bg-gradient-to-r from-emerald-500 to-teal-500 h-full";
        txt.className = "font-bold text-emerald-400 font-mono";
    }
}

function disableOptions() {
    const buttons = document.getElementById('quiz-options-container').getElementsByTagName('button');
    for (let b of buttons) { b.disabled = true; b.classList.add('opacity-80'); }
    return buttons;
}

function revealCorrect(buttons, answerIdx) {
    buttons[answerIdx].classList.remove('bg-slate-800/80', 'border-slate-700');
    buttons[answerIdx].classList.add('bg-emerald-600/80', 'border-emerald-400');
}

function handleTimeOut() {
    if (!currentQuestion) return;
    const qData = currentQuestion;
    const buttons = disableOptions();
    revealCorrect(buttons, qData.answer);

    playErrorSound();
    gameState.streak = 0;
    loseHeart();

    const box = document.getElementById('quiz-feedback-box');
    document.getElementById('feedback-header').innerHTML =
        `<i class="fa-solid fa-clock text-rose-400"></i> <span class="text-rose-300">انتهى الوقت! سيُعاد عليك السؤال — خُصم قلب</span>`;
    document.getElementById('feedback-explanation').textContent =
        `الإجابة الصحيحة: "${qData.options[qData.answer]}".\n${qData.explanation}`;
    document.getElementById('feedback-training-tip').classList.remove('hidden');
    box.className = "p-5 rounded-2xl border bg-rose-950/60 border-rose-500/40 space-y-3 animate-fade-in";
    box.classList.remove('hidden');

    if (gameState.hearts <= 0) setTimeout(goToDashboard, 1800);
}

function submitAnswer(selectedIndex, selectedButton) {
    if (questionTimerInterval) clearInterval(questionTimerInterval);
    if (!currentQuestion) return;

    const qData = currentQuestion;
    const buttons = disableOptions();
    const box = document.getElementById('quiz-feedback-box');
    const header = document.getElementById('feedback-header');
    const explanation = document.getElementById('feedback-explanation');

    if (selectedIndex === qData.answer) {
        selectedButton.classList.remove('bg-slate-800/80', 'border-slate-700');
        selectedButton.classList.add('bg-emerald-600/90', 'border-emerald-400');

        questionsAnsweredThisLevel++;
        gameState.score += CONFIG.POINTS_PER_CORRECT;
        gameState.streak++;

        const soundKey = pickPraiseSound();
        playSound(soundKey);

        if (gameState.streak > 0 && gameState.streak % CONFIG.STREAK_FOR_BONUS_HEART === 0) {
            gainHeart();
            showToast("🎉 حصلت على قلب إضافي!");
        }

        const idx = currentQuestionPool.indexOf(qData);
        if (idx > -1) currentQuestionPool.splice(idx, 1);

        const praiseText = SOUNDS[soundKey].text;
        box.className = "p-5 rounded-2xl border bg-emerald-950/60 border-emerald-500/40 space-y-3 animate-fade-in";
        header.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> <span class="text-emerald-300">${praiseText}</span>`;
        explanation.textContent = qData.explanation;
        document.getElementById('feedback-training-tip').classList.add('hidden');
    } else {
        selectedButton.classList.remove('bg-slate-800/80', 'border-slate-700');
        selectedButton.classList.add('bg-rose-600/90', 'border-rose-400');
        revealCorrect(buttons, qData.answer);

        playErrorSound();
        gameState.streak = 0;
        loseHeart();

        box.className = "p-5 rounded-2xl border bg-rose-950/60 border-rose-500/40 space-y-3 animate-fade-in";
        header.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-400"></i> <span class="text-rose-300">إجابة خاطئة — سيُعاد عليك السؤال لاحقًا</span>`;
        explanation.textContent = `الإجابة الصحيحة: "${qData.options[qData.answer]}".\n${qData.explanation}`;
        document.getElementById('feedback-training-tip').classList.remove('hidden');

        if (gameState.hearts <= 0) {
            document.getElementById('streak-counter').textContent = gameState.streak;
            box.classList.remove('hidden');
            updateGlobalHeader();
            saveState();
            setTimeout(goToDashboard, 1800);
            return;
        }
    }

    document.getElementById('streak-counter').textContent = gameState.streak;
    box.classList.remove('hidden');
    updateGlobalHeader();
    saveState();
}

function nextQuestion() {
    if (currentQuestionPool.length === 0) {
        handleLevelComplete();
    } else {
        loadQuizQuestion();
    }
}

function handleLevelComplete() {
    if (levelTransitionInProgress) return;
    levelTransitionInProgress = true;

    if (!gameState.stageProgress[gameState.currentStageId]) {
        gameState.stageProgress[gameState.currentStageId] = { completedLevels: [] };
    }
    if (!gameState.stageProgress[gameState.currentStageId].completedLevels.includes(gameState.currentLevel)) {
        gameState.stageProgress[gameState.currentStageId].completedLevels.push(gameState.currentLevel);
    }
    saveState();

    const nextLevel = gameState.currentLevel + 1;
    const totalLevels = currentStageData.levels.length;

    if (nextLevel > totalLevels) {
        finishStage();
        return;
    }

    playSound('momtazAbda3t');
    const box = document.getElementById('quiz-feedback-box');
    const header = document.getElementById('feedback-header');
    const explanation = document.getElementById('feedback-explanation');
    box.className = "p-5 rounded-2xl border bg-emerald-950/60 border-emerald-500/40 space-y-3 animate-fade-in";
    header.innerHTML = `<i class="fa-solid fa-trophy text-amber-400"></i> <span class="text-emerald-300">أتممت المستوى ${gameState.currentLevel} بنجاح!</span>`;
    explanation.textContent = `استعد للمستوى ${nextLevel} من ${totalLevels}...`;
    document.getElementById('feedback-training-tip').classList.add('hidden');
    box.classList.remove('hidden');
    document.getElementById('quiz-options-container').innerHTML = '';
    document.getElementById('quiz-question-text').textContent = '...';
    updateGlobalHeader();

    setTimeout(() => {
        gameState.currentLevel = nextLevel;
        currentQuestionPool = [...currentStageData.levels[nextLevel - 1].questions];
        questionsAnsweredThisLevel = 0;
        currentQuestion = null;
        levelTransitionInProgress = false;
        loadQuizQuestion();
    }, 2200);
}

function finishStage() {
    if (questionTimerInterval) clearInterval(questionTimerInterval);
    hideAllScreens();
    globalStatus.classList.remove('hidden');
    document.getElementById('nav-buttons').classList.remove('hidden');
    resultScreen.classList.remove('hidden');

    const totalLevels = currentStageData.levels.length;
    const completedLevels = gameState.stageProgress[currentStageData.id].completedLevels.length;

    document.getElementById('result-stage-title').textContent = currentStageData.title;
    document.getElementById('result-correct-count').textContent = completedLevels;
    document.getElementById('result-total-count').textContent = totalLevels;

    const badge = document.getElementById('result-badge-text');
    const icon = document.getElementById('result-trophy-icon');
    const title = document.getElementById('result-title-text');

    badge.textContent = "إتقان تام 🏆";
    badge.className = "inline-block px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-500/30";
    icon.className = "fa-solid fa-trophy text-5xl text-amber-400";
    title.textContent = "أتممت جميع المستويات بإتقان!";
    playSound('momtazAbda3t');

    if (!gameState.completedStages.includes(currentStageData.id)) {
        gameState.completedStages.push(currentStageData.id);
    }
    const nextId = currentStageData.id + 1;
    if (!gameState.unlockedStages.includes(nextId)) {
        const exists = window.stagesDatabase.find(s => s.id === nextId);
        if (exists) gameState.unlockedStages.push(nextId);
    }

    // قفل الاسم بعد إتمام المرحلة 1 + توليد UUID
    if (currentStageData.id === 1 && !gameState.nameLocked) {
        gameState.nameLocked = true;
        if (!gameState.uuid) gameState.uuid = generateUUID();
        showToast("🔒 تم قفل اسمك نهائيًا مع توليد كود الشهادة");
    }

    // فحص إن كان قد أكمل كل المراحل
    if (gameState.completedStages.length >= 26) {
        setTimeout(() => {
            showToast("🎉 مبروك! أكملت جميع المراحل — يمكنك استخراج شهادتك الآن!");
        }, 2500);
    }

    saveState();
}

function restartCurrentStage() {
    if (!currentStageData) { goToDashboard(); return; }
    startStageQuiz(currentStageData.id);
}

// ==================== شهادة الإنجاز ====================
function openCertificate() {
    if (!gameState.studentName) {
        showToast("الرجاء إدخال اسمك أولاً");
        return;
    }
    window.open('certificate.html', '_blank');
}

// ==================== نظام التصفير ====================
function openResetModal() {
    const modal = document.getElementById('reset-modal');
    modal.classList.remove('hidden');
    document.getElementById('reset-code-input').value = "";
    document.getElementById('reset-error').classList.add('hidden');
}

function closeResetModal() {
    document.getElementById('reset-modal').classList.add('hidden');
}

function confirmReset() {
    const entered = document.getElementById('reset-code-input').value.trim();
    if (entered !== RESET_CODE) {
        document.getElementById('reset-error').classList.remove('hidden');
        return;
    }

    localStorage.removeItem(CONFIG.STORAGE_KEY);
    gameState = {
        studentName: "",
        nameLocked: false,
        uuid: "",
        hearts: CONFIG.MAX_HEARTS,
        score: 0,
        streak: 0,
        currentStageId: null,
        currentLevel: 1,
        unlockedStages: [1],
        completedStages: [],
        stageProgress: {},
        lastHeartRegenTime: Date.now(),
        version: CONFIG.STATE_VERSION
    };

    closeResetModal();
    showToast("✅ تم تصفير كل شيء بنجاح");
    setTimeout(() => {
        location.reload();
    }, 1200);
}

// ==================== Toast ====================
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = "fixed top-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-[60] text-sm font-bold flex items-center gap-3 border border-emerald-400/40 animate-fade-in";
    toast.innerHTML = `<i class="fa-solid fa-circle-info text-lg"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ==================== التشغيل ====================
window.addEventListener('load', function () {
    loadSavedState();
    regenHearts();
    updateGlobalHeader();

    const input = document.getElementById('student-name-input');
    const lockIcon = document.getElementById('name-lock-icon');

    if (gameState.studentName) {
        input.value = gameState.studentName;
    }

    if (gameState.nameLocked) {
        input.disabled = true;
        input.classList.add('opacity-60', 'cursor-not-allowed');
        if (lockIcon) lockIcon.classList.remove('hidden');
    } else {
        if (lockIcon) lockIcon.classList.add('hidden');
    }

    console.log(`✅ تم تحميل ${window.stagesDatabase.length} مرحلة.`);
});
