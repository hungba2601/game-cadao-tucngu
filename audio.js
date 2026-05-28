let isMuted = true;

// Tạo các đối tượng âm thanh tải từ file (bạn cần bỏ các file này vào chung thư mục)
const audioElements = {
    bgm: new Audio('bgm.mp3'),         // Nhạc nền (bạn tự kiếm file này)
    correct: new Audio('correct.wav'), // Tiếng báo đúng (đã tạo)
    wrong: new Audio('wrong.wav'),     // Tiếng báo sai (đã tạo)
    tick: new Audio('tick.wav')        // Tiếng tíc tắc đếm ngược 10 giây cuối (đã tạo)
};

// Cấu hình nhạc nền lặp lại liên tục và âm lượng nhỏ
audioElements.bgm.loop = true;
audioElements.bgm.volume = 0.4; 

const sounds = {
    correct: () => {
        if (isMuted) return;
        audioElements.correct.currentTime = 0; // Tua lại từ đầu
        audioElements.correct.play().catch(e => console.log("Chưa có file correct.wav"));
    },
    wrong: () => {
        if (isMuted) return;
        audioElements.wrong.currentTime = 0;
        audioElements.wrong.play().catch(e => console.log("Chưa có file wrong.wav"));
    },
    tick: () => {
        if (isMuted) return;
        audioElements.tick.currentTime = 0;
        audioElements.tick.play().catch(e => console.log("Chưa có file tick.wav"));
    }
};

function toggleAudio() {
    isMuted = !isMuted;
    const btn = document.getElementById('btn-audio');
    
    if (!isMuted) {
        btn.innerHTML = '🔊';
        btn.classList.add('active');
        audioElements.bgm.play().catch(e => console.log("Chưa có file bgm.mp3"));
    } else {
        btn.innerHTML = '🔇';
        btn.classList.remove('active');
        audioElements.bgm.pause();
    }
}

function initAudio() {
    if (isMuted) {
        toggleAudio();
    }
}
