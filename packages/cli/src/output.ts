export type TOutputMode = "human" | "json";

export type TOutputOptions = {
  mode: TOutputMode;
  showReasoning?: boolean;
};

export type TOutput = {
  readonly mode: TOutputMode;
  /** The command's answer. The ONLY thing that ever goes to stdout. */
  result<T>(data: T, toHuman: (data: T) => string): void;
  /** Streams answer text to stdout as it arrives (human mode only; JSON mode prints via result). */
  stream(text: string): void;
  /** Progress and diagnostics for humans, written to stderr. */
  info(message: string): void;
  /** Model reasoning: stderr, human mode only, and only when asked for. */
  reasoning(text: string): void;
};

const DIM = "\x1b[2m";
const UNDIM = "\x1b[22m";

export const createOutput = ({ mode, showReasoning = false }: TOutputOptions): TOutput => {
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

    stream(text: string): void {
      if (mode === "json") return;
      closeReasoning();
      stdout.write(text);
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
