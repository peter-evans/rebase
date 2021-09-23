"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanup = exports.getSource = void 0;
const core = __importStar(require("@actions/core"));
const fsHelper = __importStar(require("./fs-helper"));
const gitAuthHelper = __importStar(require("./git-auth-helper"));
const gitCommandManager = __importStar(require("./git-command-manager"));
const gitDirectoryHelper = __importStar(require("./git-directory-helper"));
const githubApiHelper = __importStar(require("./github-api-helper"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const refHelper = __importStar(require("./ref-helper"));
const stateHelper = __importStar(require("./state-helper"));
const urlHelper = __importStar(require("./url-helper"));
function getSource(settings) {
    return __awaiter(this, void 0, void 0, function* () {
        // Repository URL
        core.info(`Syncing repository: ${settings.repositoryOwner}/${settings.repositoryName}`);
        const repositoryUrl = urlHelper.getFetchUrl(settings);
        // Remove conflicting file path
        if (fsHelper.fileExistsSync(settings.repositoryPath)) {
            yield io.rmRF(settings.repositoryPath);
        }
        // Create directory
        let isExisting = true;
        if (!fsHelper.directoryExistsSync(settings.repositoryPath)) {
            isExisting = false;
            yield io.mkdirP(settings.repositoryPath);
        }
        // Git command manager
        core.startGroup('Getting Git version info');
        const git = yield getGitCommandManager(settings);
        core.endGroup();
        // Prepare existing directory, otherwise recreate
        if (isExisting) {
            yield gitDirectoryHelper.prepareExistingDirectory(git, settings.repositoryPath, repositoryUrl, settings.clean, settings.ref);
        }
        if (!git) {
            // Downloading using REST API
            core.info(`The repository will be downloaded using the GitHub REST API`);
            core.info(`To create a local Git repository instead, add Git ${gitCommandManager.MinimumGitVersion} or higher to the PATH`);
            if (settings.submodules) {
                throw new Error(`Input 'submodules' not supported when falling back to download using the GitHub REST API. To create a local Git repository instead, add Git ${gitCommandManager.MinimumGitVersion} or higher to the PATH.`);
            }
            else if (settings.sshKey) {
                throw new Error(`Input 'ssh-key' not supported when falling back to download using the GitHub REST API. To create a local Git repository instead, add Git ${gitCommandManager.MinimumGitVersion} or higher to the PATH.`);
            }
            yield githubApiHelper.downloadRepository(settings.authToken, settings.repositoryOwner, settings.repositoryName, settings.ref, settings.commit, settings.repositoryPath);
            return;
        }
        // Save state for POST action
        stateHelper.setRepositoryPath(settings.repositoryPath);
        // Initialize the repository
        if (!fsHelper.directoryExistsSync(path.join(settings.repositoryPath, '.git'))) {
            core.startGroup('Initializing the repository');
            yield git.init();
            yield git.remoteAdd('origin', repositoryUrl);
            core.endGroup();
        }
        // Disable automatic garbage collection
        core.startGroup('Disabling automatic garbage collection');
        if (!(yield git.tryDisableAutomaticGarbageCollection())) {
            core.warning(`Unable to turn off git automatic garbage collection. The git fetch operation may trigger garbage collection and cause a delay.`);
        }
        core.endGroup();
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        try {
            // Configure auth
            core.startGroup('Setting up auth');
            yield authHelper.configureAuth();
            core.endGroup();
            // Determine the default branch
            if (!settings.ref && !settings.commit) {
                core.startGroup('Determining the default branch');
                if (settings.sshKey) {
                    settings.ref = yield git.getDefaultBranch(repositoryUrl);
                }
                else {
                    settings.ref = yield githubApiHelper.getDefaultBranch(settings.authToken, settings.repositoryOwner, settings.repositoryName);
                }
                core.endGroup();
            }
            // LFS install
            if (settings.lfs) {
                yield git.lfsInstall();
            }
            // Fetch
            core.startGroup('Fetching the repository');
            if (settings.fetchDepth <= 0) {
                // Fetch all branches and tags
                let refSpec = refHelper.getRefSpecForAllHistory(settings.ref, settings.commit);
                yield git.fetch(refSpec);
                // When all history is fetched, the ref we're interested in may have moved to a different
                // commit (push or force push). If so, fetch again with a targeted refspec.
                if (!(yield refHelper.testRef(git, settings.ref, settings.commit))) {
                    refSpec = refHelper.getRefSpec(settings.ref, settings.commit);
                    yield git.fetch(refSpec);
                }
            }
            else {
                const refSpec = refHelper.getRefSpec(settings.ref, settings.commit);
                yield git.fetch(refSpec, settings.fetchDepth);
            }
            core.endGroup();
            // Checkout info
            core.startGroup('Determining the checkout info');
            const checkoutInfo = yield refHelper.getCheckoutInfo(git, settings.ref, settings.commit);
            core.endGroup();
            // LFS fetch
            // Explicit lfs-fetch to avoid slow checkout (fetches one lfs object at a time).
            // Explicit lfs fetch will fetch lfs objects in parallel.
            if (settings.lfs) {
                core.startGroup('Fetching LFS objects');
                yield git.lfsFetch(checkoutInfo.startPoint || checkoutInfo.ref);
                core.endGroup();
            }
            // Checkout
            core.startGroup('Checking out the ref');
            yield git.checkout(checkoutInfo.ref, checkoutInfo.startPoint);
            core.endGroup();
            // Submodules
            if (settings.submodules) {
                try {
                    // Temporarily override global config
                    core.startGroup('Setting up auth for fetching submodules');
                    yield authHelper.configureGlobalAuth();
                    core.endGroup();
                    // Checkout submodules
                    core.startGroup('Fetching submodules');
                    yield git.submoduleSync(settings.nestedSubmodules);
                    yield git.submoduleUpdate(settings.fetchDepth, settings.nestedSubmodules);
                    yield git.submoduleForeach('git config --local gc.auto 0', settings.nestedSubmodules);
                    core.endGroup();
                    // Persist credentials
                    if (settings.persistCredentials) {
                        core.startGroup('Persisting credentials for submodules');
                        yield authHelper.configureSubmoduleAuth();
                        core.endGroup();
                    }
                }
                finally {
                    // Remove temporary global config override
                    yield authHelper.removeGlobalAuth();
                }
            }
            // Get commit information
            const commitInfo = yield git.log1();
            // Log commit sha
            yield git.log1("--format='%H'");
            // Check for incorrect pull request merge commit
            yield refHelper.checkCommitInfo(settings.authToken, commitInfo, settings.repositoryOwner, settings.repositoryName, settings.ref, settings.commit);
        }
        finally {
            // Remove auth
            if (!settings.persistCredentials) {
                core.startGroup('Removing auth');
                yield authHelper.removeAuth();
                core.endGroup();
            }
        }
    });
}
exports.getSource = getSource;
function cleanup(repositoryPath) {
    return __awaiter(this, void 0, void 0, function* () {
        // Repo exists?
        if (!repositoryPath ||
            !fsHelper.fileExistsSync(path.join(repositoryPath, '.git', 'config'))) {
            return;
        }
        let git;
        try {
            git = yield gitCommandManager.createCommandManager(repositoryPath, false);
        }
        catch (_a) {
            return;
        }
        // Remove auth
        const authHelper = gitAuthHelper.createAuthHelper(git);
        yield authHelper.removeAuth();
    });
}
exports.cleanup = cleanup;
function getGitCommandManager(settings) {
    return __awaiter(this, void 0, void 0, function* () {
        core.info(`Working directory is '${settings.repositoryPath}'`);
        try {
            return yield gitCommandManager.createCommandManager(settings.repositoryPath, settings.lfs);
        }
        catch (err) {
            // Git is required for LFS
            if (settings.lfs) {
                throw err;
            }
            // Otherwise fallback to REST API
            return undefined;
        }
    });
}
