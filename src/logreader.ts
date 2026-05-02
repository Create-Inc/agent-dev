import { createReadStream, statSync, openSync, readSync, closeSync } from "node:fs";
import { createInterface } from "node:readline";

const DEFAULT_SEARCH_BYTES = 1024 * 1024; // 1MB

export interface SearchResult {
  line: string;
  num: number;
  context: string[];
}

export function searchLog(
  path: string,
  pattern: string,
  opts: { contextLines?: number; maxBytes?: number } = {}
): SearchResult[] {
  const contextLines = opts.contextLines ?? 5;
  const maxBytes = opts.maxBytes ?? DEFAULT_SEARCH_BYTES;

  const { lines, lineOffset } = readTailBytes(path, maxBytes);
  const lowerPattern = pattern.toLowerCase();
  const results: SearchResult[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(lowerPattern)) {
      const after = lines.slice(i + 1, i + 1 + contextLines);
      results.push({
        line: lines[i],
        num: lineOffset + i + 1,
        context: after,
      });
    }
  }

  return results;
}

function readTailBytes(
  path: string,
  maxBytes: number
): { lines: string[]; lineOffset: number } {
  const size = statSync(path).size;
  if (size === 0) return { lines: [], lineOffset: 0 };

  const start = Math.max(0, size - maxBytes);
  const readSize = Math.min(size, maxBytes);
  const buf = Buffer.alloc(readSize);

  const fd = openSync(path, "r");
  readSync(fd, buf, 0, readSize, start);
  closeSync(fd);

  let content = buf.toString("utf-8");
  let lineOffset = 0;

  if (start > 0) {
    // skip partial first line
    const nl = content.indexOf("\n");
    if (nl !== -1) {
      content = content.slice(nl + 1);
    }
    // estimate line offset from byte position instead of reading the prefix
    // not exact, but avoids reading the entire file just for line numbers
    lineOffset = Math.round(start / 80);
  }

  return { lines: content.split("\n"), lineOffset };
}

export function readTailLines(path: string, n: number): string[] {
  const chunkSize = Math.max(n * 200, 8192);
  const { lines } = readTailBytes(path, chunkSize);

  const trimmed = lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
  return trimmed.slice(Math.max(0, trimmed.length - n));
}

export function readHeadLines(path: string, n: number): Promise<string[]> {
  return new Promise((resolve) => {
    const lines: string[] = [];
    const stream = createReadStream(path, { encoding: "utf-8", highWaterMark: 8192 });
    const rl = createInterface({ input: stream });

    rl.on("line", (line) => {
      lines.push(line);
      if (lines.length >= n) {
        rl.close();
        stream.destroy();
      }
    });

    rl.on("close", () => resolve(lines));
  });
}

export function streamAll(path: string): void {
  createReadStream(path, { encoding: "utf-8" }).pipe(process.stdout);
}
