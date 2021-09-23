export declare class GitVersion {
    private readonly major;
    private readonly minor;
    private readonly patch;
    /**
     * Used for comparing the version of git and git-lfs against the minimum required version
     * @param version the version string, e.g. 1.2 or 1.2.3
     */
    constructor(version?: string);
    /**
     * Compares the instance against a minimum required version
     * @param minimum Minimum version
     */
    checkMinimum(minimum: GitVersion): boolean;
    /**
     * Indicates whether the instance was constructed from a valid version string
     */
    isValid(): boolean;
    /**
     * Returns the version as a string, e.g. 1.2 or 1.2.3
     */
    toString(): string;
}
