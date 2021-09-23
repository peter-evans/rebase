import { IGitCommandManager } from './git-command-manager';
export declare function prepareExistingDirectory(git: IGitCommandManager | undefined, repositoryPath: string, repositoryUrl: string, clean: boolean, ref: string): Promise<void>;
