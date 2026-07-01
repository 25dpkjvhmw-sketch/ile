// Game constants
const CELL_SIZE = 30;
const CANVAS_SIZE = 600;
const GRID_SIZE = CANVAS_SIZE / CELL_SIZE;

// Game states
const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    WON: 'won'
};

// Difficulty configurations
const DIFFICULTIES = {
    easy: {
        pathComplexity: 0.3,
        name: 'Easy'
    },
    medium: {
        pathComplexity: 0.5,
        name: 'Medium'
    },
    hard: {
        pathComplexity: 0.7,
        name: 'Hard'
    }
};

// Game variables
let canvas, ctx;
let gameState = GAME_STATE.PLAYING;
let currentDifficulty = 'easy';
let maze = [];
let playerX = 1;
let playerY = 1;
let exitX = GRID_SIZE - 2;
let exitY = GRID_SIZE - 2;
let moveCount = 0;
let startTime = Date.now();
let elapsedTime = 0;
let gameStartTime = null;
let bestTime = localStorage.getItem('bestTime') ? parseInt(localStorage.getItem('bestTime')) : null;
let showHint = false;
let hintPath = [];

// Key tracking
const keys = {};

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Set canvas size based on screen
    if (window.innerWidth < 700) {
        const size = Math.min(window.innerWidth - 60, 600);
        canvas.width = size;
        canvas.height = size;
    }

    // Difficulty selector
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDifficulty = e.target.dataset.difficulty;
            startNewGame();
        });
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;

        // Pause with P key
        if (e.key.toLowerCase() === 'p') {
            togglePause();
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    startNewGame();
});

function startNewGame() {
    maze = generateMaze();
    playerX = 1;
    playerY = 1;
    exitX = GRID_SIZE - 2;
    exitY = GRID_SIZE - 2;
    moveCount = 0;
    gameState = GAME_STATE.PLAYING;
    gameStartTime = Date.now();
    startTime = Date.now();
    showHint = false;
    hintPath = [];
    document.getElementById('moves').textContent = '0';
    document.getElementById('message').textContent = '';
    document.getElementById('message').className = 'message';
    document.getElementById('pauseBtn').textContent = '⏸ Pause';
    clearBestTimeDisplay();
    
    gameLoop();
}

function generateMaze() {
    const maze = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(1));
    
    // Recursive backtracking algorithm
    const carve = (x, y) => {
        maze[y][x] = 0;
        
        const directions = [
            [0, -2], [2, 0], [0, 2], [-2, 0]
        ].sort(() => Math.random() - 0.5);

        for (let [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx > 0 && nx < GRID_SIZE - 1 && ny > 0 && ny < GRID_SIZE - 1 && maze[ny][nx] === 1) {
                maze[y + dy / 2][x + dx / 2] = 0;
                carve(nx, ny);
            }
        }
    };

    carve(1, 1);
    
    // Ensure exit is reachable
    maze[exitY][exitX] = 0;
    maze[exitY - 1][exitX] = 0;
    maze[exitY][exitX - 1] = 0;

    return maze;
}

function findPath() {
    const queue = [[playerX, playerY, []]];
    const visited = new Set();
    visited.add(`${playerX},${playerY}`);

    while (queue.length > 0) {
        const [x, y, path] = queue.shift();

        if (x === exitX && y === exitY) {
            return path;
        }

        const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (let [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx},${ny}`;

            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE &&
                maze[ny][nx] === 0 && !visited.has(key)) {
                visited.add(key);
                queue.push([nx, ny, [...path, [nx, ny]]]);
            }
        }
    }

    return [];
}

function togglePause() {
    if (gameState === GAME_STATE.PLAYING) {
        gameState = GAME_STATE.PAUSED;
        document.getElementById('pauseBtn').textContent = '▶ Resume';
        document.getElementById('message').textContent = 'PAUSED';
        document.getElementById('message').className = 'message info';
    } else if (gameState === GAME_STATE.PAUSED) {
        gameState = GAME_STATE.PLAYING;
        document.getElementById('pauseBtn').textContent = '⏸ Pause';
        document.getElementById('message').textContent = '';
        startTime = Date.now() - elapsedTime;
    }
}

function toggleHint() {
    if (gameState === GAME_STATE.PLAYING) {
        showHint = !showHint;
        if (showHint) {
            hintPath = findPath();
            document.getElementById('hintBtn').style.opacity = '0.6';
        } else {
            hintPath = [];
            document.getElementById('hintBtn').style.opacity = '1';
        }
    }
}

function updatePlayer() {
    let moved = false;
    const directions = [];

    if (keys['arrowup'] || keys['w']) directions.push([0, -1]);
    if (keys['arrowdown'] || keys['s']) directions.push([0, 1]);
    if (keys['arrowleft'] || keys['a']) directions.push([-1, 0]);
    if (keys['arrowright'] || keys['d']) directions.push([1, 0]);

    for (let [dx, dy] of directions) {
        const newX = playerX + dx;
        const newY = playerY + dy;

        if (newX >= 0 && newX < GRID_SIZE && newY >= 0 && newY < GRID_SIZE && maze[newY][newX] === 0) {
            playerX = newX;
            playerY = newY;
            moveCount++;
            moved = true;
        }
    }

    if (moved) {
        document.getElementById('moves').textContent = moveCount;
    }

    // Check win condition
    if (playerX === exitX && playerY === exitY) {
        gameState = GAME_STATE.WON;
        elapsedTime = Math.floor((Date.now() - gameStartTime) / 1000);
        
        let bestTimeStr = '--:--';
        if (!bestTime || elapsedTime < bestTime) {
            bestTime = elapsedTime;
            localStorage.setItem('bestTime', bestTime);
            bestTimeStr = formatTime(bestTime);
            document.getElementById('message').textContent = `🎉 VICTORY! New Best Time: ${bestTimeStr}`;
            document.getElementById('message').className = 'message success';
        } else {
            bestTimeStr = formatTime(bestTime);
            document.getElementById('message').textContent = `🎉 VICTORY! Time: ${formatTime(elapsedTime)} | Best: ${bestTimeStr}`;
            document.getElementById('message').className = 'message success';
        }
        
        document.getElementById('bestTime').textContent = bestTimeStr;
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellWidth = canvas.width / GRID_SIZE;
    const cellHeight = canvas.height / GRID_SIZE;

    // Draw maze
    ctx.fillStyle = '#333';
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (maze[y][x] === 1) {
                ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
            }
        }
    }

    // Draw hint path
    if (showHint && hintPath.length > 0) {
        ctx.strokeStyle = 'rgba(255, 193, 7, 0.3)';
        ctx.lineWidth = cellWidth / 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(playerX * cellWidth + cellWidth / 2, playerY * cellHeight + cellHeight / 2);
        for (let [x, y] of hintPath.slice(0, 10)) {
            ctx.lineTo(x * cellWidth + cellWidth / 2, y * cellHeight + cellHeight / 2);
        }
        ctx.stroke();
    }

    // Draw exit
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(exitX * cellWidth, exitY * cellHeight, cellWidth, cellHeight);

    // Draw player
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(playerX * cellWidth + 2, playerY * cellHeight + 2, cellWidth - 4, cellHeight - 4);

    // Draw border
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

function updateTimer() {
    if (gameState === GAME_STATE.PLAYING) {
        elapsedTime = Math.floor((Date.now() - gameStartTime) / 1000);
        document.getElementById('timer').textContent = formatTime(elapsedTime);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function clearBestTimeDisplay() {
    if (bestTime) {
        document.getElementById('bestTime').textContent = formatTime(bestTime);
    }
}

function gameLoop() {
    if (gameState === GAME_STATE.PLAYING) {
        updatePlayer();
        updateTimer();
    }

    draw();

    requestAnimationFrame(gameLoop);
}

// Initialize best time display
window.addEventListener('load', () => {
    clearBestTimeDisplay();
});