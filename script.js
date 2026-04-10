// Game State
let state = {
    xp: 0,
    lives: 3,
    streak: 1,
    currentLevel: 1,
    unlockedLevels: 1,
    selectedOption: null,
    currentQuestionIndex: 0
};

// Database of levels and questions
const levelsData = [
    { id: 1, title: "Variables", type: "intro", locked: false },
    { id: 2, title: "Data Types", type: "concept", locked: true },
    { id: 3, title: "Basic Math", type: "practice", locked: true },
    { id: 4, title: "Strings", type: "concept", locked: true },
    { id: 5, title: "If/Else", type: "challenge", locked: true }
];

const questionData = {
    text: 'greeting = "Hello"\nprint(greeting)',
    options: [
        '"Hello"',
        'greeting',
        'Hello',
        'Error'
    ],
    correctIndex: 2
};

// Application Init
document.addEventListener('DOMContentLoaded', () => {
    initAuthTabs();
    updateUI();
});

// Routing & Navigation
function navigate(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    const topNav = document.getElementById('top-nav');
    if (pageId === 'login-page') {
        topNav.classList.add('hidden');
    } else {
        topNav.classList.remove('hidden');
        if (pageId === 'levels-page') {
            generateLevelMap();
        } else if (pageId === 'question-page') {
            loadQuestion();
        }
    }
}

// Authentication Handlers
function initAuthTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = {
        'login': document.getElementById('login-form'),
        'signup': document.getElementById('signup-form')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            Object.values(forms).forEach(f => f.classList.remove('active-form'));
            forms[tab.dataset.tab].classList.add('active-form');
        });
    });
}

function handleAuth(event) {
    event.preventDefault();
    // Simulate login
    navigate('dashboard-page');
}

function logout() {
    navigate('login-page');
}

// Level Map Generator
function generateLevelMap() {
    const mapContainer = document.querySelector('.level-map');
    mapContainer.innerHTML = '';
    
    // Draw Path Line
    const bgLine = document.createElement('div');
    bgLine.className = 'path-line';
    mapContainer.appendChild(bgLine);

    const fillLine = document.createElement('div');
    fillLine.className = 'path-line-fill';
    
    // Calculate fill based on progress
    const progressPercent = ((state.unlockedLevels - 1) / (levelsData.length - 1)) * 100;
    fillLine.style.height = `${progressPercent}%`;
    mapContainer.appendChild(fillLine);

    // Draw Nodes
    levelsData.forEach((level, index) => {
        const node = document.createElement('div');
        node.className = `level-node`;
        
        let status = 'locked';
        if (level.id < state.unlockedLevels) status = 'completed';
        else if (level.id === state.unlockedLevels) status = 'current';

        node.classList.add(status);

        if (status === 'locked') {
            node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
        } else if (status === 'completed') {
            node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            node.onclick = () => startLevel(level.id);
        } else {
            node.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            node.onclick = () => startLevel(level.id);
        }

        mapContainer.appendChild(node);
    });
}

function startLevel(id) {
    state.currentLevel = id;
    state.selectedOption = null;
    navigate('question-page');
}

// Question Logic
function loadQuestion() {
    const codeBlock = document.getElementById('question-text');
    codeBlock.textContent = questionData.text;

    const optionsGrid = document.getElementById('options-grid');
    optionsGrid.innerHTML = '';

    questionData.options.forEach((opt, index) => {
        const card = document.createElement('div');
        card.className = 'option-card';
        card.onclick = () => selectOption(index, card);
        
        card.innerHTML = `
            <div class="option-number">${index + 1}</div>
            <div class="option-text">${opt}</div>
        `;
        optionsGrid.appendChild(card);
    });

    document.getElementById('check-btn').classList.add('disabled');
    document.getElementById('result-overlay').classList.add('hidden');
    state.selectedOption = null;
    
    // Update progress bar to 50% for visual effect
    document.getElementById('question-progress-fill').style.width = '50%';
}

function selectOption(index, element) {
    if (!document.getElementById('result-overlay').classList.contains('hidden')) return;

    state.selectedOption = index;
    
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');

    document.getElementById('check-btn').classList.remove('disabled');
}

function checkAnswer() {
    if (state.selectedOption === null) return;
    
    const isCorrect = state.selectedOption === questionData.correctIndex;
    showResult(isCorrect);
}

function showResult(isCorrect) {
    const overlay = document.getElementById('result-overlay');
    const title = document.getElementById('result-title');
    const message = document.getElementById('result-message');
    const iconSuccess = document.getElementById('icon-success');
    const iconError = document.getElementById('icon-error');
    const checkBtn = document.getElementById('check-btn');

    overlay.classList.remove('hidden', 'correct', 'incorrect');
    iconSuccess.classList.add('hidden');
    iconError.classList.add('hidden');
    checkBtn.classList.add('disabled'); // Disable during result

    if (isCorrect) {
        overlay.classList.add('correct');
        title.textContent = "Excellent!";
        message.textContent = "+20 XP earned";
        iconSuccess.classList.remove('hidden');
        state.xp += 20;
        
        // Unlock next level if currently on the latest
        if (state.currentLevel === state.unlockedLevels && state.unlockedLevels < levelsData.length) {
            state.unlockedLevels++;
        }
        
        document.getElementById('question-progress-fill').style.width = '100%';
    } else {
        overlay.classList.add('incorrect');
        title.textContent = "Not quite right";
        message.textContent = "The correct answer was: " + questionData.options[questionData.correctIndex];
        iconError.classList.remove('hidden');
        
        if (state.lives > 0) state.lives--;
    }

    updateUI();
}

function nextQuestion() {
    // In a real app we would load the next question.
    // For this demo, we go back to level select.
    navigate('levels-page');
}

function useHint() {
    alert("Hint: The variable is not evaluating the quotes, it output the string exactly.");
}

// Global State Updater
function updateUI() {
    document.getElementById('nav-xp').textContent = state.xp;
    document.getElementById('nav-streak').textContent = state.streak;
    document.getElementById('total-xp').textContent = state.xp.toLocaleString();
    document.getElementById('lives-count').textContent = state.lives;
    
    // Check lives
    if (state.lives <= 0) {
        setTimeout(() => {
            alert("Out of lives! Journey reset.");
            state.lives = 3;
            state.unlockedLevels = 1;
            updateUI();
            navigate('dashboard-page');
        }, 500);
    }
}
