export const ExitCode = {
    Success: 0,
    RuntimeFailure: 1,
    UsageError: 2,
    OutputValidationFailed: 3,
    ApprovalRequired: 4,
    PolicyDenied: 5,
    Interrupted: 130,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];