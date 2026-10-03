import { ExitCode } from "@agentic/cli";

export class OutputValidationError extends Error {
    public readonly exitCode = ExitCode.OutputValidationFailed;

    constructor(
        message: string,
        public readonly rawText: string,
        public readonly validationErrors: string
    ) {
        super(message);
        Object.setPrototypeOf(this, OutputValidationError.prototype);
        this.name = "OutputValidationError";
    }
}
