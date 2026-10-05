/**
 * MOUNTAIN BIKE RUSH - ULTIMATE EDITION
 * Logic & Physics Engine for Game & RL Agent
 */

(function (exports) {
    "use strict";

    // Level Definitions
    const LEVELS = [
        {
            id: 1,
            name: "Campo Verde",
            difficulty: "Baja",
            length: 3000,
            lives: 3,
            theme: {
                skyTop: "#4a90e2",
                skyBottom: "#87ceeb",
                groundTop: "#4caf50",
                groundBottom: "#2e7d32",
                mountainFar: "#81c784",
                mountainNear: "#388e3c",
                decorType: "grass"
            },
            terrainParams: { roughness: 30, frequency: 0.003, hillScale: 80, inclineEnd: 0 }
        },
        {
            id: 2,
            name: "Valle Rocoso",
            difficulty: "Media",
            length: 4000,
            lives: 3,
            theme: {
                skyTop: "#e65100",
                skyBottom: "#ffb74d",
                groundTop: "#8d6e63",
                groundBottom: "#4e342e",
                mountainFar: "#b0bec5",
                mountainNear: "#78909c",
                decorType: "rock"
            },
            terrainParams: { roughness: 45, frequency: 0.004, hillScale: 110, inclineEnd: 0 }
        },
        {
            id: 3,
            name: "Montaña Nevada",
            difficulty: "Alta",
            length: 5000,
            lives: 3,
            theme: {
                skyTop: "#1a237e",
                skyBottom: "#90caf9",
                groundTop: "#eceff1",
                groundBottom: "#90a4ae",
                mountainFar: "#b2ebf2",
                mountainNear: "#80deea",
                decorType: "snow"
            },
            terrainParams: { roughness: 55, frequency: 0.005, hillScale: 130, inclineEnd: 0 }
        },
        {
            id: 4,
            name: "Cañón Extremo",
            difficulty: "Muy Alta",
            length: 6000,
            lives: 2,
            theme: {
                skyTop: "#3e2723",
                skyBottom: "#ff7043",
                groundTop: "#bf360c",
                groundBottom: "#5d4037",
                mountainFar: "#a1887f",
                mountainNear: "#6d4c41",
                decorType: "canyon"
            },
            terrainParams: { roughness: 70, frequency: 0.006, hillScale: 160, inclineEnd: 0 }
        },
        {
            id: 5,
            name: "Cumbre Final",
            difficulty: "Épica",
            length: 7000,
            lives: 2,
            theme: {
                skyTop: "#0d47a1",
                skyBottom: "#ea80fc",
                groundTop: "#ffffff",
                groundBottom: "#37474f",
                mountainFar: "#ce93d8",
                mountainNear: "#ab47bc",
                decorType: "peak"
            },
            terrainParams: { roughness: 80, frequency: 0.007, hillScale: 180, inclineEnd: 2500 }
        }
    ];

    // Helper for procedural terrain height calculation
    function getGroundY(x, levelIndex = 0) {
        const level = LEVELS[levelIndex] || LEVELS[0];
        const p = level.terrainParams;
        
        if (x < 300) return 400;

        let y = 400;
        y -= Math.sin(x * p.frequency) * p.hillScale;
        y -= Math.sin(x * p.frequency * 2.3 + 1.2) * (p.hillScale * 0.4);
        y -= Math.sin(x * 0.02) * (p.roughness * 0.3);

        if (p.inclineEnd > 0 && x > level.length - p.inclineEnd) {
            const climbDist = x - (level.length - p.inclineEnd);
            y -= climbDist * 0.18; 
        }

        return y;
    }

    function getGroundSlope(x, levelIndex = 0) {
        const delta = 2;
        const y1 = getGroundY(x - delta, levelIndex);
        const y2 = getGroundY(x + delta, levelIndex);
        return Math.atan2(y2 - y1, delta * 2);
    }

    const storage = {
        getItem: function (key) {
            try {
                if (typeof localStorage !== "undefined") return localStorage.getItem(key);
            } catch (e) {}
            return this[key] || null;
        },
        setItem: function (key, val) {
            try {
                if (typeof localStorage !== "undefined") {
                    localStorage.setItem(key, val);
                    return;
                }
            } catch (e) {}
            this[key] = String(val);
        }
    };

    class GameEngine {
        constructor() {
            this.version = "1.0.0";
            this.started = false;
            this.paused = false;
            this.gameOver = false;
            this.levelComplete = false;
            this.won = false;

            this.currentLevelIndex = 0;
            this.unlockedLevel = parseInt(storage.getItem("mbr_unlocked_level") || "1", 10);
            this.bestScore = parseInt(storage.getItem("mbr_best_score") || "0", 10);

            this.resetBike();
            this.score = 0;
            this.lives = 3;
            this.combo = 1;
            this.comboTimer = 0;
            this.coinsCollected = 0;
            this.checkpointsPassed = 0;

            this.coins = [];
            this.checkpoints = [];
            this.obstacles = [];
            this.ramps = [];
            this.decorations = [];
            this.particles = [];
            this.floatingTexts = [];

            this.loadLevel(0);
        }

        resetBike() {
            this.bike = {
                x: 100,
                y: 350,
                vx: 0,
                vy: 0,
                angle: 0,
                angularVelocity: 0,
                radius: 20,
                onGround: false,
                invulnerableTimer: 0,
                pedalAngle: 0
            };
        }

        loadLevel(index) {
            this.currentLevelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
            const level = LEVELS[this.currentLevelIndex];

            this.resetBike();
            this.bike.y = getGroundY(this.bike.x, this.currentLevelIndex) - this.bike.radius;
            this.lives = level.lives;
            this.gameOver = false;
            this.levelComplete = false;
            this.started = true;
            this.paused = false;

            this.coins = [];
            this.checkpoints = [];
            this.obstacles = [];
            this.ramps = [];
            this.decorations = [];
            this.particles = [];
            this.floatingTexts = [];

            const len = level.length;

            let cpId = 1;
            for (let x = 800; x < len - 400; x += 800) {
                this.checkpoints.push({ id: cpId++, x: x, passed: false });
            }

            for (let x = 400; x < len - 300; x += 150 + Math.random() * 200) {
                const rand = Math.random();
                const gy = getGroundY(x, this.currentLevelIndex);

                if (rand < 0.25) {
                    const types = ["small", "medium", "large"];
                    const type = types[Math.floor(Math.random() * types.length)];
                    this.ramps.push({ x: x, y: gy, type: type });

                    for (let c = 0; c < 3; c++) {
                        this.coins.push({
                            x: x + c * 30,
                            y: gy - 60 - c * 20,
                            collected: false,
                            animFrame: Math.random() * 10
                        });
                    }
                    x += 100;
                } else if (rand < 0.6) {
                    const types = ["rock", "barrel", "log"];
                    const type = types[Math.floor(Math.random() * types.length)];
                    this.obstacles.push({ x: x, y: gy, type: type, hit: false });
                } else {
                    for (let c = 0; c < 4; c++) {
                        this.coins.push({
                            x: x + c * 25,
                            y: gy - 30 - Math.sin((c / 3) * Math.PI) * 40,
                            collected: false,
                            animFrame: Math.random() * 10
                        });
                    }
                }
            }

            for (let x = 50; x < len; x += 60 + Math.random() * 100) {
                this.decorations.push({
                    x: x,
                    y: getGroundY(x, this.currentLevelIndex),
                    type: level.theme.decorType,
                    scale: 0.7 + Math.random() * 0.6
                });
            }

            this.totalCheckpoints = this.checkpoints.length;
            this.remainingCoins = this.coins.length;
        }

        addScore(points, label, x, y) {
            const added = points * this.combo;
            this.score += added;
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                storage.setItem("mbr_best_score", this.bestScore);
            }
            if (label && x !== undefined && y !== undefined) {
                this.floatingTexts.push({
                    text: `+${added} ${label}`,
                    x: x,
                    y: y,
                    alpha: 1.0,
                    vy: -1.5
                });
            }
        }

        triggerCombo() {
            this.combo = Math.min(this.combo + 1, 5);
            this.comboTimer = 180;
        }

        addParticle(x, y, color, count = 5, speed = 3) {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = Math.random() * speed;
                this.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd - 1,
                    size: 2 + Math.random() * 4,
                    color: color,
                    alpha: 1.0,
                    life: 20 + Math.random() * 20
                });
            }
        }

        step(action = "nothing") {
            if (!this.started || this.paused || this.gameOver || this.levelComplete) {
                return this.getState();
            }

            const level = LEVELS[this.currentLevelIndex];
            const b = this.bike;

            const gravity = 0.45;
            const accel = 0.35;
            const friction = 0.985;
            const brakePower = 0.88;
            const airControl = 0.03;
            const maxSpeed = 16;

            if (b.invulnerableTimer > 0) b.invulnerableTimer--;

            if (this.comboTimer > 0) {
                this.comboTimer--;
                if (this.comboTimer === 0) this.combo = 1;
            }

            const currentGroundY = getGroundY(b.x, this.currentLevelIndex);
            const slope = getGroundSlope(b.x, this.currentLevelIndex);
            const groundDistance = currentGroundY - (b.y + b.radius);

            if (groundDistance <= 2 && b.vy >= 0) {
                if (!b.onGround) {
                    b.onGround = true;
                    this.addParticle(b.x, currentGroundY, "#8d6e63", 8, 4);
                    if (Math.abs(b.angle - slope) < 0.4) {
                        this.addScore(50, "Aterrizaje Limpio", b.x, b.y - 30);
                    }
                }
                b.y = currentGroundY - b.radius;
                b.vy = 0;
                b.angle += (slope - b.angle) * 0.25;
            } else {
                b.onGround = false;
                b.vy += gravity;
            }

            if (action === "accelerate") {
                if (b.onGround) {
                    b.vx += accel * Math.cos(slope);
                    b.vy += accel * Math.sin(slope);
                    b.pedalAngle += 0.2;
                } else {
                    b.angularVelocity += airControl;
                }
            } else if (action === "brake") {
                if (b.onGround) {
                    b.vx *= brakePower;
                } else {
                    b.angularVelocity -= airControl;
                }
            } else if (action === "jump") {
                if (b.onGround) {
                    b.vy = -10.5;
                    b.onGround = false;
                    this.triggerCombo();
                    this.addScore(20, "Salto", b.x, b.y - 20);
                    this.addParticle(b.x, b.y + b.radius, "#ffffff", 6, 3);
                }
            }

            if (!b.onGround) {
                b.angle += b.angularVelocity;
                b.angularVelocity *= 0.95;
            } else {
                b.angularVelocity = 0;
            }

            b.vx *= friction;
            if (b.onGround) {
                b.vx -= Math.sin(slope) * 0.25;
            }

            b.vx = Math.max(-2, Math.min(maxSpeed, b.vx));

            b.x += b.vx;
            b.y += b.vy;

            if (b.x < 50) {
                b.x = 50;
                b.vx = Math.max(0, b.vx);
            }

            if (b.vx > 1) {
                this.score += Math.floor(b.vx * 0.1);
            }

            for (let i = 0; i < this.coins.length; i++) {
                const c = this.coins[i];
                if (!c.collected && Math.hypot(b.x - c.x, b.y - c.y) < b.radius + 15) {
                    c.collected = true;
                    this.coinsCollected++;
                    this.addScore(100, "Moneda", c.x, c.y);
                    this.triggerCombo();
                    this.addParticle(c.x, c.y, "#ffd700", 10, 4);
                }
            }

            for (let i = 0; i < this.checkpoints.length; i++) {
                const cp = this.checkpoints[i];
                if (!cp.passed && b.x >= cp.x) {
                    cp.passed = true;
                    this.checkpointsPassed++;
                    this.addScore(500, "CHECKPOINT!", cp.x, b.y - 40);
                    this.addParticle(cp.x, b.y, "#00e676", 15, 6);
                }
            }

            for (let i = 0; i < this.ramps.length; i++) {
                const r = this.ramps[i];
                if (Math.abs(b.x - r.x) < 25 && b.onGround) {
                    const boost = r.type === "large" ? -14 : r.type === "medium" ? -12 : -10;
                    b.vy = boost;
                    b.vx += 2;
                    b.onGround = false;
                    this.addScore(150, "¡Gran Rampa!", r.x, r.y - 30);
                    this.addParticle(r.x, r.y, "#ff9800", 12, 5);
                }
            }

            if (b.invulnerableTimer === 0) {
                for (let i = 0; i < this.obstacles.length; i++) {
                    const obs = this.obstacles[i];
                    if (!obs.hit && Math.hypot(b.x - obs.x, b.y - obs.y) < b.radius + 18) {
                        obs.hit = true;
                        this.lives--;
                        b.vx *= 0.3;
                        b.vy = -4;
                        b.invulnerableTimer = 60;
                        this.addParticle(obs.x, obs.y, "#f44336", 15, 6);
                        this.floatingTexts.push({
                            text: "¡IMPACTO! -1 VIDA",
                            x: b.x,
                            y: b.y - 40,
                            alpha: 1.0,
                            vy: -1.5
                        });

                        if (this.lives <= 0) {
                            this.gameOver = true;
                        }
                        break;
                    }
                }
            }

            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.alpha -= 1 / p.life;
                if (p.alpha <= 0) this.particles.splice(i, 1);
            }

            for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
                const ft = this.floatingTexts[i];
                ft.y += ft.vy;
                ft.alpha -= 0.02;
                if (ft.alpha <= 0) this.floatingTexts.splice(i, 1);
            }

            if (b.x >= level.length) {
                this.levelComplete = true;
                if (this.currentLevelIndex + 1 > this.unlockedLevel) {
                    this.unlockedLevel = Math.min(5, this.currentLevelIndex + 2);
                    storage.setItem("mbr_unlocked_level", this.unlockedLevel);
                }
                if (this.currentLevelIndex === 4) {
                    this.won = true;
                }
            }

            return this.getState();
        }

        getAvailableActions() {
            return ["nothing", "accelerate", "brake", "jump"];
        }

        getState() {
            const level = LEVELS[this.currentLevelIndex];
            const b = this.bike;
            const progress = Math.min(1.0, Math.max(0.0, b.x / level.length));

            let obstacleAhead = false;
            let rampAhead = false;

            for (let obs of this.obstacles) {
                if (!obs.hit && obs.x > b.x && obs.x < b.x + 250) {
                    obstacleAhead = true;
                    break;
                }
            }

            for (let r of this.ramps) {
                if (r.x > b.x && r.x < b.x + 250) {
                    rampAhead = true;
                    break;
                }
            }

            return {
                version: this.version,
                started: this.started,
                paused: this.paused,
                level: level.id,
                levelName: level.name,
                x: Math.round(b.x * 100) / 100,
                y: Math.round(b.y * 100) / 100,
                velocityX: Math.round(b.vx * 100) / 100,
                velocityY: Math.round(b.vy * 100) / 100,
                angle: Math.round(b.angle * 100) / 100,
                groundY: Math.round(getGroundY(b.x, this.currentLevelIndex) * 100) / 100,
                onGround: b.onGround,
                distance: Math.round(b.x),
                levelLength: level.length,
                progress: Math.round(progress * 100) / 100,
                score: this.score,
                bestScore: this.bestScore,
                lives: this.lives,
                coinsCollected: this.coinsCollected,
                remainingCoins: this.coins.filter(c => !c.collected).length,
                checkpointsPassed: this.checkpointsPassed,
                totalCheckpoints: this.totalCheckpoints,
                combo: this.combo,
                gameOver: this.gameOver,
                levelComplete: this.levelComplete,
                won: this.won,
                unlockedLevel: this.unlockedLevel,
                obstacleAhead: obstacleAhead,
                rampAhead: rampAhead
            };
        }

        resetGame() {
            this.score = 0;
            this.coinsCollected = 0;
            this.checkpointsPassed = 0;
            this.combo = 1;
            this.won = false;
            this.loadLevel(0);
            return this.getState();
        }

        startLevel(lvlNumber) {
            const idx = Math.max(0, Math.min(lvlNumber - 1, LEVELS.length - 1));
            this.loadLevel(idx);
            return this.getState();
        }

        nextLevel() {
            if (this.currentLevelIndex < LEVELS.length - 1) {
                this.loadLevel(this.currentLevelIndex + 1);
            }
            return this.getState();
        }

        getLevelData() {
            return LEVELS.map(l => ({
                id: l.id,
                name: l.name,
                difficulty: l.difficulty,
                length: l.length,
                unlocked: l.id <= this.unlockedLevel
            }));
        }
    }

    const game = new GameEngine();

    exports.game = game;
    exports.step = action => game.step(action);
    exports.getState = () => game.getState();
    exports.getAvailableActions = () => game.getAvailableActions();
    exports.resetGame = () => game.resetGame();
    exports.startLevel = lvl => game.startLevel(lvl);
    exports.nextLevel = () => game.nextLevel();
    exports.getLevelData = () => game.getLevelData();
    exports.LEVELS = LEVELS;
    exports.getGroundY = getGroundY;

})(typeof exports !== "undefined" ? exports : (window.GameModule = {}));