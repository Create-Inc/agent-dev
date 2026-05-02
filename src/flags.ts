export interface Options {
  session: string | null;
  portless: boolean;
}

export function parseFlags(args: string[]): { options: Options; rest: string[] } {
  const rest: string[] = [];
  let session: string | null = process.env.AGENT_DEV_SESSION ?? null;
  let portless = process.env.AGENT_DEV_PORTLESS === "1";

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--session" && i + 1 < args.length) {
      session = args[++i];
    } else if (arg === "--portless") {
      portless = true;
    } else if (arg === "--") {
      rest.push(...args.slice(i + 1));
      break;
    } else {
      rest.push(arg);
    }
    i++;
  }

  return { options: { session, portless }, rest };
}
