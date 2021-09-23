import { IGitSourceSettings } from './git-source-settings';
export declare function getSource(settings: IGitSourceSettings): Promise<void>;
export declare function cleanup(repositoryPath: string): Promise<void>;
