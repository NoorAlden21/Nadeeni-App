import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { continueGame, hasMove, moveGame, slideToward, startGame, traceMove } from "./twenty48.js";

function zeros() {
  return 0;
}

function fresh(grid, score = 0) {
  return { grid, score, won: false, over: false, keepPlaying: false };
}

describe("slideToward", () => {
  it("merges each tile once", () => {
    assert.deepEqual(slideToward([2, 2, 2, 2]), {
      line: [4, 4, null, null],
      score: 8,
      changed: true,
    });
    assert.deepEqual(slideToward([2, 2, 2, null]), {
      line: [4, 2, null, null],
      score: 4,
      changed: true,
    });
    assert.deepEqual(slideToward([4, 2, 2, null]), {
      line: [4, 4, null, null],
      score: 4,
      changed: true,
    });
    assert.deepEqual(slideToward([2, 2, 4, 4]), {
      line: [4, 8, null, null],
      score: 12,
      changed: true,
    });
  });

  it("slides a separated pair together", () => {
    assert.deepEqual(slideToward([2, null, null, 2]), {
      line: [4, null, null, null],
      score: 4,
      changed: true,
    });
  });

  it("leaves a packed row unchanged", () => {
    const line = [2, 4, 8, 16];
    const slid = slideToward(line);
    assert.equal(slid.changed, false);
    assert.equal(slid.score, 0);
    assert.deepEqual(slid.line, line);
  });
});

describe("moveGame", () => {
  it("starts with two tiles and does not mutate the board passed in", () => {
    const started = startGame(zeros);
    assert.equal(started.grid[0][0], 2);
    assert.equal(started.grid[0][1], 2);
    assert.equal(started.score, 0);

    const state = fresh([
      [2, null, null, 2],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const before = JSON.stringify(state.grid);
    const next = moveGame(state, "right", zeros);
    assert.equal(JSON.stringify(state.grid), before);
    assert.equal(next.grid[0][3], 4);
    assert.equal(next.grid[0][0], 2);
    assert.equal(next.score, 4);
    assert.notEqual(next, state);
  });

  it("slides columns up and down", () => {
    const state = fresh([
      [2, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [2, null, null, null],
    ]);
    assert.equal(moveGame(state, "up", zeros).grid[0][0], 4);
    assert.equal(moveGame(state, "down", zeros).grid[3][0], 4);
  });

  it("returns the same state when nothing can move", () => {
    const state = fresh([
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ]);
    assert.equal(hasMove(state.grid), false);
    assert.equal(moveGame(state, "left", zeros), state);
  });

  it("ends the game when the new tile fills the last gap", () => {
    const state = fresh([
      [2, 2, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 4, 8],
      [16, 32, 64, 128],
    ]);
    const next = moveGame(state, "left", zeros);
    assert.equal(next.over, true);
    assert.equal(next.won, false);
    assert.equal(next.score, 4);
    assert.deepEqual(next.grid[0], [4, 8, 16, 2]);
    assert.equal(moveGame(next, "left", zeros), next);
  });

  it("stops on 2048 until the player continues", () => {
    const state = fresh([
      [1024, 1024, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const won = moveGame(state, "left", zeros);
    assert.equal(won.won, true);
    assert.equal(won.score, 2048);
    assert.equal(won.grid[0][0], 2048);
    assert.equal(moveGame(won, "down", zeros), won);

    const continued = continueGame(won);
    assert.equal(continued.keepPlaying, true);
    assert.notEqual(moveGame(continued, "down", zeros), continued);
    assert.equal(continueGame(continued), continued);
  });
});

describe("traceMove", () => {
  it("sends both tiles of a pair into the same cell", () => {
    const grid = [
      [2, null, null, 2],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];

    assert.deepEqual(traceMove(grid, "left"), {
      score: 4,
      grid: [
        [4, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ],
      moves: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 0, absorbed: false },
        { fromRow: 0, fromCol: 3, toRow: 0, toCol: 0, absorbed: true },
      ],
    });

    assert.deepEqual(traceMove(grid, "right").moves, [
      { fromRow: 0, fromCol: 3, toRow: 0, toCol: 3, absorbed: false },
      { fromRow: 0, fromCol: 0, toRow: 0, toCol: 3, absorbed: true },
    ]);
  });

  it("traces a column toward the top", () => {
    const trace = traceMove(
      [
        [2, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [2, null, null, null],
      ],
      "up",
    );
    assert.equal(trace.grid[0][0], 4);
    assert.deepEqual(trace.moves, [
      { fromRow: 0, fromCol: 0, toRow: 0, toCol: 0, absorbed: false },
      { fromRow: 3, fromCol: 0, toRow: 0, toCol: 0, absorbed: true },
    ]);
  });

  it("returns null when the board does not change", () => {
    assert.equal(
      traceMove(
        [
          [2, 4, 8, 16],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
        "left",
      ),
      null,
    );
    assert.equal(traceMove([[2]], "sideways"), null);
  });

  it("matches the scored slide before the new tile appears", () => {
    const state = fresh([
      [2, 2, 4, 4],
      [2, null, null, 2],
      [null, 4, null, 4],
      [8, null, null, null],
    ]);
    for (const direction of ["left", "right", "up", "down"]) {
      const trace = traceMove(state.grid, direction);
      const next = moveGame(state, direction, zeros);
      assert.equal(trace.score, next.score);
      let spawned = 0;
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          if (trace.grid[row][column] !== next.grid[row][column]) {
            spawned += 1;
            assert.equal(trace.grid[row][column], null);
          }
        }
      }
      assert.equal(spawned, 1);
    }
  });
});
