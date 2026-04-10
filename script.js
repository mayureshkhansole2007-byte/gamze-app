// Game State
let state = {
    xp: 0,
    lives: 3,
    streak: 1,
    currentLevel: 1,
    unlockedLevels: 1,
    selectedOption: null,
    currentQuestionIndex: 0,
    currentLevelQuestions: [] // The queue of questions for the current level
};

// Database of levels
const levelsData = [
    { id: 1, title: "Variables", icon: "intro" },
    { id: 2, title: "Data Types", icon: "concept" },
    { id: 3, title: "Basic Math", icon: "practice" },
    { id: 4, title: "Strings", icon: "concept" },
    { id: 5, title: "If/Else", icon: "challenge" }
];

// 10 Sample Python Questions
const allQuestionsData = [
    // Level 1 Questions (Variables)
    {
        levelId: 1,
        title: "Identify the valid variable",
        text: "# Which one is a valid variable name in Python?",
        type: "mcq",
        options: ["1_variable = 5", "my-var = 5", "my_var = 5", "class = 5"],
        correctIndex: 2,
        hint: "Variable names cannot start with numbers or use hyphens."
    },
    {
        levelId: 1,
        title: "Output Prediction",
        text: "x = 10\ny = 20\nprint(x)",
        type: "output",
        options: ["10", "20", "x", "Error"],
        correctIndex: 0,
        hint: "Look strictly at what variable is being passed to print()."
    },
    // Level 2 Questions (Data Types)
    {
        levelId: 2,
        title: "Data Types Concept",
        text: "type(3.14)",
        type: "mcq",
        options: ["int", "float", "string", "double"],
        correctIndex: 1,
        hint: "Numbers with a decimal point have a specific type in Python."
    },
    {
        levelId: 2,
        title: "Determine the Output",
        text: 'val = "100"\nprint(type(val))',
        type: "output",
        options: ["<class 'int'>", "<class 'str'>", "<class 'string'>", "Error"],
        correctIndex: 1,
        hint: "Notice the quotation marks around the number."
    },
    // Level 3 Questions (Basic Math)
    {
        levelId: 3,
        title: "Math Operations",
        text: "print(10 % 3)",
        type: "output",
        options: ["3.33", "3", "1", "0"],
        correctIndex: 2,
        hint: "The % operator returns the remainder of the division."
    },
    {
        levelId: 3,
        title: "Exponentiation",
        text: "print(2 ** 3)",
        type: "output",
        options: ["6", "5", "8", "9"],
        correctIndex: 2,
        hint: "The ** operator means 'to the power of'."
    },
    // Level 4 Questions (Strings)
    {
        levelId: 4,
        title: "String Concatenation",
        text: 'name = "Code"\nprint(name + "Quest")',
        type: "output",
        options: ["Code Quest", "CodeQuest", "Error", "nameQuest"],
        correctIndex: 1,
        hint: "The + operator joins strings together exactly as they are."
    },
    {
        levelId: 4,
        title: "String Methods",
        text: 'text = "HELLO"\nprint(text.lower())',
        type: "output",
        options: ["hello", "HELLO", "Hello", "error"],
        correctIndex: 0,
        hint: "The method name describes what it does to the letters."
    },
    // Level 5 Questions (If/Else)
    {
        levelId: 5,
        title: "Conditionals",
        text: "x = 5\nif x > 3:\n    print('A')\nelse:\n    print('B')",
        type: "output",
        options: ["A", "B", "None", "Error"],
        correctIndex: 0,
        hint: "Is 5 greater than 3?"
    },
    {
        levelId: 5,
        title: "Equality Operator",
        text: "# Which operator checks if two values are exactly equal?",
        type: "mcq",
        options: ["=", "==", "===", "!="],
        correctIndex: 1,
        hint: "A single equals sign assigns a value, a double checks for equality."
    }
];

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
            // Started in startLevel
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
    navigate('dashboard-page');
}

function logout() {
    navigate('login-page');
}

// Level Map Generator
function generateLevelMap() {
    const mapContainer = document.querySelector('.level-map');
    mapContainer.innerHTML = '';
    
    const bgLine = document.createElement('div');
    bgLine.className = 'path-line';
    mapContainer.appendChild(bgLine);

    const fillLine = document.createElement('div');
    fillLine.className = 'path-line-fill';
    const progressPercent = ((state.unlockedLevels - 1) / (levelsData.length - 1)) * 100;
    fillLine.style.height = `${progressPercent}%`;
    mapContainer.appendChild(fillLine);

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
    state.currentQuestionIndex = 0;
    state.currentLevelQuestions = allQuestionsData.filter(q => q.levelId === id);
    
    if (state.currentLevelQuestions.length === 0) {
        alert("No questions found for this level!");
        return;
    }

    navigate('question-page');
    loadQuestion();
}

// Question Logic
function loadQuestion() {
    const question = state.currentLevelQuestions[state.currentQuestionIndex];
    document.getElementById('question-title').textContent = question.title;
    document.getElementById('question-text').textContent = question.text;

    const optionsGrid = document.getElementById('options-grid');
    optionsGrid.innerHTML = '';

    question.options.forEach((opt, index) => {
        const card = document.createElement('div');
        card.className = 'option-card';
        card.onclick = () => selectOption(index, card);
        card.dataset.index = index;
        
        card.innerHTML = `
            <div class="option-number">${index + 1}</div>
            <div class="option-text">${opt}</div>
        `;
        optionsGrid.appendChild(card);
    });

    document.getElementById('check-btn').classList.remove('hidden');
    document.getElementById('check-btn').classList.add('disabled');
    document.getElementById('result-overlay').classList.add('hidden');
    
    state.selectedOption = null;
    
    // Calculate progress for this level session
    const percent = (state.currentQuestionIndex / state.currentLevelQuestions.length) * 100;
    document.getElementById('question-progress-fill').style.width = `${percent}%`;
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
    
    const question = state.currentLevelQuestions[state.currentQuestionIndex];
    const isCorrect = state.selectedOption === question.correctIndex;
    
    // Highlight Answers
    const allCards = document.querySelectorAll('.option-card');
    allCards.forEach(card => {
        const cardIndex = parseInt(card.dataset.index);
        
        if (cardIndex === question.correctIndex) {
            // Always highlight correct answer in green
            card.classList.add('correct-option');
        } else if (cardIndex === state.selectedOption && !isCorrect) {
            // Highlight selected wrong answer in red
            card.classList.add('incorrect-option');
        }
    });

    showResult(isCorrect, question);
}

function showResult(isCorrect, question) {
    const overlay = document.getElementById('result-overlay');
    const title = document.getElementById('result-title');
    const message = document.getElementById('result-message');
    const iconSuccess = document.getElementById('icon-success');
    const iconError = document.getElementById('icon-error');
    const checkBtn = document.getElementById('check-btn');

    overlay.classList.remove('hidden', 'correct', 'incorrect');
    iconSuccess.classList.add('hidden');
    iconError.classList.add('hidden');
    checkBtn.classList.add('hidden'); // Hide check button during result

    if (isCorrect) {
        overlay.classList.add('correct');
        title.textContent = "Excellent!";
        message.textContent = "+20 XP earned";
        iconSuccess.classList.remove('hidden');
        state.xp += 20;
    } else {
        overlay.classList.add('incorrect');
        title.textContent = "Not quite right";
        message.textContent = "Review the highlighted correct answer above.";
        iconError.classList.remove('hidden');
        
        if (state.lives > 0) state.lives--;
    }

    updateUI();
}

function nextQuestion() {
    state.currentQuestionIndex++;
    
    if (state.currentQuestionIndex >= state.currentLevelQuestions.length) {
        // Level completed!
        document.getElementById('question-progress-fill').style.width = '100%';
        
        // Progress unlock logic
        if (state.currentLevel === state.unlockedLevels && state.unlockedLevels < levelsData.length) {
            state.unlockedLevels++;
        }
        
        setTimeout(() => {
            navigate('levels-page');
        }, 500);
    } else {
        // Load next question
        loadQuestion();
    }
}

function useHint() {
    const question = state.currentLevelQuestions[state.currentQuestionIndex];
    alert(`Hint: ${question.hint}`);
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
