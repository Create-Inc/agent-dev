import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { marksFile, logFile } from "./paths.js";

export interface Mark {
  name: string;
  byte: number;
  createdAt: string;
}

function loadMarks(sessionId: string): Mark[] {
  const path = marksFile(sessionId);
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8"));
}

function saveMarks(sessionId: string, marks: Mark[]) {
  writeFileSync(marksFile(sessionId), JSON.stringify(marks, null, 2));
}

export function addMark(sessionId: string, name: string): Mark {
  const log = logFile(sessionId);
  const byte = existsSync(log) ? statSync(log).size : 0;
  const mark: Mark = { name, byte, createdAt: new Date().toISOString() };

  const marks = loadMarks(sessionId);
  marks.push(mark);
  saveMarks(sessionId, marks);

  return mark;
}

export function getLatestMark(sessionId: string): Mark | null {
  const marks = loadMarks(sessionId);
  return marks.length > 0 ? marks[marks.length - 1] : null;
}

export function listMarks(sessionId: string): Mark[] {
  return loadMarks(sessionId);
}
