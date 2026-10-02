export const createAbortController = (): AbortController => {
  const controller = new AbortController();

  process.once("SIGINT", () => {
    controller.abort();
    process.exitCode = 130;
  });

  return controller;
};
