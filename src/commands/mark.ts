import { findSession } from "../session.js";
import { addMark, listMarks } from "../marks.js";
import type { Options } from "../flags.js";

export function mark(args: string[], options: Options) {
  const session = findSession(options.session);
  if (!session) {
    console.error(options.session ? `no active session "${options.session}"` : "no active session");
    process.exit(1);
  }

  const name = args.join(" ") || new Date().toISOString();
  const m = addMark(session.id, name);
  console.log(JSON.stringify({ session: session.id, mark: m.name, byte: m.byte }));
}

export function marks(_args: string[], options: Options) {
  const session = findSession(options.session);
  if (!session) {
    console.error(options.session ? `no active session "${options.session}"` : "no active session");
    process.exit(1);
  }

  const all = listMarks(session.id);
  if (all.length === 0) {
    console.log("no marks");
    return;
  }

  for (const m of all) {
    console.log(JSON.stringify({ name: m.name, byte: m.byte, created: m.createdAt }));
  }
}
