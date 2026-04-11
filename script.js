
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Firebase Configuration - REPLACE WITH YOURS
const firebaseConfig = {
    apiKey: "AIzaSyAVZRhis0wobkZR7xSmnXKPdhEtJHgb22k",
    authDomain: "code-quest-43d1a.firebaseapp.com",
    projectId: "code-quest-43d1a",
    storageBucket: "code-quest-43d1a.firebasestorage.app",
    messagingSenderId: "933007142858",
    appId: "1:933007142858:web:4f0b1d558f2f2e51022933"
};

let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.warn("Firebase not properly configured. Add your config above.");
}

// Game State
let state = {
    xp: 0,
    lives: 3,
    streak: 1,
    currentLevel: 1,
    unlockedLevels: 1,
    selectedOption: null,
    currentQuestionIndex: 0,
    currentLevelQuestions: [], // The queue of questions for the current level
    earnedBadges: [] // Track unlocked badge IDs
};

// Audio Engine
function playSound(type) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'levelup') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.2);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    }
}

// Visual Effects
function showFloatingXP(amount) {
    const container = document.getElementById('floating-xp-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'floating-xp-text';
    el.textContent = `+${amount} XP`;
    el.style.left = `${(Math.random() - 0.5) * 20}px`;
    container.appendChild(el);
    setTimeout(() => { if (container.contains(el)) container.removeChild(el); }, 1500);
}

// OPENAI API INTEGRATION - ADD YOUR KEY HERE
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY";

async function callOpenAI(prompt) {
    if (OPENAI_API_KEY === "YOUR_OPENAI_API_KEY") {
        return "Please add your OpenAI API Key in script.js to use AI features.";
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("Error calling OpenAI:", error);
        return "Failed to get AI response. Check your API key and network.";
    }
}

const badgesData = [
    { id: "beginner", title: "Beginner Coder", xpRequired: 50, icon: "👶" },
    { id: "intermediate", title: "Intermediate Dev", xpRequired: 150, icon: "🚀" },
    { id: "expert", title: "Expert Hacker", xpRequired: 300, icon: "👑" }
];

// Database of levels
const levelsData = [
    { id: 1, title: "Variables", icon: "intro" },
    { id: 2, title: "Data Types", icon: "concept" },
    { id: 3, title: "Basic Math", icon: "practice" },
    { id: 4, title: "Strings & Booleans", icon: "concept" },
    { id: 5, title: "If/Else", icon: "challenge" },
    { id: 6, title: "Lists", icon: "practice" },
    { id: 7, title: "Loops", icon: "challenge" }
];

// 21 Python Questions
const allQuestionsData = [
    // Level 1: Variables
    { levelId: 1, title: "Create a variable", text: "# Identify the correct way to assign the value 'John' to a variable named x", type: "mcq", options: ["x = 'John'", "x == 'John'", "let x = 'John'", "x: 'John'"], correctIndex: 0, hint: "Python doesn't need variable keywords like 'let' or 'var'. Just use the equals sign." },
    { levelId: 1, title: "Valid Variable Names", text: "# Which of these is NOT a legal variable name in Python?", type: "mcq", options: ["my_var = 10", "_myvar = 10", "2myvar = 10", "myVar = 10"], correctIndex: 2, hint: "A variable name cannot start with a number in Python." },
    { levelId: 1, title: "Output Prediction", text: "x = 5\ny = 10\nz = x + y\nprint(z)", type: "output", options: ["510", "15", "x+y", "Error"], correctIndex: 1, hint: "Since x and y are numbers, the + operator performs mathematical addition." },
    
    // Level 2: Data Types
    { levelId: 2, title: "Data Types Concept", text: "print(type(3.14))", type: "mcq", options: ["<class 'int'>", "<class 'float'>", "<class 'double'>", "<class 'decimal'>"], correctIndex: 1, hint: "In Python, any numeric value with a decimal point belongs to this class." },
    { levelId: 2, title: "Casting to Integer", text: "x = int('3')\nprint(type(x))", type: "output", options: ["<class 'str'>", "<class 'char'>", "<class 'num'>", "<class 'int'>"], correctIndex: 3, hint: "The int() function explicitly casts (converts) the string into an integer." },
    { levelId: 2, title: "Determine the Output", text: 'val = "100"\nprint(type(val))', type: "output", options: ["<class 'int'>", "<class 'str'>", "<class 'string'>", "Error"], correctIndex: 1, hint: "Notice the quotation marks around the number. It is treated as text." },
    
    // Level 3: Basic Math
    { levelId: 3, title: "Math Operations", text: "print(10 % 3)", type: "output", options: ["3.33", "3", "1", "0"], correctIndex: 2, hint: "The % (modulo) operator returns the remainder of the division." },
    { levelId: 3, title: "Exponentiation", text: "print(2 ** 4)", type: "output", options: ["6", "8", "16", "24"], correctIndex: 2, hint: "The ** operator means 'to the power of'. This is 2 * 2 * 2 * 2." },
    { levelId: 3, title: "Integer Division", text: "print(15 // 2)", type: "output", options: ["7.5", "7", "8", "6"], correctIndex: 1, hint: "The // operator is for floor division, which rounds down to the nearest whole number." },

    // Level 4: Strings & Booleans
    { levelId: 4, title: "String Concatenation", text: 'name = "Code"\nprint(name + "Quest")', type: "output", options: ["Code Quest", "CodeQuest", "Error", "nameQuest"], correctIndex: 1, hint: "The + operator joins strings together exactly as they are without adding spaces." },
    { levelId: 4, title: "String Methods", text: 'txt = "Hello World"\nprint(txt.upper())', type: "mcq", options: ["hello world", "HELLO WORLD", "Hello World", "Error"], correctIndex: 1, hint: "The upper() method converts the entire string to uppercase letters." },
    { levelId: 4, title: "Boolean Evaluation", text: "print(10 > 9)", type: "output", options: ["True", "False", "Yes", "1"], correctIndex: 0, hint: "An expression that asks a comparative question returns a Boolean value (True or False)." },

    // Level 5: If/Else
    { levelId: 5, title: "Conditionals", text: "x = 5\nif x > 3:\n    print('A')\nelse:\n    print('B')", type: "output", options: ["A", "B", "None", "Error"], correctIndex: 0, hint: "Is 5 greater than 3? The first block executes if the condition is True." },
    { levelId: 5, title: "Equality Operator", text: "# Which operator checks if two values are exactly equal?", type: "mcq", options: ["=", "==", "===", "!="], correctIndex: 1, hint: "A single equals sign assigns a value, a double checks for equality." },
    { levelId: 5, title: "Elif Statement", text: "a = 33\nb = 33\nif b > a:\n  print('X')\nelif a == b:\n  print('Y')", type: "output", options: ["X", "Y", "None", "Error"], correctIndex: 1, hint: "Since b is not greater than a, it checks the next condition: are they equal?" },

    // Level 6: Lists
    { levelId: 6, title: "Create a List", text: "# Identify the correct way to create a Python list", type: "mcq", options: ["colors = ('red', 'blue')", "colors = {'red', 'blue'}", "colors = ['red', 'blue']", "colors = <'red', 'blue'>"], correctIndex: 2, hint: "Lists in Python are created using square brackets []." },
    { levelId: 6, title: "List Indexing", text: "fruits = ['apple', 'banana', 'cherry']\nprint(fruits[1])", type: "output", options: ["apple", "banana", "cherry", "Error"], correctIndex: 1, hint: "Python arrays are zero-indexed, meaning the first item is index 0." },
    { levelId: 6, title: "List Length", text: "cars = ['Ford', 'Volvo', 'BMW']\nprint(len(cars))", type: "output", options: ["2", "3", "4", "length(cars)"], correctIndex: 1, hint: "The len() function tells you how many items are currently inside the list." },

    // Level 7: Loops
    { levelId: 7, title: "While Loops", text: "i = 1\nwhile i < 4:\n  print(i)\n  i += 1", type: "mcq", options: ["1 2 3", "1 2 3 4", "2 3 4", "Infinite Loop"], correctIndex: 0, hint: "The loop stops running the moment i is no longer less than 4." },
    { levelId: 7, title: "For Loops", text: "for x in 'cat':\n  print(x)", type: "mcq", options: ["cat", "c a t (on new lines)", "c", "Error"], correctIndex: 1, hint: "A for loop can iterate through each character in a string string one by one." },
    { levelId: 7, title: "Loop Control", text: "for i in range(3):\n  if i == 1:\n    break\n  print(i)", type: "output", options: ["0 1 2", "1 2", "0", "0 1"], correctIndex: 2, hint: "The 'break' statement instantly stops the loop entirely when triggered." }
];

// Application Init
document.addEventListener('DOMContentLoaded', () => {
    initAuthTabs();
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in. Fetch data.
                await fetchUserData(user);
                
                // Update Avatars using saved photoURL or fallback
                const avatarSrc = user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.displayName || 'Felix')}&backgroundColor=b6e3f4`;
                document.querySelectorAll('.avatar').forEach(img => img.src = avatarSrc);

                updateUI();
                fetchLeaderboard();
                navigate('dashboard-page');

                // Reset buttons
                const loginBtn = document.getElementById('login-btn');
                const signupBtn = document.getElementById('signup-btn');
                if (loginBtn) { loginBtn.textContent = "Start Quest"; loginBtn.classList.remove('disabled'); }
                if (signupBtn) { signupBtn.textContent = "Create Account"; signupBtn.classList.remove('disabled'); }
            } else {
                // User is signed out.
                navigate('login-page');
            }
        });
    } else {
        updateUI();
    }
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

async function fetchUserData(user) {
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            state.xp = data.xp || 0;
            state.unlockedLevels = data.levelsUnlocked || 1;
            state.earnedBadges = data.earnedBadges || [];
        }
    } catch (e) {
        console.error("Error fetching user data:", e);
    }
}

async function syncDataToFirestore() {
    if (!auth || !auth.currentUser) return;
    try {
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, {
            xp: state.xp,
            levelsUnlocked: state.unlockedLevels,
            earnedBadges: state.earnedBadges
        });
    } catch (e) {
        console.error("Error updating user data:", e);
    }
}

async function handleAuth(event) {
    event.preventDefault();
    if (!auth) {
        alert("Firebase is not initialized. Please add your config.");
        navigate('dashboard-page'); // Fallback local logic
        return;
    }

    const isLogin = document.getElementById('login-form').classList.contains('active-form');

    if (isLogin) {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');
        btn.textContent = "Logging in...";
        btn.classList.add('disabled');

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("Error: " + error.message);
            btn.textContent = "Start Quest";
            btn.classList.remove('disabled');
        }
    } else {
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const btn = document.getElementById('signup-btn');
        btn.textContent = "Creating Account...";
        btn.classList.add('disabled');

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4`;
            
            await updateProfile(user, { 
                displayName: username,
                photoURL: defaultAvatar
            });

            await setDoc(doc(db, "users", user.uid), {
                xp: 0,
                levelsUnlocked: 1,
                earnedBadges: [],
                displayName: username,
                photoURL: defaultAvatar
            });
            
            // Instantly update UI images
            document.querySelectorAll('.avatar').forEach(img => img.src = defaultAvatar);
            
            fetchLeaderboard();
        } catch (error) {
            alert("Error: " + error.message);
            btn.textContent = "Create Account";
            btn.classList.remove('disabled');
        }
    }
}

async function logout() {
    if (auth) {
        await signOut(auth);
    } else {
        navigate('login-page');
    }
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

    // Hide AI boxes on new question
    document.getElementById('ai-hint-box').classList.add('hidden');
    document.getElementById('ai-explanation-box').classList.add('hidden');

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

async function showResult(isCorrect, question) {
    const overlay = document.getElementById('result-overlay');
    const title = document.getElementById('result-title');
    const message = document.getElementById('result-message');
    const iconSuccess = document.getElementById('icon-success');
    const iconError = document.getElementById('icon-error');
    const checkBtn = document.getElementById('check-btn');
    const explanationBox = document.getElementById('ai-explanation-box');
    const explanationText = document.getElementById('ai-explanation-text');

    overlay.classList.remove('hidden', 'correct', 'incorrect');
    iconSuccess.classList.add('hidden');
    iconError.classList.add('hidden');
    checkBtn.classList.add('hidden'); // Hide check button during result

    // Reset and show explanation box
    explanationBox.classList.remove('hidden');
    explanationText.textContent = "Generating AI explanation...";

    if (isCorrect) {
        overlay.classList.add('correct');
        title.textContent = "Excellent!";
        message.textContent = "+10 XP earned";
        iconSuccess.classList.remove('hidden');
        state.xp += 10;
        showFloatingXP(10);
        playSound('correct');
        checkBadges();
        syncDataToFirestore();
    } else {
        overlay.classList.add('incorrect');
        title.textContent = "Not quite right";
        message.textContent = "Review the highlighted correct answer above.";
        iconError.classList.remove('hidden');
        playSound('wrong');

        if (state.lives > 0) state.lives--;
    }

    updateUI();

    // Fetch AI Explanation
    const selectedOptionText = state.selectedOption !== null ? question.options[state.selectedOption] : "None";
    const correctOptionText = question.options[question.correctIndex];

    const prompt = `Explain why the correct answer to this Python coding question is "${correctOptionText}". 
The user selected "${selectedOptionText}". Keep the explanation brief, friendly, and educational (max 3 sentences).
Question: ${question.title}
Code/Text: \n${question.text}`;

    const explanationResponse = await callOpenAI(prompt);
    explanationText.textContent = explanationResponse;
}

function nextQuestion() {
    state.currentQuestionIndex++;

    if (state.currentQuestionIndex >= state.currentLevelQuestions.length) {
        // Level completed!
        document.getElementById('question-progress-fill').style.width = '100%';

        // Progress unlock logic
        if (state.currentLevel === state.unlockedLevels && state.unlockedLevels < levelsData.length) {
            state.unlockedLevels++;
            syncDataToFirestore();
        }

        playSound('levelup');
        if (window.confetti) {
            window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 1000 });
        }

        setTimeout(() => {
            fetchLeaderboard();
            navigate('levels-page');
        }, 1500);
    } else {
        // Load next question
        loadQuestion();
    }
}

async function useHint() {
    const hintBox = document.getElementById('ai-hint-box');
    const hintText = document.getElementById('ai-hint-text');
    const hintBtn = document.getElementById('hint-btn');

    if (!hintBox.classList.contains('hidden') && hintText.textContent !== "Failed to get AI response. Check your API key and network." && hintText.textContent !== "Please add your OpenAI API Key in script.js to use AI features.") {
        return; // Hint already requested or loaded
    }

    hintBox.classList.remove('hidden');
    hintText.textContent = "Generating AI hint...";
    hintBtn.classList.add('disabled');

    const question = state.currentLevelQuestions[state.currentQuestionIndex];

    const prompt = `Give a short, helpful hint (max 2 sentences) for this Python coding question. Do not reveal the exact answer.
Question: ${question.title}
Code/Text: ${question.text}
Options: ${question.options.join(', ')}
The correct answer is index ${question.correctIndex} (${question.options[question.correctIndex]}).`;

    const aiResponse = await callOpenAI(prompt);

    hintText.textContent = aiResponse;
    hintBtn.classList.remove('disabled');
}

// Global State Updater
function updateUI() {
    document.getElementById('nav-xp').textContent = state.xp;
    document.getElementById('nav-streak').textContent = state.streak;
    document.getElementById('total-xp').textContent = state.xp.toLocaleString();
    document.getElementById('lives-count').textContent = state.lives;

    // Update Dashboard Progress Bar (Goal: 300 XP for Expert)
    const goalXp = 300;
    const progressPercent = Math.min((state.xp / goalXp) * 100, 100);
    const progressFill = document.getElementById('dashboard-progress');
    if (progressFill) progressFill.style.width = `${progressPercent}%`;

    const progressText = document.getElementById('completed-lessons');
    if (progressText) {
        progressText.textContent = `${state.xp}`;
        progressText.nextSibling.textContent = ` / ${goalXp} XP`;
    }

    // Update Badges Panel
    const badgesListContainer = document.querySelector('.badges-list');
    if (badgesListContainer) {
        badgesListContainer.innerHTML = '';
        badgesData.forEach(badge => {
            const isEarned = state.earnedBadges.includes(badge.id);
            const badgeEl = document.createElement('div');
            badgeEl.className = `badge ${isEarned ? 'earned' : 'locked'}`;
            badgeEl.innerHTML = `
                <div class="badge-icon">${badge.icon}</div>
                <span>${badge.title}</span>
                <span style="margin-left: auto; font-size: 0.8rem; color: var(--text-muted); opacity: ${isEarned ? '0' : '1'}">${badge.xpRequired} XP</span>
            `;
            badgesListContainer.appendChild(badgeEl);
        });
    }

    // Check lives
    if (state.lives <= 0) {
        setTimeout(() => {
            alert("Out of lives! Journey reset. Try again!");
            state.lives = 3;
            state.xp = 0;
            state.unlockedLevels = 1;
            state.earnedBadges = [];
            syncDataToFirestore();
            updateUI();
            navigate('dashboard-page');
            document.getElementById('result-overlay').classList.add('hidden');
        }, 500);
    }
}

// Badge Logic
function checkBadges() {
    const unearnedBadges = badgesData.filter(b => !state.earnedBadges.includes(b.id));

    for (let badge of unearnedBadges) {
        if (state.xp >= badge.xpRequired) {
            // Earned a new badge!
            state.earnedBadges.push(badge.id);

            playSound('levelup');
            if (window.confetti) {
                window.confetti({ particleCount: 100, spread: 60, zIndex: 1000 });
            }

            // Show popup
            document.getElementById('result-overlay').classList.add('hidden'); // Hide question overlay to prevent clash

            const badgeOverlay = document.getElementById('badge-overlay');
            document.getElementById('badge-popup-icon').textContent = badge.icon;
            document.getElementById('badge-popup-message').textContent = `You unlocked the ${badge.title} badge!`;
            badgeOverlay.classList.remove('hidden');
            break; // Show one at a time
        }
    }
}

function closeBadgePopup() {
    document.getElementById('badge-overlay').classList.add('hidden');
    // If we're inside a question flow, let nextQuestion() or the user continue cleanly.
    // If the check button is hidden, it signifies they just finished evaluating an answer.
    const checkBtn = document.getElementById('check-btn');
    if (checkBtn && checkBtn.classList.contains('hidden')) {
        document.getElementById('result-overlay').classList.remove('hidden'); // Restore result overlay so they can hit Continue
    }
}

// Profile & Leaderboard Logic
async function fetchLeaderboard() {
    const lbContainer = document.getElementById('leaderboard-list');
    if (!lbContainer) return;
    if (!db) { lbContainer.innerHTML = '<div class="text-center">Database not connected</div>'; return; }
    
    try {
        const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        
        lbContainer.innerHTML = '';
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const xp = data.xp || 0;
            const lvl = data.levelsUnlocked || 1;
            const name = data.displayName || "Unknown Coder";
            
            const item = document.createElement('div');
            item.className = 'lb-item';
            item.innerHTML = `
                <div class="lb-rank">#${rank}</div>
                <div class="lb-user">
                    <span class="lb-name">${name}</span>
                    <span class="lb-lvl">Level ${lvl}</span>
                </div>
                <div class="lb-xp">${xp} XP</div>
            `;
            lbContainer.appendChild(item);
            rank++;
        });
        if (querySnapshot.empty) {
            lbContainer.innerHTML = '<div class="text-center" style="color:var(--text-muted);">No players yet</div>';
        }
    } catch (e) {
        console.error("Error fetching leaderboard:", e);
        lbContainer.innerHTML = '<div class="text-center" style="color:var(--text-muted);">Failed to load</div>';
    }
}

function openProfile() {
    if (!auth || !auth.currentUser) return;
    const user = auth.currentUser;
    document.getElementById('profile-username').textContent = user.displayName || "Coder";
    document.getElementById('profile-email').textContent = user.email || "";
    document.getElementById('profile-total-xp').textContent = state.xp;
    document.getElementById('profile-streak').textContent = state.streak;
    document.getElementById('profile-overlay').classList.remove('hidden');
}

function closeProfile() {
    document.getElementById('profile-overlay').classList.add('hidden');
}

// Expose functions for inline HTML attributes
window.navigate = navigate;
window.handleAuth = handleAuth;
window.logout = logout;
window.startLevel = startLevel;
window.selectOption = selectOption;
window.checkAnswer = checkAnswer;
window.nextQuestion = nextQuestion;
window.useHint = useHint;
window.closeBadgePopup = closeBadgePopup;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
