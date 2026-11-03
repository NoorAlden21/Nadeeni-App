"use client";

import { useEffect, useRef, useState } from "react";
import {
  continueGame,
  moveGame,
  readBest,
  rememberBest,
  startGame,
  traceMove,
  twenty48MotionMs,
} from "@/lib/games/twenty48";

function stampTiles(grid, startId) {
  const tiles = [];
  let nextId = startId;
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      if (grid[row][col] != null) {
        nextId += 1;
        tiles.push({ id: nextId, value: grid[row][col], row, col });
      }
    }
  }
  return { tiles, nextId };
}

function createMatch(startId) {
  const started = startGame();
  const stamped = stampTiles(started.grid, startId);
  return { ...started, tiles: stamped.tiles, nextId: stamped.nextId };
}

function spawnedCell(before, after) {
  for (let row = 0; row < before.length; row += 1) {
    for (let col = 0; col < before[row].length; col += 1) {
      if (before[row][col] == null && after[row][col] != null) {
        return { row, col, value: after[row][col] };
      }
    }
  }
  return null;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useTwenty48({ paused = false } = {}) {
  const generation = useRef(0);
  const settleTimer = useRef(0);
  const [best, setBest] = useState(() => readBest());
  const [hidden, setHidden] = useState(false);
  const [board, setBoard] = useState(() => {
    const game = createMatch(0);
    return { ...game, tiles: game.tiles.map((tile) => ({ ...tile, fresh: true })) };
  });
  const stateRef = useRef({
    grid: board.grid,
    score: board.score,
    won: board.won,
    over: board.over,
    keepPlaying: board.keepPlaying,
    nextId: board.nextId,
    tiles: board.tiles.map(({ id, value, row, col }) => ({ id, value, row, col })),
  });

  useEffect(() => {
    function onVisibilityChange() {
      setHidden(document.visibilityState === "hidden");
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(settleTimer.current);
    };
  }, []);

  function blocked() {
    return paused || hidden || document.visibilityState === "hidden";
  }

  function show(next, tiles, curtain) {
    setBoard({
      grid: next.grid,
      score: next.score,
      won: next.won,
      over: next.over,
      keepPlaying: next.keepPlaying,
      tiles,
      curtain,
    });
  }

  function move(direction) {
    if (blocked()) {
      return;
    }
    const current = stateRef.current;
    const next = moveGame(current, direction);
    if (next === current) {
      return;
    }
    const trace = traceMove(current.grid, direction);
    if (!trace) {
      return;
    }

    const byPos = new Map(current.tiles.map((tile) => [`${tile.row}:${tile.col}`, tile]));
    const sliding = [];
    const settled = [];
    const popped = new Set();
    let missing = false;

    for (const step of trace.moves) {
      const tile = byPos.get(`${step.fromRow}:${step.fromCol}`);
      if (!tile) {
        missing = true;
        break;
      }
      sliding.push({
        id: tile.id,
        value: tile.value,
        row: step.toRow,
        col: step.toCol,
        absorbed: step.absorbed,
      });
      if (!step.absorbed) {
        const value = trace.grid[step.toRow][step.toCol];
        if (value !== tile.value) {
          popped.add(tile.id);
        }
        settled.push({ id: tile.id, value, row: step.toRow, col: step.toCol });
      }
    }

    if (missing) {
      const stamped = stampTiles(next.grid, current.nextId);
      const logical = {
        grid: next.grid,
        score: next.score,
        won: next.won,
        over: next.over,
        keepPlaying: next.keepPlaying,
        tiles: stamped.tiles,
        nextId: stamped.nextId,
      };
      stateRef.current = logical;
      setBest(rememberBest(next.score));
      generation.current += 1;
      window.clearTimeout(settleTimer.current);
      show(logical, stamped.tiles, true);
      return;
    }

    const spawned = spawnedCell(trace.grid, next.grid);
    let spawnedId = 0;
    let nextId = current.nextId;
    if (spawned) {
      nextId += 1;
      spawnedId = nextId;
      settled.push({ id: spawnedId, value: spawned.value, row: spawned.row, col: spawned.col });
    }

    const logical = {
      grid: next.grid,
      score: next.score,
      won: next.won,
      over: next.over,
      keepPlaying: next.keepPlaying,
      tiles: settled,
      nextId,
    };
    stateRef.current = logical;
    setBest(rememberBest(next.score));
    generation.current += 1;
    const gen = generation.current;
    window.clearTimeout(settleTimer.current);

    if (reducedMotion()) {
      show(
        logical,
        settled.map((tile) => ({ ...tile, fresh: tile.id === spawnedId })),
        true,
      );
      return;
    }

    show(logical, sliding, false);
    settleTimer.current = window.setTimeout(() => {
      if (generation.current !== gen) {
        return;
      }
      const latest = stateRef.current;
      show(
        latest,
        latest.tiles.map((tile) => ({
          ...tile,
          fresh: tile.id === spawnedId,
          pop: popped.has(tile.id),
        })),
        true,
      );
    }, twenty48MotionMs);
  }

  function restart() {
    if (blocked()) {
      return;
    }
    setBest(rememberBest(stateRef.current.score));
    const started = createMatch(stateRef.current.nextId);
    const tiles = started.tiles;
    stateRef.current = started;
    generation.current += 1;
    window.clearTimeout(settleTimer.current);
    show(
      started,
      tiles.map((tile) => ({ ...tile, fresh: true })),
      true,
    );
  }

  function keepGoing() {
    if (blocked()) {
      return;
    }
    const next = continueGame(stateRef.current);
    if (next === stateRef.current) {
      return;
    }
    stateRef.current = { ...next, tiles: stateRef.current.tiles };
    setBoard((current) => ({ ...current, keepPlaying: true, curtain: true }));
  }

  return {
    tiles: board.tiles,
    score: board.score,
    best: Math.max(best, board.score),
    won: board.won,
    over: board.over,
    keepPlaying: board.keepPlaying,
    curtain: board.curtain,
    move,
    restart,
    keepGoing,
  };
}
