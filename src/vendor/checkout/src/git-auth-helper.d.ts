import { IGitCommandManager } from './git-command-manager';
import { IGitSourceSettings } from './git-source-settings';
export interface IGitAuthHelper {
    configureAuth(): Promise<void>;
    configureGlobalAuth(): Promise<void>;
    configureSubmoduleAuth(): Promise<void>;
    removeAuth(): Promise<void>;
    removeGlobalAuth(): Promise<void>;
}
export declare function createAuthHelper(git: IGitCommandManager, settings?: IGitSourceSettings): IGitAuthHelper;
