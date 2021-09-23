export declare class RetryHelper {
    private maxAttempts;
    private minSeconds;
    private maxSeconds;
    constructor(maxAttempts?: number, minSeconds?: number, maxSeconds?: number);
    execute<T>(action: () => Promise<T>): Promise<T>;
    private getSleepAmount;
    private sleep;
}
export declare function execute<T>(action: () => Promise<T>): Promise<T>;
