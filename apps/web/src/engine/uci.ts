// The UCI `info` parser (CORE-22): the only place engine text is read.
// Scores stay from the side to move's point of view here; the provider
// turns them to White's.
export type UciInfo = {
  depth: number;
  selDepth?: number;
  multiPv: number;
  score: { kind: 'cp' | 'mate'; value: number };
  nodes: number;
  nps?: number;
  pv: string[];
};

// Lines without a PV or with a bound score (lowerbound/upperbound) are
// in-progress guesses, skipped as lila's ceval does.
export function parseInfo(line: string): UciInfo | null {
  const t = line.trim().split(/\s+/);
  if (t[0] !== 'info') return null;
  const info: Partial<UciInfo> = { multiPv: 1, nodes: 0 };
  for (let i = 1; i < t.length; i++) {
    const num = Number(t[i + 1]);
    switch (t[i]) {
      case 'depth':
        info.depth = num;
        i++;
        break;
      case 'seldepth':
        info.selDepth = num;
        i++;
        break;
      case 'multipv':
        info.multiPv = num;
        i++;
        break;
      case 'nodes':
        info.nodes = num;
        i++;
        break;
      case 'nps':
        info.nps = num;
        i++;
        break;
      case 'score':
        if (t[i + 1] !== 'cp' && t[i + 1] !== 'mate') return null;
        info.score = { kind: t[i + 1] as 'cp' | 'mate', value: Number(t[i + 2]) };
        i += 2;
        if (t[i + 1] === 'lowerbound' || t[i + 1] === 'upperbound') return null;
        break;
      case 'pv':
        info.pv = t.slice(i + 1);
        i = t.length;
        break;
      case 'string':
        return null;
    }
  }
  if (info.depth === undefined || !info.score || !info.pv?.length || Number.isNaN(info.score.value)) return null;
  return info as UciInfo;
}
