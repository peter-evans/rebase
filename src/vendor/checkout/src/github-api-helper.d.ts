export declare function downloadRepository(authToken: string, owner: string, repo: string, ref: string, commit: string, repositoryPath: string): Promise<void>;
/**
 * Looks up the default branch name
 */
export declare function getDefaultBranch(authToken: string, owner: string, repo: string): Promise<string>;
