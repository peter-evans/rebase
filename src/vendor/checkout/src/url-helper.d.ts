/// <reference types="node" />
import { IGitSourceSettings } from './git-source-settings';
import { URL } from 'url';
export declare function getFetchUrl(settings: IGitSourceSettings): string;
export declare function getServerUrl(): URL;
