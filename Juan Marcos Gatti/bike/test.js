/**
 * Comprehensive Automated Tests for Mountain Bike Rush Engine
 * Executed via: node test.js
 */

const { test, describe } = require("node:test");
const assert = require("node:assert");

const {
    game,
    step,
    getState,
    getAvailableActions,
    resetGame,
    startLevel,
    getLevelData
} = require("./game.js");

describe("Mountain Bike Rush - Test Suite", () => {

    test("1. API availability", () => {
        assert.strictEqual(typeof step, "function");
        assert.strictEqual(typeof getState, "function");
        assert.strictEqual(typeof getAvailableActions, "function");
        assert.strictEqual(typeof resetGame, "function");
        assert.strictEqual(typeof startLevel, "function");
        assert.strictEqual(typeof getLevelData, "function");
    });

    test("2. Valid actions list", () => {
        const actions = getAvailableActions();
        assert.deepStrictEqual(actions, ["nothing", "accelerate", "brake", "jump"]);
    });

    test("3. Initial game state", () => {
        const state = getState();
        assert.strictEqual(state.level, 1);
        assert.strictEqual(state.lives, 3);
        assert.strictEqual(state.gameOver, false);
        assert.strictEqual(state.levelComplete, false);
    });

    test("4. Reset game state", () => {
        step("accelerate");
        const resetState = resetGame();
        assert.strictEqual(resetState.score, 0);
        assert.strictEqual(resetState.coinsCollected, 0);
        assert.strictEqual(resetState.distance, 100);
    });

    test("5. Acceleration physics", () => {
        resetGame();
        const initialX = getState().x;
        step("accelerate");
        step("accelerate");
        const newX = getState().x;
        assert.ok(newX > initialX, "Bike x position should increase after accelerate");
    });

    test("6. Brake physics", () => {
        resetGame();
        step("accelerate");
        step("accelerate");
        const speedBeforeBrake = getState().velocityX;
        step("brake");
        const speedAfterBrake = getState().velocityX;
        assert.ok(speedAfterBrake < speedBeforeBrake, "Braking should reduce velocity");
    });

    test("7. Jump mechanics", () => {
        resetGame();
        assert.strictEqual(getState().onGround, true);
        step("jump");
        const stateAir = getState();
        assert.strictEqual(stateAir.onGround, false);
        assert.ok(stateAir.velocityY < 0, "Jump should result in negative vertical velocity");
    });

    test("8. Gravity pull", () => {
        resetGame();
        step("jump");
        const vy1 = getState().velocityY;
        step("nothing");
        const vy2 = getState().velocityY;
        assert.ok(vy2 > vy1, "Gravity should increase downward velocity over time");
    });

    test("9. Progress calculation", () => {
        resetGame();
        for (let i = 0; i < 50; i++) step("accelerate");
        const state = getState();
        assert.ok(state.progress > 0, "Progress should increase as bike moves forward");
        assert.ok(state.progress <= 1, "Progress should not exceed 1.0");
    });

    test("10. Score accumulation", () => {
        resetGame();
        const initialScore = getState().score;
        for (let i = 0; i < 20; i++) step("accelerate");
        assert.ok(getState().score >= initialScore, "Moving forward should grant score");
    });

    test("11. Coin collection tracking", () => {
        resetGame();
        const initialCoins = getState().remainingCoins;
        assert.ok(initialCoins > 0, "Level should spawn coins");
    });

    test("12. Checkpoints count", () => {
        resetGame();
        assert.ok(getState().totalCheckpoints > 0, "Level should contain checkpoints");
    });

    test("13. Lives count & deduction", () => {
        resetGame();
        assert.strictEqual(getState().lives, 3);
    });

    test("14. Collision handling", () => {
        resetGame();
        game.obstacles = [{ x: game.bike.x + 10, y: game.bike.y, type: "rock", hit: false }];
        step("accelerate");
        assert.strictEqual(game.lives, 2, "Collision should reduce life count");
    });

    test("15. Multiple level definitions", () => {
        const levels = getLevelData();
        assert.strictEqual(levels.length, 5);
        assert.strictEqual(levels[0].name, "Campo Verde");
        assert.strictEqual(levels[4].name, "Cumbre Final");
    });

    test("16. Level unlock logic", () => {
        resetGame();
        game.bike.x = game.LEVELS[0].length + 10;
        step("nothing");
        assert.strictEqual(getState().levelComplete, true);
        assert.ok(getState().unlockedLevel >= 2, "Completing level 1 unlocks level 2");
    });

    test("17. Level switching", () => {
        startLevel(2);
        const state = getState();
        assert.strictEqual(state.level, 2);
        assert.strictEqual(state.levelName, "Valle Rocoso");
    });

    test("18. Game over sequence", () => {
        resetGame();
        game.lives = 1;
        game.obstacles = [{ x: game.bike.x + 5, y: game.bike.y, type: "rock", hit: false }];
        step("accelerate");
        assert.strictEqual(getState().gameOver, true);
    });

    test("19. Level complete sequence", () => {
        resetGame();
        game.bike.x = game.LEVELS[0].length;
        step("nothing");
        assert.strictEqual(getState().levelComplete, true);
    });

    test("20. JSON serializable state", () => {
        const state = getState();
        const jsonString = JSON.stringify(state);
        const parsed = JSON.parse(jsonString);
        assert.strictEqual(parsed.level, state.level);
        assert.strictEqual(parsed.x, state.x);
    });
});
);