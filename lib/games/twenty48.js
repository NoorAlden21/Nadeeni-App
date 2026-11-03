export const twenty48Copy = {
  play: "العب وأنت تنتظر",
  close: "إغلاق اللعبة",
  loading: "يتم فتح اللعبة.",
  title: "2048",
  newGame: "لعبة جديدة",
  score: "النقاط",
  best: "الأفضل",
  hint: "اسحب اللوحة لدمج الأرقام المتشابهة.",
  win: "وصلت إلى 2048",
  keep: "أكمل",
  over: "انتهت اللعبة",
  again: "من جديد",
  empty: "فارغة",
  orderLabel: "رقم الطلب",
};

const size = 4;
const bestKey = "nadeeni.twenty48.best";
const directions = new Set(["left", "right", "up", "down"]);

export const twenty48MotionMs = 180;

export function emptyGrid() {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

export function slideToward(line) {
  const compact = line.filter((value) => value != null);
  const merged = [];
  let score = 0;

  for (let index = 0; index < compact.length; index += 1) {
    if (index + 1 < compact.length && compact[index] === compact[index + 1]) {
      const value = compact[index] * 2;
      merged.push(value);
      score += value;
      index += 1;
    } else {
      merged.push(compact[index]);
    }
  }

  while (merged.length < size) {
    merged.push(null);
  }

  return {
    line: merged,
    score,
    changed: merged.some((value, index) => value !== line[index]),
  };
}

function slideGrid(grid, direction) {
  const next = grid.map((row) => row.slice());
  let score = 0;
  let changed = false;

  if (direction === "left" || direction === "right") {
    for (let row = 0; row < size; row += 1) {
      const source = direction === "left" ? next[row] : [...next[row]].reverse();
      const slid = slideToward(source);
      next[row] = direction === "left" ? slid.line : [...slid.line].reverse();
      score += slid.score;
      changed = changed || slid.changed;
    }
  } else {
    for (let column = 0; column < size; column += 1) {
      const source = [];
      for (let row = 0; row < size; row += 1) {
        source.push(next[row][column]);
      }
      const ordered = direction === "up" ? source : [...source].reverse();
      const slid = slideToward(ordered);
      const line = direction === "up" ? slid.line : [...slid.line].reverse();
      for (let row = 0; row < size; row += 1) {
        next[row][column] = line[row];
      }
      score += slid.score;
      changed = changed || slid.changed;
    }
  }

  return { grid: next, score, changed };
}

export function hasMove(grid) {
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const value = grid[row][column];
      if (value == null) {
        return true;
      }
      if (column + 1 < size && grid[row][column + 1] === value) {
        return true;
      }
      if (row + 1 < size && grid[row + 1][column] === value) {
        return true;
      }
    }
  }
  return false;
}

export function spawn(grid, random) {
  const cells = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (grid[row][column] == null) {
        cells.push(row * size + column);
      }
    }
  }
  if (!cells.length) {
    return grid;
  }

  const pick = cells[Math.floor(random() * cells.length)];
  const value = random() < 0.9 ? 2 : 4;
  const next = grid.map((row) => row.slice());
  next[Math.floor(pick / size)][pick % size] = value;
  return next;
}

function cellAt(line, index, direction) {
  const reverse = direction === "right" || direction === "down";
  const slot = reverse ? size - 1 - index : index;
  if (direction === "left" || direction === "right") {
    return { row: line, col: slot };
  }
  return { row: slot, col: line };
}

function traceToward(entries) {
  const placements = [];
  let score = 0;
  let cursor = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const current = entries[index];
    const ahead = entries[index + 1];
    if (ahead && current.value === ahead.value) {
      const value = current.value * 2;
      placements.push({ entry: current, to: cursor, absorbed: false, write: value });
      placements.push({ entry: ahead, to: cursor, absorbed: true, write: null });
      score += value;
      cursor += 1;
      index += 1;
    } else {
      placements.push({ entry: current, to: cursor, absorbed: false, write: current.value });
      cursor += 1;
    }
  }

  return { placements, score };
}

export function traceMove(grid, direction) {
  if (!directions.has(direction)) {
    return null;
  }

  const next = grid.map((row) => row.slice());
  const moves = [];
  let score = 0;

  for (let line = 0; line < size; line += 1) {
    const entries = [];
    for (let index = 0; index < size; index += 1) {
      const pos = cellAt(line, index, direction);
      const value = grid[pos.row][pos.col];
      if (value != null) {
        entries.push({ index, row: pos.row, col: pos.col, value });
      }
      next[pos.row][pos.col] = null;
    }

    const traced = traceToward(entries);
    score += traced.score;
    for (const placement of traced.placements) {
      const dest = cellAt(line, placement.to, direction);
      moves.push({
        fromRow: placement.entry.row,
        fromCol: placement.entry.col,
        toRow: dest.row,
        toCol: dest.col,
        absorbed: placement.absorbed,
      });
      if (!placement.absorbed) {
        next[dest.row][dest.col] = placement.write;
      }
    }
  }

  const changed = next.some((line, row) => line.some((value, column) => value !== grid[row][column]));
  if (!changed) {
    return null;
  }

  return { moves, grid: next, score };
}

function reachedTarget(grid) {
  return grid.some((row) => row.some((value) => value >= 2048));
}

export function startGame(random = Math.random) {
  let grid = emptyGrid();
  grid = spawn(grid, random);
  grid = spawn(grid, random);
  return { grid, score: 0, won: false, over: false, keepPlaying: false };
}

export function moveGame(state, direction, random = Math.random) {
  if (!directions.has(direction) || state.over || (state.won && !state.keepPlaying)) {
    return state;
  }

  const slid = slideGrid(state.grid, direction);
  if (!slid.changed) {
    return state;
  }

  const grid = spawn(slid.grid, random);
  return {
    grid,
    score: state.score + slid.score,
    won: state.won || reachedTarget(slid.grid),
    keepPlaying: state.keepPlaying,
    over: !hasMove(grid),
  };
}

export function continueGame(state) {
  if (!state.won || state.keepPlaying) {
    return state;
  }
  return { ...state, keepPlaying: true };
}

export function readBest() {
  if (typeof window === "undefined") {
    return 0;
  }
  try {
    const value = Number(window.localStorage.getItem(bestKey));
    return Number.isInteger(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function rememberBest(score) {
  const previous = readBest();
  if (score <= previous) {
    return previous;
  }
  try {
    window.localStorage.setItem(bestKey, String(score));
  } catch {
    return previous;
  }
  return score;
}
