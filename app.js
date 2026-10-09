/* ============================================================
   النحو الميسّر — المنطق الرئيسي
   ============================================================ */

// ==================== الإعدادات العامة ====================
const CONFIG = {
    MAX_HEARTS: 10,
    HEART_REGEN_MS: 10 * 60 * 1000,          // 10 دقائق
    HEART_REGEN_AMOUNT: 3,
    QUESTION_TIME: 30,                        // ثوانٍ
    POINTS_PER_CORRECT: 10,
    STREAK_FOR_BONUS_HEART: 5,
    STORAGE_KEY: 'nahw_game_state'
};

// ==================== الأصوات الثمانية ====================

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

// اختيار صوت التعزيز حسب طول السلسلة
function pickPraiseSound() {
    const s = gameState.streak;
    if (s >= 10) return 'momtazAbda3t';
    if (s >= 7)  return 'rae3Jedd';
    if (s >= 5)  return 'yaBatal';
    if (s >= 3)  return 'momtaz';
    const light = ['ahsant', 'ejabaSaheha', 'to3gebony', 'elaAlamam'];
    return light[Math.floor(Math.random() * light.length)];
}

// نغمة الخطأ (لعدم وجود wrong.mp3)
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
    } catch (e) { /* تجاهل */ }
}

// ==================== الحالة ====================
let gameState = {
    studentName: "",
    hearts: CONFIG.MAX_HEARTS,
    score: 0,
    streak: 0,
    currentStageId: null,
    currentQuestionIdx: 0,
    unlockedStages: [1],
    completedStages: [],
    lastHeartRegenTime: Date.now()
};

function loadSavedState() {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            gameState = { ...gameState, ...parsed };
        } catch (e) { console.error("خطأ في تحميل الحالة", e); }
    }
}

function saveState() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(gameState));
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
            showToast("❤️ تمت استعادة القلوب بنجاح! استمر في التعلم.");
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
     resultScreen, outOfHeartsScreen, stageRuleModal]
        .forEach(el => el && el.classList.add('hidden'));
}

function updateGlobalHeader() {
    document.getElementById('header-hearts').textContent = gameState.hearts;
    document.getElementById('header-score').textContent = gameState.score;
    if (gameState.studentName) {
        document.getElementById('header-student-name').textContent = gameState.studentName;
    }
}

function startJourney() {
    const name = document.getElementById('student-name-input').value.trim();
    if (!name) { showToast("الرجاء إدخال اسمك الكريم للبدء!"); return; }
    gameState.studentName = name;
    saveState();
    goToDashboard();
}

function goToDashboard() {
    regenHearts();
    hideAllScreens();
    updateGlobalHeader();

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
}

function openTrainingArena() {
    hideAllScreens();
    globalStatus.classList.remove('hidden');
    trainingScreen.classList.remove('hidden');
    renderTrainingTopics();
}
function goToWelcome() {
    // إيقاف أي مؤقتات شغّالة
    if (typeof questionTimerInterval !== 'undefined' && questionTimerInterval) {
        clearInterval(questionTimerInterval);
    }
    if (typeof stopHeartTimer === 'function') stopHeartTimer();

    hideAllScreens();
    globalStatus.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');

    // إعادة تعبئة الاسم إن وُجد
    if (gameState.studentName) {
        document.getElementById('student-name-input').value = gameState.studentName;
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
                        ${isCompleted ? '<i class="fa-solid fa-check text-emerald-400"></i> مكتملة' : (isUnlocked ? `المرحلة ${stage.id}` : '<i class="fa-solid fa-lock"></i> مقفلة')}
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
                    <span>ابدأ التحدي</span> <i class="fa-solid fa-arrow-left"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function openStageRuleModal(stageId) {
    const stage = window.stagesDatabase.find(s => s.id === stageId);
    if (!stage) return;
    document.getElementById('modal-rule-title').textContent = `دليل قسم: ${stage.title}`;
    document.getElementById('modal-rule-content').textContent = stage.ruleSummary;
    const icon = document.getElementById('modal-rule-icon');
    icon.className = `w-12 h-12 rounded-2xl bg-gradient-to-br ${stage.color} flex items-center justify-center text-white shadow-lg`;
    icon.innerHTML = `<i class="fa-solid ${stage.icon} text-xl"></i>`;
    document.getElementById('modal-start-quiz-btn').onclick = () => {
        closeStageRuleModal();
        startStageQuiz(stage.id);
    };
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
let questionCorrectCount = 0;
let questionTimerInterval = null;
let questionTimeLeft = CONFIG.QUESTION_TIME;

function startStageQuiz(stageId) {
    regenHearts();
    if (gameState.hearts <= 0) { goToDashboard(); return; }
    const stage = window.stagesDatabase.find(s => s.id === stageId);
    if (!stage) return;

    currentStageData = stage;
    gameState.currentStageId = stageId;
    gameState.currentQuestionIdx = 0;
    questionCorrectCount = 0;
    gameState.streak = 0;

    hideAllScreens();
    globalStatus.classList.remove('hidden');
    quizScreen.classList.remove('hidden');
    updateGlobalHeader();
    loadQuizQuestion();
}

function loadQuizQuestion() {
    if (questionTimerInterval) clearInterval(questionTimerInterval);
    questionTimeLeft = CONFIG.QUESTION_TIME;
    updateQuestionTimerUI();
    startQuestionTimer();

    const qData = currentStageData.questions[gameState.currentQuestionIdx];
    document.getElementById('current-q-index').textContent = gameState.currentQuestionIdx + 1;
    document.getElementById('total-q-index').textContent = currentStageData.questions.length;
    document.getElementById('streak-counter').textContent = gameState.streak;

    const pct = ((gameState.currentQuestionIdx + 1) / currentStageData.questions.length) * 100;
    document.getElementById('quiz-progress-bar').style.width = `${pct}%`;
    document.getElementById('quiz-stage-badge').textContent = currentStageData.title;
    document.getElementById('quiz-difficulty-badge').textContent = `مستوى ${qData.difficulty}`;
    document.getElementById('quiz-question-text').textContent = qData.q;
    document.getElementById('quiz-feedback-box').classList.add('hidden');

    const optionsContainer = document.getElementById('quiz-options-container');
    optionsContainer.innerHTML = '';
    const labels = ['أ', 'ب', 'ج', 'د'];

    qData.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = "option-btn w-full text-right p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition font-semibold text-white flex items-center justify-between group shadow-md";
        btn.innerHTML = `
            <span class="text-sm md:text-base">${opt}</span>
            <span class="w-8 h-8 rounded-xl bg-slate-700/80 flex items-center justify-center text-xs text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition">${labels[idx] || idx + 1}</span>
        `;
        btn.onclick = () => submitAnswer(idx, btn);
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
    const qData = currentStageData.questions[gameState.currentQuestionIdx];
    const buttons = disableOptions();
    revealCorrect(buttons, qData.answer);

    playErrorSound();
    gameState.streak = 0;
    loseHeart();

    const box = document.getElementById('quiz-feedback-box');
    document.getElementById('feedback-header').innerHTML =
        `<i class="fa-solid fa-clock text-rose-400"></i> <span class="text-rose-300">انتهى الوقت! خُصم قلب واحد</span>`;
    document.getElementById('feedback-explanation').textContent =
        `الإجابة الصحيحة: "${qData.options[qData.answer]}".\n${qData.explanation}`;
    document.getElementById('feedback-training-tip').classList.remove('hidden');
    box.className = "p-5 rounded-2xl border bg-rose-950/60 border-rose-500/40 space-y-3 animate-fade-in";
    box.classList.remove('hidden');

    if (gameState.hearts <= 0) setTimeout(goToDashboard, 1800);
}

function submitAnswer(selectedIndex, selectedButton) {
    if (questionTimerInterval) clearInterval(questionTimerInterval);
    const qData = currentStageData.questions[gameState.currentQuestionIdx];
    const buttons = disableOptions();
    const box = document.getElementById('quiz-feedback-box');
    const header = document.getElementById('feedback-header');
    const explanation = document.getElementById('feedback-explanation');

    if (selectedIndex === qData.answer) {
        selectedButton.classList.remove('bg-slate-800/80', 'border-slate-700');
        selectedButton.classList.add('bg-emerald-600/90', 'border-emerald-400');

        questionCorrectCount++;
        gameState.score += CONFIG.POINTS_PER_CORRECT;
        gameState.streak++;

        const soundKey = pickPraiseSound();
        playSound(soundKey);

        if (gameState.streak > 0 && gameState.streak % CONFIG.STREAK_FOR_BONUS_HEART === 0) {
            gainHeart();
            showToast("🎉 حصلت على قلب إضافي لإجاباتك المتتالية!");
        }

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
        header.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-400"></i> <span class="text-rose-300">إجابة خاطئة — خُصم قلب واحد</span>`;
        explanation.textContent = `الإجابة الصحيحة: "${qData.options[qData.answer]}".\n${qData.explanation}`;
        document.getElementById('feedback-training-tip').classList.remove('hidden');

        if (gameState.hearts <= 0) {
            saveState();
            setTimeout(goToDashboard, 1800);
        }
    }
    document.getElementById('streak-counter').textContent = gameState.streak;
    box.classList.remove('hidden');
    updateGlobalHeader();
    saveState();
}

function nextQuestion() {
    gameState.currentQuestionIdx++;
    if (gameState.currentQuestionIdx < currentStageData.questions.length) {
        loadQuizQuestion();
    } else {
        finishStage();
    }
}

function finishStage() {
    if (questionTimerInterval) clearInterval(questionTimerInterval);
    hideAllScreens();
    globalStatus.classList.remove('hidden');
    resultScreen.classList.remove('hidden');

    const total = currentStageData.questions.length;
    const pct = Math.round((questionCorrectCount / total) * 100);

    document.getElementById('result-stage-title').textContent = currentStageData.title;
    document.getElementById('result-correct-count').textContent = questionCorrectCount;
    document.getElementById('result-total-count').textContent = total;

    const badge = document.getElementById('result-badge-text');
    const icon = document.getElementById('result-trophy-icon');
    const title = document.getElementById('result-title-text');

    if (pct === 100) {
        badge.textContent = "إتقان تام 🏆";
        badge.className = "inline-block px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold border border-amber-500/30";
        icon.className = "fa-solid fa-trophy text-5xl text-amber-400";
        title.textContent = "أتممت المرحلة بإتقان!";
        playSound('momtazAbda3t');
    } else if (pct >= 80) {
        badge.textContent = "ممتاز";
        badge.className = "inline-block px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30";
        icon.className = "fa-solid fa-trophy text-5xl text-amber-400";
        title.textContent = "أتممت المرحلة بنجاح!";
        playSound('rae3Jedd');
    } else if (pct >= 60) {
        badge.textContent = "جيد — يحتاج مراجعة";
        badge.className = "inline-block px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-xs font-bold border border-teal-500/30";
        icon.className = "fa-solid fa-medal text-5xl text-teal-300";
        title.textContent = "أتممت المرحلة";
        playSound('momtaz');
    } else {
        badge.textContent = "راجع دليل القاعدة";
        badge.className = "inline-block px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-bold border border-rose-500/30";
        icon.className = "fa-solid fa-book-open text-5xl text-rose-300";
        title.textContent = "تحتاج لمزيد من التدريب";
        playSound('elaAlamam');
    }

    if (!gameState.completedStages.includes(currentStageData.id)) {
        gameState.completedStages.push(currentStageData.id);
    }
    const nextId = currentStageData.id + 1;
    if (!gameState.unlockedStages.includes(nextId)) {
        const exists = window.stagesDatabase.find(s => s.id === nextId);
        if (exists) gameState.unlockedStages.push(nextId);
    }
    saveState();
}

function restartCurrentStage() {
    if (!currentStageData) { goToDashboard(); return; }
    startStageQuiz(currentStageData.id);
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
    if (gameState.studentName) {
        document.getElementById('student-name-input').value = gameState.studentName;
    }
    console.log(`✅ تم تحميل ${window.stagesDatabase.length} مرحلة من بنك الأسئلة.`);
});
