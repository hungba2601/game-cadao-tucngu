/* ============================================
   Vietnamese Proverb Guessing Game - App Logic
   Uses Gemini FREE text API to generate SVG illustrations
   ============================================ */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// <-- DÁN LINK WEB APP CỦA GOOGLE SHEET VÀO ĐÂY (NẾU CÓ)
const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbyKpyW_p8am85tK2XFcXsK4HujH-9lbMotHQqwgEJQQ6dQAnTHc-rwH0QMBlblCDQT1/exec'; 

const state = {
    apiKey: '',
    model: 'gemini-3-flash-preview',
    timeLimit: 60,
    sheetUrl: GOOGLE_SHEET_API_URL,
    fetchedProverbs: [],
    combinedProverbs: [...PROVERBS_DATA],
    timeLeft: 0,
    timerInterval: null,
    currentAnswer: '',
    score: 0,
    totalRounds: 0,
    previousProverbs: [],
};

const $ = (id) => document.getElementById(id);

const dom = {
    btnSettings: $('btn-settings'),
    btnInstructions: $('btn-instructions'),
    btnCloseSettings: $('btn-close-settings'),
    btnCloseInstructions: $('btn-close-instructions'),
    btnSaveSettings: $('btn-save-settings'),
    btnStart: $('btn-start'),
    btnHint: $('btn-hint'),
    btnSubmit: $('btn-submit'),
    btnNextCorrect: $('btn-next-correct'),
    btnNextWrong: $('btn-next-wrong'),
    btnRetry: $('btn-retry'),
    btnOpenSettings: $('btn-open-settings'),
    modalSettings: $('modal-settings'),
    modalInstructions: $('modal-instructions'),
    btnOkInstructions: $('btn-ok-instructions'),
    apiKeyInput: $('input-api-key'),
    timeLimitInput: $('input-time-limit'),
    customDataInput: $('input-custom-data'),
    btnPushData: $('btn-push-data'),
    pushDataStatus: $('push-data-status'),
    btnSaveSettings: $('btn-save-settings'),
    answerInput: $('answer-input'),
    sceneCard: $('scene-card'),
    hintBox: $('hint-box'),
    hintMaskedText: $('hint-masked-text'),
    roundBadge: $('round-badge'),
    timerBadge: $('timer-badge'),
    scoreDisplay: $('score-display'),
    scoreText: $('score-text'),
    correctAnswerText: $('correct-answer-text'),
    wrongAnswerText: $('wrong-answer-text'),
    wrongExplanation: $('wrong-explanation'),
    correctScore: $('correct-score'),
    wrongScore: $('wrong-score'),
    errorMessage: $('error-message'),
    confettiCanvas: $('confetti-canvas'),
};

// ---- Init ----
function init() {
    // Load config from localStorage
    state.apiKey = localStorage.getItem('gemini_api_key') || '';
    state.timeLimit = parseInt(localStorage.getItem('gemini_time_limit')) || 60;
    
    dom.apiKeyInput.value = state.apiKey;
    dom.timeLimitInput.value = state.timeLimit;

    if (state.sheetUrl) {
        fetchSheetData();
    }

    // Attach Event Listeners
    dom.btnStart.addEventListener('click', () => {
        if (typeof initAudio !== 'undefined') initAudio();
        if (!state.apiKey) {
            dom.modalSettings.classList.remove('hidden');
        } else {
            startRound();
        }
    });

    // Setup tabs in settings modal
    const tabs = document.querySelectorAll('.modal-tab');
    const contents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    if(dom.btnPushData) {
        dom.btnPushData.addEventListener('click', pushData);
    }

    dom.btnSettings.addEventListener('click', () => dom.modalSettings.classList.remove('hidden'));
    dom.btnCloseSettings.addEventListener('click', () => dom.modalSettings.classList.add('hidden'));
    
    if (dom.btnInstructions) {
        dom.btnInstructions.addEventListener('click', () => dom.modalInstructions.classList.remove('hidden'));
    }
    if (dom.btnCloseInstructions) {
        dom.btnCloseInstructions.addEventListener('click', () => dom.modalInstructions.classList.add('hidden'));
    }
    if (dom.btnOkInstructions) {
        dom.btnOkInstructions.addEventListener('click', () => dom.modalInstructions.classList.add('hidden'));
    }

    dom.btnSaveSettings.addEventListener('click', saveSettings);
    dom.btnHint.addEventListener('click', () => dom.hintBox.classList.toggle('hidden'));
    dom.btnSubmit.addEventListener('click', submitAnswer);
    dom.btnNextCorrect.addEventListener('click', startRound);
    dom.btnNextWrong.addEventListener('click', startRound);
    dom.btnRetry.addEventListener('click', startRound);
    dom.btnOpenSettings.addEventListener('click', () => { showScreen('welcome'); openSettings(); });
    dom.answerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAnswer(); });
    dom.modalSettings.addEventListener('click', (e) => { if (e.target === dom.modalSettings) closeModal(); });
    if (dom.modalInstructions) {
        dom.modalInstructions.addEventListener('click', (e) => { if (e.target === dom.modalInstructions) dom.modalInstructions.classList.add('hidden'); });
    }
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    showScreen('welcome');
}

// ---- Settings ----
function saveSettings() {
    const key = dom.apiKeyInput.value.trim();
    const time = parseInt(dom.timeLimitInput.value);

    if (key) {
        localStorage.setItem('gemini_api_key', key);
        state.apiKey = key;
    }
    
    if (time >= 10 && time <= 300) {
        localStorage.setItem('gemini_time_limit', time);
        state.timeLimit = time;
    }

    dom.modalSettings.classList.add('hidden');
    // Start game if on welcome screen and key is provided
    if (!dom.screenWelcome.classList.contains('hidden') && state.apiKey) {
        startRound();
    }
}

async function fetchSheetData() {
    try {
        const response = await fetch(state.sheetUrl);
        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
            state.fetchedProverbs = result.data;
            const allProverbs = new Set([...PROVERBS_DATA, ...state.fetchedProverbs]);
            state.combinedProverbs = Array.from(allProverbs);
            console.log("Loaded " + state.fetchedProverbs.length + " proverbs from Google Sheet.");
        }
    } catch (e) {
        console.error("Failed to fetch sheet data:", e);
    }
}

async function pushData() {
    const dataText = dom.customDataInput.value.trim();
    if (!dataText) {
        dom.pushDataStatus.textContent = "Vui lòng nhập dữ liệu trước khi gửi.";
        dom.pushDataStatus.style.color = "var(--error)";
        return;
    }
    
    if (!state.sheetUrl) {
        dom.pushDataStatus.textContent = "Vui lòng nhập và lưu URL Google Apps Script trước.";
        dom.pushDataStatus.style.color = "var(--error)";
        return;
    }

    const newProverbs = dataText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    
    dom.pushDataStatus.textContent = "Đang gửi dữ liệu...";
    dom.pushDataStatus.style.color = "var(--gold)";
    dom.btnPushData.disabled = true;

    try {
        const response = await fetch(state.sheetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({ proverbs: newProverbs })
        });
        const result = await response.json();

        if (result.success) {
            dom.pushDataStatus.textContent = `Đã thêm thành công ${result.added} câu!`;
            dom.pushDataStatus.style.color = "var(--success)";
            dom.customDataInput.value = "";
            fetchSheetData();
        } else {
            dom.pushDataStatus.textContent = "Lỗi: " + (result.error || "Không xác định");
            dom.pushDataStatus.style.color = "var(--error)";
        }
    } catch (e) {
        dom.pushDataStatus.textContent = "Lỗi kết nối. Hãy kiểm tra lại URL Apps Script.";
        dom.pushDataStatus.style.color = "var(--error)";
    } finally {
        dom.btnPushData.disabled = false;
    }
}

function openSettings() {
    dom.apiKeyInput.value = state.apiKey;
    dom.timeLimitInput.value = state.timeLimit;
    dom.modalSettings.classList.remove('hidden');
}

function closeModal() {
    dom.modalSettings.classList.add('hidden');
    if (dom.modalInstructions) {
        dom.modalInstructions.classList.add('hidden');
    }
}

// ---- Screen Management ----
function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = $(`screen-${name}`);
    if (screen) screen.classList.add('active');
    dom.scoreDisplay.classList.toggle('hidden', name === 'welcome');
}

function updateScore() {
    dom.scoreText.textContent = `${state.score} / ${state.totalRounds}`;
}

// ---- Gemini API (Text only - FREE) ----
async function callGemini(prompt) {
    if (!state.apiKey) {
        throw new Error('Chưa cài đặt API Key! Nhấn ⚙️ để nhập API Key.');
    }

    const res = await fetch(`${API_BASE}/${state.model}:generateContent?key=${state.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 1.0 },
        }),
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData?.error?.message || `HTTP ${res.status}`;
        throw new Error(`Lỗi API: ${msg}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ---- Timer Logic ----
function startTimer() {
    stopTimer();
    state.timeLeft = state.timeLimit;
    updateTimerUI();
    dom.timerBadge.classList.remove('danger');
    
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateTimerUI();
        
        if (state.timeLeft <= 10 && state.timeLeft > 0) {
            dom.timerBadge.classList.add('danger');
            if (typeof sounds !== 'undefined') sounds.tick();
        }
        
        if (state.timeLeft <= 0) {
            stopTimer();
            handleTimeout();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(state.timerInterval);
}

function updateTimerUI() {
    if(dom.timerBadge) dom.timerBadge.textContent = `⏳ ${state.timeLeft}s`;
}

function handleTimeout() {
    dom.wrongAnswerText.textContent = state.currentAnswer || 'Không có đáp án';
    dom.wrongExplanation.textContent = 'Hết giờ! Bạn đã suy nghĩ quá lâu.';
    dom.wrongScore.textContent = `Điểm hiện tại: ${state.score} / ${state.totalRounds}`;
    showScreen('wrong');
}

// ---- Game Logic ----
async function startRound() {
    stopTimer();
    if(dom.timerBadge) {
        dom.timerBadge.textContent = `⏳ --s`;
        dom.timerBadge.classList.remove('danger');
    }
    showScreen('loading');
    dom.hintBox.classList.add('hidden');
    dom.answerInput.value = '';

    const availableProverbs = state.combinedProverbs.filter(p => !state.previousProverbs.includes(p));
    let selectedProverb = "";
    if (availableProverbs.length > 0) {
        selectedProverb = availableProverbs[Math.floor(Math.random() * availableProverbs.length)];
    } else {
        state.previousProverbs = [];
        selectedProverb = state.combinedProverbs[Math.floor(Math.random() * state.combinedProverbs.length)];
    }
    state.previousProverbs.push(selectedProverb);

    const prompt = `Bạn là họa sĩ minh họa cho trò chơi "Nhìn hình đoán ca dao tục ngữ Việt Nam".

NHIỆM VỤ:
Vẽ 1 bức tranh SVG minh họa SINH ĐỘNG cho câu ca dao/tục ngữ sau:
"${selectedProverb}"

QUY TẮC VẼ SVG (RẤT QUAN TRỌNG):
- viewBox="0 0 500 350"
- PHẢI có nền gradient đẹp (bầu trời, đồng quê, hoặc cảnh phù hợp)
- VẼ NHÂN VẬT bằng: circle cho đầu, ellipse/rect cho thân, line/path cho tay chân. Thêm chi tiết như nón lá, áo, tóc
- VẼ THIÊN NHIÊN: mặt trời (circle vàng + tia sáng), mây (ellipse trắng chồng nhau), cây (rect nâu cho thân + ellipse/circle xanh cho tán), hoa, sông/suối (path cong xanh dương), núi (polygon), ruộng lúa
- VẼ ĐỘNG VẬT nếu cần: trâu (ellipse + sừng), chim (path cong), cá (ellipse + đuôi)
- VẼ VẬT DỤNG: nhà tranh (rect + polygon mái), thuyền, cuốc xẻng, đèn, lửa, sách
- Dùng màu sắc TƯƠI SÁNG, đa dạng, hài hòa
- Bức tranh phải RÕ RÀNG, dễ nhận ra nội dung
- TUYỆT ĐỐI KHÔNG dùng thẻ <text>, <tspan> hay bất kỳ chữ viết nào trong SVG
- KHÔNG dùng <image>, <use>, <foreignObject>
- CHỈ dùng: svg, g, rect, circle, ellipse, line, polyline, polygon, path, defs, linearGradient, radialGradient, stop

TRẢ VỀ ĐÚNG FORMAT NÀY:
SVG_START
<svg viewBox="0 0 500 350" xmlns="http://www.w3.org/2000/svg">
...code SVG ở đây...
</svg>
SVG_END
CHU_DE: [1-2 từ thể hiện chủ đề, VD: KIÊN TRÌ]
TU_KHOA: [2 cụm từ ngắn (2-3 chữ) liên quan hình ảnh, ngăn cách bằng dấu |. Kèm 1 emoji ở đầu mỗi cụm. VD: 💧 Nước chảy | 🪨 Đá mòn]`;

    try {
        const text = await callGemini(prompt);

        // Parse SVG
        const svgMatch = text.match(/SVG_START\s*([\s\S]*?)\s*SVG_END/i);
        const topicMatch = text.match(/CHU_DE:\s*(.+)/i);
        const keywordsMatch = text.match(/TU_KHOA:\s*(.+)/i);

        let svgCode = svgMatch ? svgMatch[1].trim() : '';
        state.currentAnswer = selectedProverb;
        const topicText = topicMatch ? topicMatch[1].trim() : '';
        const keywordsText = keywordsMatch ? keywordsMatch[1].trim() : '';

        // Sanitize SVG - remove any <text>, <script>, <image>, etc.
        svgCode = sanitizeSVG(svgCode);

        if (!svgCode) {
            throw new Error('AI không tạo được hình minh họa. Vui lòng thử lại.');
        }

        state.totalRounds++;
        dom.roundBadge.textContent = `Câu ${state.totalRounds}`;
        if(dom.hintMaskedText) dom.hintMaskedText.textContent = generateMaskedHint(state.currentAnswer);
        updateScore();

        renderScene(svgCode, null, topicText, keywordsText);
        showScreen('game');
        setTimeout(() => dom.answerInput.focus(), 400);
        startTimer();

    } catch (err) {
        if (err.message.includes('Quota exceeded') || err.message.includes('429')) {
            const match = err.message.match(/retry in ([\d\.]+)s/i);
            const waitTime = match ? Math.ceil(parseFloat(match[1])) : 60;
            dom.errorMessage.innerHTML = `Google AI đang quá tải do hết lượt miễn phí.<br><br>Vui lòng đợi <b>${waitTime} giây</b> rồi ấn <b>Thử Lại</b> nhé!`;
        } else {
            dom.errorMessage.textContent = err.message;
        }
        showScreen('error');
    }
}

function sanitizeSVG(svg) {
    if (!svg) return '';
    // Remove dangerous tags
    svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '');
    svg = svg.replace(/<text[\s\S]*?<\/text>/gi, '');
    svg = svg.replace(/<tspan[\s\S]*?<\/tspan>/gi, '');
    svg = svg.replace(/<image[\s\S]*?\/>/gi, '');
    svg = svg.replace(/<image[\s\S]*?<\/image>/gi, '');
    svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
    svg = svg.replace(/<use[\s\S]*?\/>/gi, '');
    // Remove on* event handlers
    svg = svg.replace(/\bon\w+\s*=\s*"[^"]*"/gi, '');
    svg = svg.replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
    return svg;
}

function renderScene(svgCode, description, topic, keywords) {
    let keywordsHtml = '';
    if (keywords) {
        keywordsHtml = keywords.split('|').map(k => `<span class="badge-pill">${escapeHTML(k.trim())}</span>`).join('');
    }

    dom.sceneCard.innerHTML = `
        <div class="scene-image-container">
            <div class="scene-svg-wrap">${svgCode}</div>
            ${topic ? `<div class="badge-topic">${escapeHTML(topic)}</div>` : ''}
            ${keywordsHtml ? `<div class="badge-keywords">${keywordsHtml}</div>` : ''}
        </div>
    `;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function generateMaskedHint(text) {
    return text.split(/\s+/).map(word => {
        if (!word) return '';
        const match = word.match(/^([^a-zA-ZÀ-ỹđĐ]*)([a-zA-ZÀ-ỹđĐ])(.*)$/);
        if (!match) return word;
        const prefix = match[1];
        const firstLetter = match[2];
        const rest = match[3];
        const maskedRest = rest.replace(/[a-zA-ZÀ-ỹđĐ]/g, ' _');
        return prefix + firstLetter + maskedRest;
    }).join('   ');
}

async function submitAnswer() {
    const userAnswer = dom.answerInput.value.trim();
    if (!userAnswer) {
        dom.answerInput.style.borderColor = 'var(--error)';
        dom.answerInput.classList.add('shake');
        setTimeout(() => {
            dom.answerInput.style.borderColor = '';
            dom.answerInput.classList.remove('shake');
        }, 600);
        return;
    }

    stopTimer();
    dom.btnSubmit.disabled = true;
    dom.btnSubmit.textContent = 'Đang chấm...';

    const checkPrompt = `Bạn là trọng tài trò chơi đoán ca dao tục ngữ Việt Nam.

ĐÁP ÁN ĐÚNG: "${state.currentAnswer}"
CÂU TRẢ LỜI: "${userAnswer}"

Xác định câu trả lời ĐÚNG hoặc GẦN ĐÚNG không.
Chấp nhận: sai chính tả nhẹ, thiếu dấu, thiếu vài từ không quan trọng, diễn đạt tương đương.
Không chấp nhận: hoàn toàn sai nghĩa hoặc khác câu.

CHỈ trả về JSON:
{"correct": true, "explanation": "lý do"} hoặc {"correct": false, "explanation": "lý do"}`;

    let result = { correct: false, explanation: '' };

    try {
        const text = await callGemini(checkPrompt);
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        
        if (jsonMatch) {
            try { result = JSON.parse(jsonMatch[0]); } catch {}
        }

        if (!jsonMatch) {
            result.correct = normalizeText(userAnswer).includes(normalizeText(state.currentAnswer))
                || normalizeText(state.currentAnswer).includes(normalizeText(userAnswer));
        }
    } catch (err) {
        console.warn("Lỗi chấm điểm AI, chuyển sang chấm điểm cơ bản:", err);
        const normUser = normalizeText(userAnswer);
        const normAns = normalizeText(state.currentAnswer);
        result.correct = normUser.includes(normAns) || normAns.includes(normUser);
        result.explanation = result.correct ? '' : 'Sai rồi! (Chấm điểm cơ bản do mạng quá tải)';
    }

    if (result.correct) {
        if (typeof sounds !== 'undefined') sounds.correct();
        state.score++;
        updateScore();
        dom.correctAnswerText.textContent = state.currentAnswer;
        dom.correctScore.textContent = `Điểm hiện tại: ${state.score} / ${state.totalRounds}`;
        showScreen('correct');
        launchConfetti();
    } else {
        if (typeof sounds !== 'undefined') sounds.wrong();
        dom.wrongAnswerText.textContent = state.currentAnswer;
        dom.wrongExplanation.textContent = result.explanation || 'Đừng nản, thử câu khác nhé!';
        dom.wrongScore.textContent = `Điểm hiện tại: ${state.score} / ${state.totalRounds}`;
        showScreen('wrong');
    }

    dom.btnSubmit.disabled = false;
    dom.btnSubmit.textContent = 'Trả lời';
}

function normalizeText(text) {
    return text.toLowerCase()
        .replace(/[^a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ\s]/g, '')
        .replace(/\s+/g, ' ').trim();
}

// ---- Confetti ----
function launchConfetti() {
    const canvas = dom.confettiCanvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const colors = ['#C41E3A', '#D4AF37', '#22C55E', '#F5EDE4', '#FF6B35', '#E8324A', '#F0D080'];
    const particles = [];

    for (let i = 0; i < 180; i++) {
        particles.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * 200,
            y: canvas.height * 0.4,
            vx: (Math.random() - 0.5) * 16,
            vy: Math.random() * -18 - 4,
            size: Math.random() * 8 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 12,
            gravity: 0.25 + Math.random() * 0.1,
            opacity: 1,
        });
    }

    let frame = 0;
    const maxFrames = 180;

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        frame++;
        for (const p of particles) {
            p.x += p.vx; p.vy += p.gravity; p.y += p.vy;
            p.vx *= 0.99; p.rotation += p.rotSpeed;
            if (frame > maxFrames * 0.6) p.opacity = Math.max(0, p.opacity - 0.02);
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        }
        if (frame < maxFrames) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animate();
}

document.addEventListener('DOMContentLoaded', init);
