const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Basic setup for the game
let score = 0;
let gold = 100;
const slimes = [];
const enemies = [];
const effects = [];
const particles = [];
const powerUps = [];
let waveNumber = 1;
let selectedSlime = 'normal';
let gameRunning = false;
let gamePaused = false;
let spawnInterval;
let powerUpInterval;
let difficulty = 'medium'; // Default difficulty
let waveTimer = 10; // Timer for next wave
let wavesCompleted = 0; // Number of waves completed
let waveInProgress = false;

const bgMusic = document.getElementById('bg-music');
const shootSound = document.getElementById('shoot-sound');
const hitSound = document.getElementById('hit-sound');
const titleMusic = document.getElementById('title-music');
const clickSound = document.getElementById('click-sound');
const infoBox = document.getElementById('info-box');
const infoContent = document.getElementById('info-content');

let scoreMultiplier = 1;
let consecutiveKills = 0;
let currentLevel = 1;
const maxLevel = 10;
const wavesPerLevel = 2; // Number of waves to complete to increase level

const grassImg = new Image();
grassImg.src = 'grass.png';

const brickImg = new Image();
brickImg.src = 'brick.png';

const TILE_SIZE = 32;
const TILE_ROWS = canvas.height / TILE_SIZE;
const TILE_COLS = canvas.width / TILE_SIZE;

const path = [
    {x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}, {x: 2, y: 3},
    {x: 2, y: 4}, {x: 2, y: 5}, {x: 2, y: 6}, {x: 2, y: 7},
    {x: 2, y: 8}, {x: 2, y: 9}, {x: 2, y: 10}, {x: 2, y: 11},
    {x: 2, y: 12}, {x: 2, y: 13}, {x: 2, y: 14}, {x: 2, y: 15},
    {x: 2, y: 16}, {x: 2, y: 16}, {x: 2, y: 16}, {x: 3, y: 16},
    {x: 4, y: 16}, {x: 5, y: 16}, {x: 6, y: 16}, {x: 7, y: 16},
    {x: 8, y: 16}, {x: 9, y: 16}, {x: 10, y: 16}, {x: 11, y: 16},
    {x: 12, y: 16}, {x: 13, y: 16}, {x: 14, y: 16}, {x: 15, y: 16},
    {x: 16, y: 16}, {x: 17, y: 16}, {x: 18, y: 16}, {x: 19, y: 16},
    {x: 20, y: 16}, {x: 21, y: 16}, {x: 22, y: 16},
    // Add more coordinates as needed to complete the path
];

function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}

function setDifficulty(level) {
    difficulty = level;
    document.getElementById('start-button').style.display = 'block';
    console.log(`Difficulty set to: ${level}`);
    playSound(clickSound);
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    document.getElementById('pause-button').style.display = 'block';
    gameRunning = true;
    waveInProgress = false;
    waveTimer = 10; // Reset the wave timer at the start of the game
    titleMusic.pause();
    bgMusic.play();
    gameLoop();
    clearInterval(spawnInterval);
    clearInterval(powerUpInterval);
    spawnInterval = setInterval(spawnWave, 10000); // Spawn a new wave every 10 seconds
    powerUpInterval = setInterval(spawnPowerUp, 15000); // Spawn a new power-up every 15 seconds
    startWaveTimer(); // Start the wave timer
    playSound(clickSound);
}

function restartGame() {
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    document.getElementById('pause-button').style.display = 'block';
    score = 0;
    gold = 100;
    slimes.length = 0;
    enemies.length = 0;
    effects.length = 0;
    powerUps.length = 0;
    waveNumber = 1;
    currentLevel = 1;
    wavesCompleted = 0;
    gameRunning = true;
    gamePaused = false;
    waveInProgress = false;
    waveTimer = 10; // Reset the wave timer
    bgMusic.play();
    gameLoop();
    clearInterval(spawnInterval);
    clearInterval(powerUpInterval);
    spawnInterval = setInterval(spawnWave, 10000); // Spawn a new wave every 10 seconds
    powerUpInterval = setInterval(spawnPowerUp, 15000); // Spawn a new power-up every 15 seconds
    startWaveTimer(); // Start the wave timer
    playSound(clickSound);
}

function gameOver() {
    gameRunning = false;
    clearInterval(spawnInterval);
    clearInterval(powerUpInterval);
    bgMusic.pause();
    bgMusic.currentTime = 0;
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('pause-button').style.display = 'none';
    document.getElementById('final-score').textContent = `Final Score: ${score}`;
}

function togglePause() {
    gamePaused = !gamePaused;
    document.getElementById('pause-button').textContent = gamePaused ? 'Resume' : 'Pause';
    if (!gamePaused) {
        gameLoop();
        spawnInterval = setInterval(spawnWave, 10000); // Resume wave spawning
        powerUpInterval = setInterval(spawnPowerUp, 15000); // Resume power-up spawning
    } else {
        clearInterval(spawnInterval);
        clearInterval(powerUpInterval);
    }
    console.log(`Game Paused: ${gamePaused}`);
    logState();
    playSound(clickSound);
}

class Slime {
    constructor(x, y, range, damage, rateOfFire, color, upgradeCost) {
        this.x = x;
        this.y = y;
        this.range = range;
        this.damage = damage;
        this.rateOfFire = rateOfFire;
        this.color = color;
        this.upgradeCost = upgradeCost;
        this.lastShotTime = 0;
        this.level = 1;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
    }

    shoot(enemy) {
        const now = Date.now();
        if (now - this.lastShotTime > this.rateOfFire) {
            enemy.health -= this.damage;
            this.lastShotTime = now;
            effects.push(new Effect(enemy.x, enemy.y, this.color));
            particles.push(new Particle(enemy.x, enemy.y, this.color));
            shootSound.play();
        }
    }

    update(enemies) {
        for (let enemy of enemies) {
            const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            if (dist < this.range) {
                this.shoot(enemy);
                break;
            }
        }
    }

    upgrade() {
        if (gold >= this.upgradeCost) {
            gold -= this.upgradeCost;
            this.range += 20;
            this.damage += 5;
            this.rateOfFire -= 100;
            this.upgradeCost += 20;
            this.level++;
            updateSidebar();
        }
    }
}

class FastSlime extends Slime {
    constructor(x, y) {
        super(x, y, 150, 5, 500, 'cyan', 30);
    }
}

class StrongSlime extends Slime {
    constructor(x, y) {
        super(x, y, 100, 20, 1500, 'darkblue', 40);
    }
}

class SlowSlime extends Slime {
    constructor(x, y) {
        super(x, y, 100, 5, 1000, 'lightblue', 25);
    }

    shoot(enemy) {
        const now = Date.now();
        if (now - this.lastShotTime > this.rateOfFire) {
            enemy.health -= this.damage;
            enemy.speed /= 2; // Slow down enemy
            this.lastShotTime = now;
            effects.push(new Effect(enemy.x, enemy.y, this.color));
            particles.push(new Particle(enemy.x, enemy.y, this.color));
            shootSound.play();
            setTimeout(() => {
                enemy.speed *= 2; // Restore speed after 3 seconds
            }, 3000);
        }
    }
}

class AoESlime extends Slime {
    constructor(x, y) {
        super(x, y, 100, 15, 1500, 'orange', 35);
    }

    shoot(enemy) {
        const now = Date.now();
        if (now - this.lastShotTime > this.rateOfFire) {
            this.lastShotTime = now;
            shootSound.play();
            for (let e of enemies) {
                if (Math.hypot(e.x - enemy.x, e.y - enemy.y) < 50) {
                    e.health -= this.damage;
                    effects.push(new Effect(e.x, e.y, this.color));
                    particles.push(new Particle(e.x, e.y, this.color));
                }
            }
        }
    }
}

class ExplosiveSlime extends Slime {
    constructor(x, y) {
        super(x, y, 100, 10, 1000, 'red', 40);
    }

    update(enemies) {
        super.update(enemies);
        if (this.health <= 0) {
            this.explode();
        }
    }

    explode() {
        enemies.forEach(enemy => {
            if (Math.hypot(enemy.x - this.x, enemy.y - this.y) < 50) {
                enemy.health -= 20; // Damage to nearby enemies
                effects.push(new Effect(enemy.x, enemy.y, 'red'));
                particles.push(new Particle(enemy.x, enemy.y, 'red'));
            }
        });
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.health = this.getInitialHealth();
        this.maxHealth = this.health;
        this.speed = this.getInitialSpeed();
        this.pathIndex = 0; // Track the current path index
        this.target = path[this.pathIndex]; // Set the initial target
    }

    getInitialHealth() {
        switch (difficulty) {
            case 'easy':
                return 50;
            case 'medium':
                return 100;
            case 'hard':
                return 150;
            default:
                return 100;
        }
    }

    getInitialSpeed() {
        switch (difficulty) {
            case 'easy':
                return 1;
            case 'medium':
                return 1.5; // Adjusted for a reasonable speed
            case 'hard':
                return 2; // Adjusted for a reasonable speed
            default:
                return 1.5; // Adjusted for a reasonable speed
        }
    }

    draw() {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();
        this.drawHealthBar();
    }

    drawHealthBar() {
        const healthBarWidth = 30;
        const healthBarHeight = 5;
        const healthBarX = this.x - healthBarWidth / 2;
        const healthBarY = this.y - 20;

        ctx.fillStyle = 'black';
        ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

        ctx.fillStyle = 'green';
        ctx.fillRect(
            healthBarX,
            healthBarY,
            (healthBarWidth * this.health) / this.maxHealth,
            healthBarHeight
        );
    }

    update() {
        if (this.health <= 0) {
            console.log('Enemy died'); // Debugging
            hitSound.play();
            return false; // Return false to indicate the enemy should be removed
        }

        const targetX = this.target.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = this.target.y * TILE_SIZE + TILE_SIZE / 2;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < this.speed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;
            if (this.pathIndex < path.length) {
                this.target = path[this.pathIndex];
            } else {
                gameOver();
                return false; // Return false to indicate the enemy reached the base
            }
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        return true; // Return true to indicate the enemy is still alive
    }
}

class FastEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.health = this.getInitialHealth() / 2;
        this.speed = this.getInitialSpeed() * 2;
    }

    draw() {
        ctx.fillStyle = 'purple';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();
        this.drawHealthBar();
    }
}

class StrongEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.health = this.getInitialHealth() * 2;
        this.speed = this.getInitialSpeed() / 2;
    }

    draw() {
        ctx.fillStyle = 'darkred';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
        this.drawHealthBar();
    }
}

class ArmoredEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.health = this.getInitialHealth() * 2;
        this.speed = this.getInitialSpeed() / 2;
    }

    draw() {
        ctx.fillStyle = 'gray';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
        ctx.fill();
        this.drawHealthBar();
    }
}

class RegeneratingEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.regenerationRate = this.getInitialHealth() * 0.01;
    }

    update() {
        super.update();
        this.health = Math.min(this.maxHealth, this.health + this.regenerationRate);
    }

    draw() {
        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();
        this.drawHealthBar();
    }
}

class BossEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.health = this.getInitialHealth() * 10;
        this.speed = this.getInitialSpeed() * 0.5;
    }

    draw() {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
        ctx.fill();
        this.drawHealthBar();
    }

    update() {
        super.update();
        this.healthBarWidth = 50;
    }
}

class FlyingEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.y = -30; // Start off-screen
    }

    update() {
        if (this.y < canvas.height / 2) {
            this.y += this.speed; // Fly down towards the middle of the screen
        } else {
            this.x += this.speed; // Then move horizontally towards the base
        }
        super.update();
    }

    draw() {
        ctx.fillStyle = 'skyblue';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();
        this.drawHealthBar();
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = this.getColorByType();
    }

    getColorByType() {
        switch (this.type) {
            case 'gold':
                return 'yellow';
            case 'damage':
                return 'red';
            case 'slow':
                return 'blue';
            default:
                return 'white';
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();
    }

    collect() {
        switch (this.type) {
            case 'gold':
                gold += 50;
                break;
            case 'damage':
                slimes.forEach(slime => {
                    slime.damage += 10;
                });
                setTimeout(() => {
                    slimes.forEach(slime => {
                        slime.damage -= 10;
                    });
                }, 5000);
                break;
            case 'slow':
                enemies.forEach(enemy => {
                    enemy.speed /= 2;
                });
                setTimeout(() => {
                    enemies.forEach(enemy => {
                        enemy.speed *= 2;
                    });
                }, 5000);
                break;
        }
        updateSidebar();
    }
}

class Effect {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.alpha = 1;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    update() {
        this.alpha -= 0.02;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.alpha = 1;
        this.size = Math.random() * 5 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= 0.01;
    }

    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

const gridSize = 32;

function getGridPosition(x, y) {
    return {
        x: Math.floor(x / gridSize) * gridSize + gridSize / 2,
        y: Math.floor(y / gridSize) * gridSize + gridSize / 2
    };
}

function selectSlime(type) {
    selectedSlime = type;
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const gridPos = getGridPosition(x, y);

    let clickedOnSlime = false;

    for (let slime of slimes) {
        const dist = Math.hypot(slime.x - gridPos.x, slime.y - gridPos.y);
        if (dist < 20) {
            slime.upgrade();
            clickedOnSlime = true;
            showInfo(`Slime Level: ${slime.level}\nRange: ${slime.range}\nDamage: ${slime.damage}\nRate of Fire: ${slime.rateOfFire}\nUpgrade Cost: ${slime.upgradeCost}`);
            break;
        }
    }

    if (!clickedOnSlime) {
        if (selectedSlime === 'normal' && gold >= 10) {
            slimes.push(new Slime(gridPos.x, gridPos.y, 100, 10, 1000, 'blue', 20));
            gold -= 10;
        } else if (selectedSlime === 'fast' && gold >= 15) {
            slimes.push(new FastSlime(gridPos.x, gridPos.y));
            gold -= 15;
        } else if (selectedSlime === 'strong' && gold >= 20) {
            slimes.push(new StrongSlime(gridPos.x, gridPos.y));
            gold -= 20;
        } else if (selectedSlime === 'slow' && gold >= 25) {
            slimes.push(new SlowSlime(gridPos.x, gridPos.y));
            gold -= 25;
        } else if (selectedSlime === 'aoe' && gold >= 35) {
            slimes.push(new AoESlime(gridPos.x, gridPos.y));
            gold -= 35;
        } else if (selectedSlime === 'explosive' && gold >= 40) {
            slimes.push(new ExplosiveSlime(gridPos.x, gridPos.y));
            gold -= 40;
        }
        updateSidebar();
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        let powerUp = powerUps[i];
        const dist = Math.hypot(powerUp.x - x, powerUp.y - y);
        if (dist < 20) {
            powerUp.collect();
            powerUps.splice(i, 1);
        }
    }
});

function showInfo(text) {
    infoContent.textContent = text;
    infoBox.style.display = 'block';
    setTimeout(() => {
        infoBox.style.display = 'none';
    }, 3000);
}

function drawPath() {
    ctx.beginPath();
    ctx.moveTo(50, 0);
    ctx.lineTo(50, 550);
    ctx.lineTo(750, 550);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 32;
    ctx.stroke();
}

function drawBase() {
    ctx.fillStyle = 'green';
    ctx.fillRect(750, 500, 50, 50);
}

function updateSidebar() {
    document.getElementById('gold').textContent = gold;
    document.getElementById('wave-number').textContent = waveNumber;
    console.log(`Sidebar updated: Gold=${gold}, Wave=${waveNumber}`); // Debugging
}

function nextLevel() {
    if (currentLevel < maxLevel) {
        currentLevel++;
        wavesCompleted = 0;
        resetMultiplier();
        alert(`Level ${currentLevel}!`);
    } else {
        alert('You have completed all levels!');
        gameOver();
    }
}

function spawnWave() {
    if (gamePaused || !gameRunning || waveInProgress) return;
    waveInProgress = true;

    if (waveNumber % 10 === 0) {
        enemies.push(new BossEnemy(50, -30));
    } else {
        for (let i = 0; i < waveNumber * 5; i++) {
            const type = Math.random();
            if (type < 0.5) {
                enemies.push(new Enemy(50, -i * 30));
            } else if (type < 0.65) {
                enemies.push(new FastEnemy(50, -i * 30));
            } else if (type < 0.8) {
                enemies.push(new StrongEnemy(50, -i * 30));
            } else if (type < 0.9) {
                enemies.push(new ArmoredEnemy(50, -i * 30));
            } else if (type < 0.95) {
                enemies.push(new RegeneratingEnemy(50, -i * 30));
            } else {
                enemies.push(new FlyingEnemy(50, -i * 30));
            }
        }
    }
    waveNumber++;
    wavesCompleted++;
    updateSidebar();
    waveInProgress = false; // Reset wave in progress flag
    startWaveTimer(); // Start the timer for the next wave
}

function startWaveTimer() {
    waveTimer = 10; // Reset wave timer
    const waveInterval = setInterval(() => {
        if (!gameRunning || gamePaused) {
            clearInterval(waveInterval);
            return;
        }
        waveTimer--;
        document.getElementById('wave-timer').textContent = waveTimer;
        if (waveTimer <= 0) {
            clearInterval(waveInterval);
            spawnWave();
        }
    }, 1000);
}

function spawnPowerUp() {
    if (gamePaused || !gameRunning) return;
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = Math.random() * (canvas.height - 100) + 50;
    const type = Math.random() < 0.5 ? 'gold' : Math.random() < 0.5 ? 'damage' : 'slow';
    powerUps.push(new PowerUp(x, y, type));
}

function increaseScore() {
    score += 10 * scoreMultiplier;
    consecutiveKills++;
    if (consecutiveKills % 5 === 0) {
        scoreMultiplier++;
    }
    console.log(`Score after increase: ${score}`); // Debugging
    document.getElementById('score').textContent = score;
}

function resetMultiplier() {
    scoreMultiplier = 1;
    consecutiveKills = 0;
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        if (!enemy.update()) {
            console.log('Removing enemy'); // Debugging
            enemies.splice(i, 1); // Remove the enemy if it's dead or reached the base
            gold += 5; // Reward for killing an enemy
            console.log(`Gold after killing enemy: ${gold}`); // Debugging
            increaseScore();
            updateSidebar();
        } else {
            enemy.draw();
        }
    }
}

function updateEffects() {
    for (let i = effects.length - 1; i >= 0; i--) {
        let effect = effects[i];
        effect.update();
        if (effect.alpha <= 0) {
            effects.splice(i, 1);
        } else {
            effect.draw();
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let particle = particles[i];
        particle.update();
        if (particle.alpha <= 0) {
            particles.splice(i, 1);
        } else {
            particle.draw();
        }
    }
}

function updatePowerUps() {
    for (let powerUp of powerUps) {
        powerUp.draw();
    }
}

function drawBackground() {
    for (let row = 0; row < TILE_ROWS; row++) {
        for (let col = 0; col < TILE_COLS; col++) {
            ctx.drawImage(grassImg, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function drawPath() {
    for (let i = 0; i < path.length; i++) {
        let tile = path[i];
        ctx.drawImage(brickImg, tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
}

function gameLoop() {
    if (!gameRunning || gamePaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawPath();
    drawBase();

    for (let slime of slimes) {
        slime.draw();
        slime.update(enemies);
    }

    updateEnemies(); // Ensure this is called in the game loop

    updateEffects();
    updatePowerUps();
    updateParticles();

    requestAnimationFrame(gameLoop);
}

// Play title music on first user interaction
function playTitleMusic() {
    titleMusic.play().catch((error) => {
        console.error('Error playing title music:', error);
    });
}

document.addEventListener('click', playTitleMusic, { once: true });

// Add event listeners to buttons for click sound
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
        playSound(clickSound);
    });
});

// Logging function to help debug the wave progression
function logState() {
    console.log(`Wave Number: ${waveNumber}`);
    console.log(`Waves Completed: ${wavesCompleted}`);
    console.log(`Enemies Count: ${enemies.length}`);
    console.log(`Wave Timer: ${waveTimer}`);
    console.log(`Wave In Progress: ${waveInProgress}`);
    console.log(`Current Gold: ${gold}`); // Added to track gold state
}

setInterval(logState, 5000); // Log the state every 5 seconds
