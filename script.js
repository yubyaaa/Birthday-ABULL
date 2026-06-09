/* ==========================================================================
   SOUND ENGINE (WEB AUDIO API CHIPTUNE SYNTHESIZER)
   ========================================================================== */

class ChiptuneSynth {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.musicInterval = null;
        this.currentNoteIndex = 0;
        this.waveType = 'square'; // 'square', 'sawtooth', 'triangle', 'sine'
        
        // Happy Birthday Melody in 8-bit (Note, Duration in beats, Octave)
        this.melody = [
            { note: 'C', octave: 4, duration: 0.75 },
            { note: 'C', octave: 4, duration: 0.25 },
            { note: 'D', octave: 4, duration: 1 },
            { note: 'C', octave: 4, duration: 1 },
            { note: 'F', octave: 4, duration: 1 },
            { note: 'E', octave: 4, duration: 2 },
            
            { note: 'C', octave: 4, duration: 0.75 },
            { note: 'C', octave: 4, duration: 0.25 },
            { note: 'D', octave: 4, duration: 1 },
            { note: 'C', octave: 4, duration: 1 },
            { note: 'G', octave: 4, duration: 1 },
            { note: 'F', octave: 4, duration: 2 },
            
            { note: 'C', octave: 4, duration: 0.75 },
            { note: 'C', octave: 4, duration: 0.25 },
            { note: 'C', octave: 5, duration: 1 },
            { note: 'A', octave: 4, duration: 1 },
            { note: 'F', octave: 4, duration: 1 },
            { note: 'E', octave: 4, duration: 1 },
            { note: 'D', octave: 4, duration: 2 },
            
            { note: 'Bb', octave: 4, duration: 0.75 },
            { note: 'Bb', octave: 4, duration: 0.25 },
            { note: 'A', octave: 4, duration: 1 },
            { note: 'F', octave: 4, duration: 1 },
            { note: 'G', octave: 4, duration: 1 },
            { note: 'F', octave: 4, duration: 2 }
        ];

        // Cute simple 8-bit arpeggio harmony (Bassline notes running parallel)
        this.bassline = [
            'F3', 'F3', 'C3', 'C3', 'F3', 'C3',
            'C3', 'C3', 'G3', 'G3', 'F3', 'C3',
            'F3', 'F3', 'F3', 'D3', 'Bb2', 'C3',
            'Bb2', 'Bb2', 'F3', 'F3', 'C3', 'F3'
        ];

        // Frequency mapping
        this.noteFreqs = {
            'C': 261.63, 'C#': 277.18, 'D': 293.66, 'Eb': 311.13, 'E': 329.63,
            'F': 349.23, 'F#': 369.99, 'G': 392.00, 'G#': 415.30, 'A': 440.00,
            'Bb': 466.16, 'B': 493.88
        };
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    getFrequency(note, octave) {
        const baseFreq = this.noteFreqs[note];
        if (!baseFreq) return 0;
        const octaveDiff = octave - 4;
        return baseFreq * Math.pow(2, octaveDiff);
    }

    playTone(freq, type, duration, volume = 0.1, slideTo = null) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        }
        
        gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // Effect Sounds
    playBootSound() {
        this.init();
        setTimeout(() => {
            this.playTone(375, 'square', 0.08, 0.15);
            setTimeout(() => {
                this.playTone(750, 'square', 0.35, 0.15);
            }, 80);
        }, 100);
    }

    playClickSound() {
        this.init();
        this.playTone(600, 'triangle', 0.05, 0.1);
    }

    playSelectSound() {
        this.init();
        this.playTone(150, 'square', 0.04, 0.1, 300);
    }

    playSuccessSound() {
        this.init();
        const now = this.ctx ? this.ctx.currentTime : 0;
        this.playTone(523.25, 'square', 0.1, 0.12); // C5
        setTimeout(() => this.playTone(659.25, 'square', 0.1, 0.12), 100); // E5
        setTimeout(() => this.playTone(783.99, 'square', 0.1, 0.12), 200); // G5
        setTimeout(() => this.playTone(1046.50, 'square', 0.25, 0.15), 300); // C6
    }

    playErrorSound() {
        this.init();
        this.playTone(220, 'sawtooth', 0.25, 0.15, 110);
    }

    playExplosionSound() {
        this.init();
        if (!this.ctx) return;
        
        // Generate pseudo 8-bit explosion noise using short square wave frequency sweep
        this.playTone(400, 'sawtooth', 0.35, 0.2, 40);
    }

    // Music Sequencer Loop
    startMusic() {
        this.init();
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.currentNoteIndex = 0;
        
        const tempo = 120; // BPM
        const beatDuration = 60 / tempo; // Duration of one beat in seconds
        
        const playNextStep = () => {
            if (!this.isPlaying) return;
            
            const currentItem = this.melody[this.currentNoteIndex];
            const noteFreq = this.getFrequency(currentItem.note, currentItem.octave);
            const stepDuration = currentItem.duration * beatDuration;
            
            // Play melody channel
            if (noteFreq > 0) {
                this.playTone(noteFreq, this.waveType, stepDuration - 0.05, 0.04);
            }
            
            // Play simple accompaniment bassline channel (lower pitch, triangle wave for warm hum)
            const bassNoteStr = this.bassline[this.currentNoteIndex % this.bassline.length];
            const bassNote = bassNoteStr.slice(0, -1);
            const bassOctave = parseInt(bassNoteStr.slice(-1));
            const bassFreq = this.getFrequency(bassNote, bassOctave);
            if (bassFreq > 0) {
                this.playTone(bassFreq, 'triangle', stepDuration, 0.07);
            }
            
            this.currentNoteIndex = (this.currentNoteIndex + 1) % this.melody.length;
            
            // Schedule the next note
            this.musicInterval = setTimeout(playNextStep, stepDuration * 1000);
        };
        
        playNextStep();
        
        // Update Visuals
        document.getElementById('visualizer').classList.add('playing');
        document.getElementById('now-playing').innerText = `Lagu: Happy B-Day (${this.waveType.toUpperCase()})`;
        document.getElementById('btn-music-toggle').innerText = "Matikan Musik 🔇";
    }

    stopMusic() {
        this.isPlaying = false;
        if (this.musicInterval) {
            clearTimeout(this.musicInterval);
            this.musicInterval = null;
        }
        
        // Update Visuals
        document.getElementById('visualizer').classList.remove('playing');
        document.getElementById('now-playing').innerText = "Lagu: OFF";
        document.getElementById('btn-music-toggle').innerText = "Nyalakan Musik 🎵";
    }

    toggleMusic() {
        if (this.isPlaying) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
    }

    cycleWaveform() {
        const waves = ['square', 'sawtooth', 'triangle', 'sine'];
        const currentIdx = waves.indexOf(this.waveType);
        this.waveType = waves[(currentIdx + 1) % waves.length];
        
        this.playSelectSound();
        
        // Refresh BGM status text if playing
        if (this.isPlaying) {
            document.getElementById('now-playing').innerText = `Lagu: Happy B-Day (${this.waveType.toUpperCase()})`;
        }
        
        // Display briefly on menu footer if in menu
        const footer = document.querySelector('.menu-footer');
        if (footer) {
            footer.innerText = `MUSIC WAVE: ${this.waveType.toUpperCase()}`;
            setTimeout(() => {
                footer.innerText = "SELECT MUSIC: CHIPTUNE";
            }, 1500);
        }
    }
}

const synth = new ChiptuneSynth();


/* ==========================================================================
   GAME STATE & NAVIGATION ENGINE
   ========================================================================== */

const STATES = {
    BOOT: 'state-boot',
    MENU: 'state-menu',
    STORY: 'state-story',
    GALLERY: 'state-gallery',
    QUIZ: 'state-quiz',
    WISH: 'state-wish'
};

let currentState = STATES.BOOT;

function changeState(newState) {
    // Hide all states
    document.querySelectorAll('.screen-state').forEach(el => el.classList.remove('active'));
    
    // Show new state
    const targetEl = document.getElementById(newState);
    if (targetEl) {
        targetEl.classList.add('active');
    }
    
    currentState = newState;
    
    // Trigger specific screen load behaviors
    if (newState === STATES.MENU) {
        resetMenuSelection();
    } else if (newState === STATES.STORY) {
        startStoryScreen();
    } else if (newState === STATES.GALLERY) {
        startGalleryScreen();
    } else if (newState === STATES.QUIZ) {
        startQuizScreen();
    } else if (newState === STATES.WISH) {
        startWishScreen();
    }
}


/* ==========================================================================
   SCREEN 0: BOOT LOGO ANIMATION
   ========================================================================== */

function runBootSequence() {
    const batteryLed = document.getElementById('battery-led');
    const logoContainer = document.querySelector('.boot-logo-container');
    
    // Turn on battery LED
    batteryLed.classList.add('on');
    
    // Play Gameboy beep sound
    synth.playBootSound();
    
    // Slide down logo
    setTimeout(() => {
        logoContainer.classList.add('loaded');
    }, 200);
    
    // Transition to main menu automatically
    setTimeout(() => {
        changeState(STATES.MENU);
    }, 2800);
}


/* ==========================================================================
   SCREEN 1: MAIN MENU SELECTION
   ========================================================================== */

let menuIndex = 0;
const menuOptionsCount = 4;

function resetMenuSelection() {
    menuIndex = 0;
    updateMenuVisuals();
}

function updateMenuVisuals() {
    const options = document.querySelectorAll('.menu-option');
    options.forEach((opt, idx) => {
        const cursor = opt.querySelector('.cursor');
        if (idx === menuIndex) {
            opt.classList.add('active');
            cursor.innerHTML = '♥';
        } else {
            opt.classList.remove('active');
            cursor.innerHTML = '&nbsp;';
        }
    });
}

function handleMenuNavigation(direction) {
    synth.playSelectSound();
    if (direction === 'UP') {
        menuIndex = (menuIndex - 1 + menuOptionsCount) % menuOptionsCount;
    } else if (direction === 'DOWN') {
        menuIndex = (menuIndex + 1) % menuOptionsCount;
    }
    updateMenuVisuals();
}

function selectMenuOption() {
    synth.playSuccessSound();
    
    // Try to auto-start music if not playing yet (for client experience)
    if (!synth.isPlaying) {
        synth.startMusic();
    }

    switch (menuIndex) {
        case 0:
            changeState(STATES.STORY);
            break;
        case 1:
            changeState(STATES.GALLERY);
            break;
        case 2:
            changeState(STATES.QUIZ);
            break;
        case 3:
            changeState(STATES.WISH);
            break;
    }
}


/* ==========================================================================
   SCREEN 2: VISUAL NOVEL STORY SCREEN
   ========================================================================== */

const storyLines = [
    { text: "Halo Abull! Selamat datang di LOVE-BUY Special Edition-mu! 💖", sprite: "💖" },
    { text: "Hari ini sangat istimewa karena kamu resmi memasuki umur kepala dua! 🎉", sprite: "🎂" },
    { text: "Selamat Ulang Tahun ke-20! Di umur baru ini semoga semua impianmu tercapai satu per satu.", sprite: "✨" },
    { text: "Terima kasih sudah menemani hari-hariku dengan senyuman dan keceriaanmu yang manis. 🥰", sprite: "🥰" },
    { text: "Aku menyiapkan beberapa kejutan kecil di gameboy ini untuk merayakannya.", sprite: "🎁" },
    { text: "Pintu kejutan berikutnya terbuka! Silakan tekan B untuk kembali ke menu, lalu pilih MEMORY BOX!", sprite: "🔓" }
];

let storyIndex = 0;
let isTyping = false;
let typeInterval = null;

function startStoryScreen() {
    storyIndex = 0;
    showStoryLine();
}

function showStoryLine() {
    if (storyIndex >= storyLines.length) {
        changeState(STATES.MENU);
        return;
    }
    
    const line = storyLines[storyIndex];
    const bubble = document.getElementById('story-bubble');
    const sprite = document.getElementById('story-sprite');
    
    sprite.innerText = line.sprite;
    
    // Typewriter effect
    bubble.innerText = "";
    isTyping = true;
    let charIdx = 0;
    
    if (typeInterval) clearInterval(typeInterval);
    
    typeInterval = setInterval(() => {
        bubble.innerText += line.text[charIdx];
        charIdx++;
        if (charIdx >= line.text.length) {
            clearInterval(typeInterval);
            isTyping = false;
        }
    }, 45); // Typing speed
}

function handleStoryNext() {
    if (isTyping) {
        // Instant autocomplete if user presses A during typing
        clearInterval(typeInterval);
        document.getElementById('story-bubble').innerText = storyLines[storyIndex].text;
        isTyping = false;
        synth.playClickSound();
    } else {
        storyIndex++;
        synth.playClickSound();
        if (storyIndex < storyLines.length) {
            showStoryLine();
        } else {
            // Finished story, go back to menu
            changeState(STATES.MENU);
        }
    }
}


/* ==========================================================================
   SCREEN 3: MEMORY PHOTO GALLERY
   ========================================================================== */

const memoryImages = [
    { src: 'assets/curug 1.png', caption: 'curug Pertama Kita ♥' },
    { src: 'assets/sumbing.png', caption: ' Sumbing Saksi Kita' },
    { src: 'assets/ceo batu akik.png', caption: '  After jadi Cio ' },
    { src: 'assets/game.png', caption: ' abis apa ya ini ' },
    { src: 'assets/well.png', caption: ' mode barudak bandung? ' },
    { src: 'assets/sunshine.png', caption: ' apa lagi nyak ' },
    { src: 'assets/sushi.png', caption: ' Sushi Date :)' },
    { src: 'assets/kampus.png', caption: ' ngampus dulu gess ' },
    { src: 'assets/Konser 1.png', caption: ' konser pertama kita ' },
    { src: 'assets/konser 2.png', caption: ' konser kedua? ' },
    { src: 'assets/senyum mu.png', caption: ' Senyuman manis muu ' },
    { src: 'assets/bungaku.png', caption: ' My Beautiful Girl ' }
];

let galleryIndex = 0;

function startGalleryScreen() {
    galleryIndex = 0;
    setupGalleryDots();
    displayPhoto();
}

function setupGalleryDots() {
    const dotsContainer = document.getElementById('gallery-dots');
    dotsContainer.innerHTML = "";
    memoryImages.forEach((_, idx) => {
        const dot = document.createElement('div');
        dot.className = `gallery-dot ${idx === 0 ? 'active' : ''}`;
        dotsContainer.appendChild(dot);
    });
}

function displayPhoto() {
    const img = document.getElementById('gallery-img');
    const caption = document.getElementById('gallery-caption');
    const frame = document.getElementById('polaroid-frame');
    const dots = document.querySelectorAll('.gallery-dot');
    
    // Visual tilt animation
    const tilt = (Math.random() * 8 - 4).toFixed(1);
    frame.style.transform = `scale(0.95) rotate(${tilt}deg)`;
    
    img.src = memoryImages[galleryIndex].src;
    caption.innerText = memoryImages[galleryIndex].caption;
    
    dots.forEach((dot, idx) => {
        if (idx === galleryIndex) dot.classList.add('active');
        else dot.classList.remove('active');
    });
}

function navigateGallery(direction) {
    synth.playSelectSound();
    if (direction === 'LEFT') {
        galleryIndex = (galleryIndex - 1 + memoryImages.length) % memoryImages.length;
    } else if (direction === 'RIGHT') {
        galleryIndex = (galleryIndex + 1) % memoryImages.length;
    }
    displayPhoto();
}


/* ==========================================================================
   SCREEN 4: LOVE RPG BATTLE QUIZ
   ========================================================================== */

const quizQuestions = [
    {
        q: "Pertanyaan 1: Siapa orang paling gemas & lucu di dunia ini?",
        opts: ["Abull", "Kucing oren", "Pinguin kutub", "T-Rex"],
        correct: 0,
        damage: 40
    },
    {
        q: "Pertanyaan 2: Hari ini tgl 9 Juni, hari apa bagi Abull?",
        opts: ["Hari Biasa", "Tahun Baru", "Ultah Abull! 🎉", "Hari Libur"],
        correct: 2,
        damage: 40
    },
    {
        q: "Pertanyaan 3: Apa kado paling spesial untuk Abull hari ini?",
        opts: ["Batu kali", "Sandal jepit", "Piring Cantik", "Website Ini! ❤️"],
        correct: 3,
        damage: 40
    }
];

let currentQuestionIndex = 0;
let activeOptionIndex = 0;
let bossHP = 100;
let playerHP = 100;
let isQuizFinished = false;

function startQuizScreen() {
    currentQuestionIndex = 0;
    activeOptionIndex = 0;
    bossHP = 100;
    playerHP = 100;
    isQuizFinished = false;
    
    document.getElementById('boss-hp').style.width = '100%';
    document.getElementById('player-hp').style.width = '100%';
    document.getElementById('boss-sprite').innerText = "👾";
    document.getElementById('boss-sprite').style.animation = "floatEnemy 1.5s ease-in-out infinite alternate";
    
    showQuestion();
}

function showQuestion() {
    const qData = quizQuestions[currentQuestionIndex];
    document.getElementById('quiz-dialog-box').innerText = qData.q;
    
    const optionsGrid = document.getElementById('quiz-options');
    optionsGrid.innerHTML = "";
    
    qData.opts.forEach((opt, idx) => {
        const btn = document.createElement('div');
        btn.className = `battle-option ${idx === activeOptionIndex ? 'active' : ''}`;
        btn.innerText = `${String.fromCharCode(65 + idx)}) ${opt}`;
        optionsGrid.appendChild(btn);
    });
}

function navigateQuizOptions(direction) {
    if (isQuizFinished) return;
    
    synth.playSelectSound();
    const qData = quizQuestions[currentQuestionIndex];
    
    if (direction === 'UP' || direction === 'LEFT') {
        activeOptionIndex = (activeOptionIndex - 1 + qData.opts.length) % qData.opts.length;
    } else if (direction === 'DOWN' || direction === 'RIGHT') {
        activeOptionIndex = (activeOptionIndex + 1) % qData.opts.length;
    }
    
    showQuestion();
}

function handleQuizAction() {
    if (isQuizFinished) {
        changeState(STATES.MENU);
        return;
    }

    const qData = quizQuestions[currentQuestionIndex];
    const isCorrect = activeOptionIndex === qData.correct;
    const dialogBox = document.getElementById('quiz-dialog-box');
    
    if (isCorrect) {
        // Deal damage to Boss
        synth.playExplosionSound();
        bossHP = Math.max(0, bossHP - qData.damage);
        document.getElementById('boss-hp').style.width = `${bossHP}%`;
        
        // Flash screen/boss effect
        const bossSprite = document.getElementById('boss-sprite');
        bossSprite.style.animation = "none";
        bossSprite.style.transform = "scale(1.4) rotate(10deg)";
        setTimeout(() => {
            bossSprite.style.transform = "scale(1) rotate(0deg)";
            bossSprite.style.animation = "floatEnemy 1.5s ease-in-out infinite alternate";
        }, 300);

        dialogBox.innerText = "SERANGAN CRITICAL! Tebakanmu benar!";
    } else {
        // Take damage from Boss
        synth.playErrorSound();
        playerHP = Math.max(0, playerHP - 35);
        document.getElementById('player-hp').style.width = `${playerHP}%`;
        dialogBox.innerText = "Waduh! Jawaban kurang tepat, kamu terserang!";
    }
    
    // Disable inputs momentarily for text response
    isQuizFinished = true; // Temporary lock
    
    setTimeout(() => {
        if (playerHP <= 0) {
            // Game Over
            synth.playErrorSound();
            dialogBox.innerText = "HP kamu habis! Menyetel ulang kuis...";
            setTimeout(() => {
                startQuizScreen();
            }, 2000);
        } else if (bossHP <= 0) {
            // Victory
            synth.playSuccessSound();
            document.getElementById('boss-sprite').innerText = "💀";
            dialogBox.innerText = "MENANG! Monster Cinta berhasil kamu taklukkan!";
            setTimeout(() => {
                dialogBox.innerText = "Kuis selesai! Silakan buka B-DAY WISH untuk hadiah utama!";
                // Allow pressing A to go to menu
                isQuizFinished = true;
            }, 2000);
        } else {
            // Next Question
            currentQuestionIndex++;
            activeOptionIndex = 0;
            isQuizFinished = false; // Unlock inputs
            showQuestion();
        }
    }, 1800);
}


/* ==========================================================================
   SCREEN 5: BIRTHDAY WISH & BLOW CANDLE
   ========================================================================== */

let blowProgress = 0;
let isCandleBlown = false;

function startWishScreen() {
    blowProgress = 0;
    isCandleBlown = false;
    
    document.getElementById('candle-flame').classList.add('active');
    document.getElementById('blow-progress').style.width = '0%';
    document.getElementById('blow-instructions').classList.remove('hidden');
    document.getElementById('birthday-letter').classList.add('hidden');
    document.getElementById('wish-controls-hint').innerHTML = `<span>[A] Tiup</span><span>[B] Menu</span>`;
}

function handleBlowCandle() {
    if (isCandleBlown) return;
    
    synth.playClickSound();
    blowProgress = Math.min(100, blowProgress + 15);
    document.getElementById('blow-progress').style.width = `${blowProgress}%`;
    
    if (blowProgress >= 100) {
        isCandleBlown = true;
        
        // Extinguish Flame
        document.getElementById('candle-flame').classList.remove('active');
        synth.playSuccessSound();
        
        // Spawn screen celebration confetti effect
        spawnScreenConfetti();
        
        setTimeout(() => {
            // Hide blow UI and show sweet letter
            document.getElementById('blow-instructions').classList.add('hidden');
            document.getElementById('birthday-letter').classList.remove('hidden');
            document.getElementById('wish-controls-hint').innerHTML = `<span>[B] Menu</span>`;
        }, 800);
    }
}

function spawnScreenConfetti() {
    const screen = document.getElementById('screen-content');
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'confetti-pixel';
        particle.style.position = 'absolute';
        particle.style.width = '4px';
        particle.style.height = '4px';
        
        const colors = [synth.noteFreqs.C ? '#0f380f' : '#306230', '#8bac0f', '#0f380f'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = '100%';
        
        screen.appendChild(particle);
        
        // Confetti physics animation
        let posX = parseFloat(particle.style.left);
        let posY = 100;
        let velX = Math.random() * 4 - 2;
        let velY = -(Math.random() * 8 + 6);
        
        const anim = setInterval(() => {
            posY += velY;
            posX += velX;
            velY += 0.4; // gravity
            
            particle.style.top = `${posY}%`;
            particle.style.left = `${posX}%`;
            
            if (posY > 110) {
                clearInterval(anim);
                particle.remove();
            }
        }, 30);
    }
}


/* ==========================================================================
   INPUT EVENT ROUTER (VIRTUAL & PHYSICAL CONTROLS)
   ========================================================================== */

function handleInput(buttonName) {
    // Resume audio context if needed
    synth.init();

    // Map game logic based on current state
    switch (currentState) {
        case STATES.BOOT:
            // Skip boot if user presses A or Start
            if (buttonName === 'A' || buttonName === 'START') {
                synth.playClickSound();
                changeState(STATES.MENU);
            }
            break;
            
        case STATES.MENU:
            if (buttonName === 'UP' || buttonName === 'DOWN') {
                handleMenuNavigation(buttonName);
            } else if (buttonName === 'A' || buttonName === 'START') {
                selectMenuOption();
            } else if (buttonName === 'SELECT') {
                synth.cycleWaveform();
            }
            break;
            
        case STATES.STORY:
            if (buttonName === 'A') {
                handleStoryNext();
            } else if (buttonName === 'B') {
                synth.playClickSound();
                changeState(STATES.MENU);
            }
            break;
            
        case STATES.GALLERY:
            if (buttonName === 'LEFT' || buttonName === 'RIGHT') {
                navigateGallery(buttonName);
            } else if (buttonName === 'B') {
                synth.playClickSound();
                changeState(STATES.MENU);
            }
            break;
            
        case STATES.QUIZ:
            if (buttonName === 'UP' || buttonName === 'DOWN' || buttonName === 'LEFT' || buttonName === 'RIGHT') {
                navigateQuizOptions(buttonName);
            } else if (buttonName === 'A') {
                handleQuizAction();
            } else if (buttonName === 'B') {
                synth.playClickSound();
                changeState(STATES.MENU);
            }
            break;
            
        case STATES.WISH:
            if (buttonName === 'A') {
                handleBlowCandle();
            } else if (buttonName === 'B') {
                synth.playClickSound();
                changeState(STATES.MENU);
            }
            break;
    }
}


/* ==========================================================================
   DOM BINDINGS & KEYBOARD EVENT LISTENERS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialize Boot Screen Sequence
    runBootSequence();
    
    // 2. Setup Background Floating Particles
    setupBgParticles();

    // 3. Virtual Controls Bindings (Mouse/Touch clicks)
    const btnMap = {
        'btn-up': 'UP', 'btn-down': 'DOWN', 'btn-left': 'LEFT', 'btn-right': 'RIGHT',
        'btn-a': 'A', 'btn-b': 'B', 'btn-select': 'SELECT', 'btn-start': 'START'
    };

    Object.keys(btnMap).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                btn.classList.add('pressed');
                handleInput(btnMap[id]);
            });
            btn.addEventListener('mouseup', () => btn.classList.remove('pressed'));
            btn.addEventListener('mouseleave', () => btn.classList.remove('pressed'));
            
            // Touch support for mobile devices
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.classList.add('pressed');
                handleInput(btnMap[id]);
            });
            btn.addEventListener('touchend', () => btn.classList.remove('pressed'));
        }
    });

    // 4. Keyboard Controls Mapping
    const keyMap = {
        'ArrowUp': { btn: 'btn-up', input: 'UP' },
        'ArrowDown': { btn: 'btn-down', input: 'DOWN' },
        'ArrowLeft': { btn: 'btn-left', input: 'LEFT' },
        'ArrowRight': { btn: 'btn-right', input: 'RIGHT' },
        'z': { btn: 'btn-a', input: 'A' },
        'Z': { btn: 'btn-a', input: 'A' },
        'Enter': { btn: 'btn-a', input: 'A' },
        'x': { btn: 'btn-b', input: 'B' },
        'X': { btn: 'btn-b', input: 'B' },
        'Escape': { btn: 'btn-b', input: 'B' },
        ' ': { btn: 'btn-start', input: 'START' },
        'Shift': { btn: 'btn-select', input: 'SELECT' }
    };

    document.addEventListener('keydown', (e) => {
        if (keyMap[e.key]) {
            e.preventDefault();
            const mapping = keyMap[e.key];
            const btn = document.getElementById(mapping.btn);
            if (btn) btn.classList.add('pressed');
            handleInput(mapping.input);
        }
    });

    document.addEventListener('keyup', (e) => {
        if (keyMap[e.key]) {
            const mapping = keyMap[e.key];
            const btn = document.getElementById(mapping.btn);
            if (btn) btn.classList.remove('pressed');
        }
    });

    // 5. Casing Customizer Theme Dot Click Handler
    const colorDots = document.querySelectorAll('.color-dot');
    const gameboy = document.getElementById('gameboy');

    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            synth.playSelectSound();
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            
            // Remove all themes and set chosen theme
            const theme = dot.getAttribute('data-theme');
            gameboy.className = `gameboy ${theme}`;
        });
    });

    // 6. Side Music Player Widget Toggle
    const musicBtn = document.getElementById('btn-music-toggle');
    if (musicBtn) {
        musicBtn.addEventListener('click', () => {
            synth.toggleMusic();
        });
    }

    // Set romantic theme as default
    // We activate the 'sakura' theme to align with user choice of 'romantic pastel colors'
    const sakuraDot = document.querySelector('.color-dot[data-theme="sakura"]');
    if (sakuraDot) {
        sakuraDot.click();
    }
});


/* ==========================================================================
   FLOATING PIXEL BACKGROUND PARTICLES
   ========================================================================== */

function setupBgParticles() {
    const container = document.getElementById('bg-particles');
    if (!container) return;

    const symbols = ['♥', '★', '◆', '✚', '▲'];
    
    setInterval(() => {
        // Cap total floating elements on screen
        if (container.children.length > 25) return;
        
        const particle = document.createElement('div');
        particle.className = 'bg-particle';
        
        // Random layout values
        particle.innerText = symbols[Math.floor(Math.random() * symbols.length)];
        particle.style.left = `${Math.random() * 100}vw`;
        particle.style.fontSize = `${Math.random() * 16 + 12}px`;
        particle.style.animationDuration = `${Math.random() * 8 + 10}s`;
        
        // Random pastel-like coloring
        const hues = [340, 260, 190, 140]; // Pink, Purple, Turquoise, Mint
        const hue = hues[Math.floor(Math.random() * hues.length)];
        particle.style.color = `hsla(${hue}, 80%, 75%, 0.15)`;
        
        container.appendChild(particle);
        
        // Remove after anim completes
        setTimeout(() => {
            particle.remove();
        }, 18000);
    }, 1200);
}
