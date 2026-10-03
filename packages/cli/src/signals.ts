export const createAbortController = (): AbortController => {
  const controller = new AbortController();

  process.once("SIGINT", () => {
    process.stderr.write("\nCancelling… (Ctrl-C again to force quit)\n");
    controller.abort();
  });

  return controller;
};
