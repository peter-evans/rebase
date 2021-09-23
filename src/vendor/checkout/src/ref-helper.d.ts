import { IGitCommandManager } from './git-command-manager';
export declare const tagsRefSpec = "+refs/tags/*:refs/tags/*";
export interface ICheckoutInfo {
    ref: string;
    startPoint: string;
}
export declare function getCheckoutInfo(git: IGitCommandManager, ref: string, commit: string): Promise<ICheckoutInfo>;
export declare function getRefSpecForAllHistory(ref: string, commit: string): string[];
export declare function getRefSpec(ref: string, commit: string): string[];
/**
 * Tests whether the initial fetch created the ref at the expected commit
 */
export declare function testRef(git: IGitCommandManager, ref: string, commit: string): Promise<boolean>;
export declare function checkCommitInfo(token: string, commitInfo: string, repositoryOwner: string, repositoryName: string, ref: string, commit: string): Promise<void>;
