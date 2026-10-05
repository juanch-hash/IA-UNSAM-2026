/**
 * MOUNTAIN BIKE RUSH - ULTIMATE EDITION
 * UI & Canvas Rendering Engine
 */

(function () {
    "use strict";

    const game = window.GameModule.game;
    const LEVELS = window.GameModule.LEVELS;
    const getGroundY = window.GameModule.getGroundY;

    let canvas, ctx;
    let cameraX = 0;
    let cameraY = 0;
    let screenShake = 0;

    const keys = {};

    function init() {
        canvas = document.getElementById("gameCanvas");
        ctx = canvas.getContext("2d");

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        window.addEventListener("keydown", (e) => {
            keys[e.key.toLowerCase()] = true;
            keys[e.code] = true;

            if (e.key.toLowerCase() === "p") {
                game.paused = !game.paused;
                updateUIPanels();
            }
            if (e.key.toLowerCase() === "r") {
                game.startLevel(game.currentLevelIndex + 1);
                updateUIPanels();
            }
        });

        window.addEventListener("keyup", (e) => {
            keys[e.key.toLowerCase()] = false;
            keys[e.code] = false;
        });

        setupDOMEvents();
        requestAnimationFrame(gameLoop);
    }

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function setupDOMEvents() {
        document.getElementById("btn-play").onclick = () => {
            hideAllPanels();
            game.startLevel(1);
        };

        document.getElementById("btn-select-level").onclick = () => {
            renderLevelSelector();
            showPanel("panel-level-select");
        };

        document.getElementById("btn-level-back").onclick = () => {
            showPanel("panel-main-menu");
        };

        document.getElementById("btn-resume").onclick = () => {
            game.paused = false;
            updateUIPanels();
        };

        document.getElementById("btn-restart-pause").onclick = () => {
            game.startLevel(game.currentLevelIndex + 1);
            updateUIPanels();
        };

        document.getElementById("btn-menu-pause").onclick = () => {
            game.started = false;
            showPanel("panel-main-menu");
        };

        document.getElementById("btn-retry-over").onclick = () => {
            game.startLevel(game.currentLevelIndex + 1);
            updateUIPanels();
        };

        document.getElementById("btn-menu-over").onclick = () => {
            game.started = false;
            showPanel("panel-main-menu");
        };

        document.getElementById("btn-next-level").onclick = () => {
            game.nextLevel();
            updateUIPanels();
        };

        document.getElementById("btn-menu-win").onclick = () => {
            game.started = false;
            showPanel("panel-main-menu");
        };

        document.getElementById("btn-play-again-final").onclick = () => {
            game.startLevel(1);
            updateUIPanels();
        };

        document.getElementById("btn-menu-final").onclick = () => {
            game.started = false;
            showPanel("panel-main-menu");
        };
    }

    function showPanel(panelId) {
        document.querySelectorAll(".ui-panel").forEach(p => p.classList.add("hidden"));
        const target = document.getElementById(panelId);
        if (target) target.classList.remove("hidden");
    }

    function hideAllPanels() {
        document.querySelectorAll(".ui-panel").forEach(p => p.classList.add("hidden"));
    }

    function renderLevelSelector() {
        const grid = document.getElementById("levels-grid");
        grid.innerHTML = "";
        const levels = game.getLevelData();

        levels.forEach(lvl => {
            const card = document.createElement("div");
            card.className = `level-card ${lvl.unlocked ? "" : "locked"}`;
            card.innerHTML = `
                <h3>NIVEL ${lvl.id}</h3>
                <h4>${lvl.name}</h4>
                <p>Dificultad: <strong>${lvl.difficulty}</strong></p>
                <p>Longitud: ${lvl.length}m</p>
                ${lvl.unlocked ? '<button class="btn-primary">JUGAR</button>' : '<div class="lock-icon">🔒 BLOQUEADO</div>'}
            `;
            if (lvl.unlocked) {
                card.onclick = () => {
                    game.startLevel(lvl.id);
                    hideAllPanels();
                };
            }
            grid.appendChild(card);
        });
    }

    function updateUIPanels() {
        const state = game.getState();

        document.getElementById("best-score-display").innerText = state.bestScore;
        document.getElementById("unlocked-level-display").innerText = state.unlockedLevel;

        if (!state.started) {
            showPanel("panel-main-menu");
            return;
        }

        if (state.paused) {
            showPanel("panel-pause");
            return;
        }

        if (state.gameOver) {
            document.getElementById("over-score").innerText = state.score;
            document.getElementById("over-coins").innerText = state.coinsCollected;
            document.getElementById("over-dist").innerText = state.distance + "m";
            showPanel("panel-gameover");
            return;
        }

        if (state.levelComplete) {
            if (state.won) {
                document.getElementById("final-score").innerText = state.score;
                document.getElementById("final-coins").innerText = state.coinsCollected;
                document.getElementById("final-best").innerText = state.bestScore;
                showPanel("panel-final-win");
            } else {
                document.getElementById("win-score").innerText = state.score;
                document.getElementById("win-coins").innerText = state.coinsCollected;
                document.getElementById("win-best").innerText = state.bestScore;
                showPanel("panel-level-win");
            }
            return;
        }

        hideAllPanels();
    }

    function gameLoop() {
        if (game.started && !game.paused && !game.gameOver && !game.levelComplete) {
            let action = "nothing";
            if (keys["w"] || keys["arrowup"]) action = "accelerate";
            else if (keys["s"] || keys["arrowdown"]) action = "brake";
            else if (keys[" "] || keys["space"]) action = "jump";

            const prevStateLives = game.lives;
            game.step(action);

            if (game.lives < prevStateLives) {
                screenShake = 15;
            }
        }

        updateUIPanels();
        render();

        requestAnimationFrame(gameLoop);
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const level = LEVELS[game.currentLevelIndex];
        const b = game.bike;

        const targetCamX = b.x - canvas.width * 0.35;
        const targetCamY = b.y - canvas.height * 0.6;
        cameraX += (targetCamX - cameraX) * 0.1;
        cameraY += (targetCamY - cameraY) * 0.1;

        ctx.save();
        
        if (screenShake > 0) {
            const sx = (Math.random() - 0.5) * screenShake;
            const sy = (Math.random() - 0.5) * screenShake;
            ctx.translate(sx, sy);
            screenShake *= 0.9;
            if (screenShake < 0.5) screenShake = 0;
        }

        renderBackground(level);

        ctx.save();
        ctx.translate(-cameraX, -cameraY);

        renderTerrain(level);
        renderDecorations();
        renderCheckpoints();
        renderRamps();
        renderObstacles();
        renderCoins();
        renderParticles();
        renderBike();
        renderFloatingTexts();

        ctx.restore();
        ctx.restore();

        if (game.started && !game.gameOver && !game.levelComplete) {
            renderHUD();
        }
    }

    function renderBackground(level) {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, level.theme.skyTop);
        skyGrad.addColorStop(1, level.theme.skyBottom);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = level.theme.mountainFar;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x += 50) {
            const worldX = x + cameraX * 0.2;
            const y = canvas.height * 0.5 - Math.sin(worldX * 0.001) * 120 - Math.cos(worldX * 0.003) * 60;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = level.theme.mountainNear;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x += 30) {
            const worldX = x + cameraX * 0.5;
            const y = canvas.height * 0.65 - Math.sin(worldX * 0.002) * 80 - Math.sin(worldX * 0.005) * 40;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();
    }

    function renderTerrain(level) {
        ctx.beginPath();
        ctx.moveTo(cameraX - 100, canvas.height + cameraY + 200);

        const startX = Math.max(0, Math.floor(cameraX - 100));
        const endX = Math.min(level.length + 300, Math.ceil(cameraX + canvas.width + 100));

        for (let x = startX; x <= endX; x += 10) {
            const y = getGroundY(x, game.currentLevelIndex);
            ctx.lineTo(x, y);
        }

        ctx.lineTo(endX, canvas.height + cameraY + 400);
        ctx.closePath();

        const groundGrad = ctx.createLinearGradient(0, cameraY, 0, cameraY + canvas.height);
        groundGrad.addColorStop(0, level.theme.groundTop);
        groundGrad.addColorStop(1, level.theme.groundBottom);
        ctx.fillStyle = groundGrad;
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += 10) {
            const y = getGroundY(x, game.currentLevelIndex);
            if (x === startX) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = level.theme.groundTop;
        ctx.stroke();

        const finishX = level.length;
        const finishY = getGroundY(finishX, game.currentLevelIndex);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(finishX - 5, finishY - 80, 10, 80);
        ctx.fillStyle = "#e53935";
        ctx.beginPath();
        ctx.moveTo(finishX + 5, finishY - 80);
        ctx.lineTo(finishX + 45, finishY - 60);
        ctx.lineTo(finishX + 5, finishY - 40);
        ctx.closePath();
        ctx.fill();
    }

    function renderDecorations() {
        game.decorations.forEach(d => {
            if (d.x < cameraX - 100 || d.x > cameraX + canvas.width + 100) return;
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.scale(d.scale, d.scale);

            if (d.type === "grass") {
                ctx.fillStyle = "#2e7d32";
                ctx.beginPath();
                ctx.arc(0, -15, 15, 0, Math.PI, true);
                ctx.fill();
            } else if (d.type === "snow") {
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(-4, -10, 8, 10);
                ctx.fillStyle = "#2e7d32";
                ctx.beginPath();
                ctx.moveTo(0, -50); ctx.lineTo(-20, -10); ctx.lineTo(20, -10);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.moveTo(0, -50); ctx.lineTo(-8, -35); ctx.lineTo(8, -35);
                ctx.closePath(); ctx.fill();
            } else if (d.type === "canyon") {
                ctx.fillStyle = "#388e3c";
                ctx.fillRect(-5, -35, 10, 35);
                ctx.fillRect(-15, -25, 10, 5);
                ctx.fillRect(-15, -35, 5, 15);
            } else {
                ctx.fillStyle = "#78909c";
                ctx.beginPath();
                ctx.arc(0, -8, 10, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
    }

    function renderCheckpoints() {
        game.checkpoints.forEach(cp => {
            if (cp.x < cameraX - 100 || cp.x > cameraX + canvas.width + 100) return;
            const gy = getGroundY(cp.x, game.currentLevelIndex);
            
            ctx.strokeStyle = cp.passed ? "#00e676" : "#ff5722";
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(cp.x, gy);
            ctx.lineTo(cp.x, gy - 70);
            ctx.stroke();

            ctx.fillStyle = cp.passed ? "#00e676" : "#ff5722";
            ctx.beginPath();
            ctx.arc(cp.x, gy - 70, 10, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function renderRamps() {
        game.ramps.forEach(r => {
            if (r.x < cameraX - 100 || r.x > cameraX + canvas.width + 100) return;
            const w = r.type === "large" ? 60 : r.type === "medium" ? 45 : 30;
            const h = r.type === "large" ? 35 : r.type === "medium" ? 25 : 18;

            ctx.fillStyle = "#d84315";
            ctx.beginPath();
            ctx.moveTo(r.x - w / 2, r.y);
            ctx.lineTo(r.x + w / 2, r.y - h);
            ctx.lineTo(r.x + w / 2, r.y);
            ctx.closePath();
            ctx.fill();
        });
    }

    function renderObstacles() {
        game.obstacles.forEach(obs => {
            if (obs.x < cameraX - 100 || obs.x > cameraX + canvas.width + 100) return;
            
            ctx.save();
            ctx.translate(obs.x, obs.y);

            if (obs.type === "rock") {
                ctx.fillStyle = "#546e7a";
                ctx.beginPath();
                ctx.arc(0, -12, 14, 0, Math.PI * 2);
                ctx.fill();
            } else if (obs.type === "barrel") {
                ctx.fillStyle = "#c62828";
                ctx.fillRect(-10, -24, 20, 24);
                ctx.fillStyle = "#ffb300";
                ctx.fillRect(-10, -18, 20, 4);
            } else {
                ctx.fillStyle = "#4e342e";
                ctx.beginPath();
                ctx.roundRect(-15, -10, 30, 10, 4);
                ctx.fill();
            }
            ctx.restore();
        });
    }

    function renderCoins() {
        game.coins.forEach(c => {
            if (c.collected || c.x < cameraX - 100 || c.x > cameraX + canvas.width + 100) return;
            
            ctx.save();
            ctx.translate(c.x, c.y);
            
            c.animFrame += 0.1;
            const scaleX = Math.sin(c.animFrame);
            ctx.scale(scaleX, 1);

            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = "#ff8f00";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.restore();
        });
    }

    function renderBike() {
        const b = game.bike;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);

        if (b.invulnerableTimer > 0 && Math.floor(b.invulnerableTimer / 4) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        const wheelR = 12;
        const frameColor = "#e53935";

        ctx.strokeStyle = "#212121";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-18, 0, wheelR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(18, 0, wheelR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-18, 0);
        ctx.lineTo(-6, -16);
        ctx.lineTo(8, -16);
        ctx.lineTo(18, 0);
        ctx.moveTo(-6, -16);
        ctx.lineTo(0, 0);
        ctx.lineTo(8, -16);
        ctx.lineTo(-18, 0);
        ctx.stroke();

        ctx.fillStyle = "#1565c0";
        ctx.beginPath();
        ctx.arc(0, -28, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffb300";
        ctx.beginPath();
        ctx.arc(2, -38, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function renderParticles() {
        game.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function renderFloatingTexts() {
        game.floatingTexts.forEach(ft => {
            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.font = "bold 16px Arial";
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "#000000";
            ctx.shadowBlur = 4;
            ctx.fillText(ft.text, ft.x - 20, ft.y);
            ctx.restore();
        });
    }

    function renderHUD() {
        const state = game.getState();

        document.getElementById("hud-level").innerText = state.levelName;
        document.getElementById("hud-score").innerText = state.score;
        document.getElementById("hud-coins").innerText = state.coinsCollected;
        document.getElementById("hud-speed").innerText = Math.round(state.velocityX * 5) + " km/h";
        document.getElementById("hud-lives").innerText = "❤️".repeat(state.lives);
        
        const progPct = Math.floor(state.progress * 100);
        document.getElementById("hud-progress-bar").style.width = progPct + "%";
        document.getElementById("hud-progress-text").innerText = progPct + "%";

        const comboElem = document.getElementById("hud-combo");
        if (state.combo > 1) {
            comboElem.innerText = `COMBO x${state.combo}!`;
            comboElem.classList.remove("hidden");
        } else {
            comboElem.classList.add("hidden");
        }
    }

    window.addEventListener("DOMContentLoaded", init);
})();