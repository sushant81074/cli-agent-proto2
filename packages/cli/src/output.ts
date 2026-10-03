export type OutputMode = "human" | "json";

export type OutputOptions = {
  mode: OutputMode;
  showReasoning?: boolean;
};

export type Output = {
  readonly mode: OutputMode;
  /** The command's answer. The ONLY thing that ever goes to stdout. */
  result<T>(data: T, toHuman: (data: T) => string): void;
  /** Progress and diagnostics for humans, written to stderr. */
  info(message: string): void;
  /** Model reasoning: stderr, human mode only, and only when asked for. */
  reasoning(text: string): void;
};

const DIM = "\x1b[2m";
const UNDIM = "\x1b[22m";

export const createOutput = ({ mode, showReasoning = false }: OutputOptions): Output => {
  const { stdout, stderr } = process;
  let reasoningOpen = false;

  // Reasoning streams without newlines, so end its line before printing anything else.
  const closeReasoning = (): void => {
    if (reasoningOpen) {
      stderr.write("\n");
      reasoningOpen = false;
    }
  };

  return {
    mode,

    result<T>(data: T, toHuman: (data: T) => string): void {
      closeReasoning();
      stdout.write(mode === "json" ? `${JSON.stringify(data)}\n` : `${toHuman(data)}\n`);
    },

    info(message: string): void {
      closeReasoning();
      stderr.write(`${message}\n`);
    },

    reasoning(text: string): void {
      if (mode === "json" || !showReasoning) return;
      reasoningOpen = true;
      stderr.write(stderr.isTTY ? `${DIM}${text}${UNDIM}` : text);
    },
  };
};
