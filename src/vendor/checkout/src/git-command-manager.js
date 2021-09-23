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
exports.createCommandManager = exports.MinimumGitVersion = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fshelper = __importStar(require("./fs-helper"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const refHelper = __importStar(require("./ref-helper"));
const regexpHelper = __importStar(require("./regexp-helper"));
const retryHelper = __importStar(require("./retry-helper"));
const git_version_1 = require("./git-version");
// Auth header not supported before 2.9
// Wire protocol v2 not supported before 2.18
exports.MinimumGitVersion = new git_version_1.GitVersion('2.18');
function createCommandManager(workingDirectory, lfs) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield GitCommandManager.createCommandManager(workingDirectory, lfs);
    });
}
exports.createCommandManager = createCommandManager;
class GitCommandManager {
    // Private constructor; use createCommandManager()
    constructor() {
        this.gitEnv = {
            GIT_TERMINAL_PROMPT: '0',
            GCM_INTERACTIVE: 'Never' // Disable prompting for git credential manager
        };
        this.gitPath = '';
        this.lfs = false;
        this.workingDirectory = '';
    }
    branchDelete(remote, branch) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['branch', '--delete', '--force'];
            if (remote) {
                args.push('--remote');
            }
            args.push(branch);
            yield this.execGit(args);
        });
    }
    branchExists(remote, pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['branch', '--list'];
            if (remote) {
                args.push('--remote');
            }
            args.push(pattern);
            const output = yield this.execGit(args);
            return !!output.stdout.trim();
        });
    }
    branchList(remote) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = [];
            // Note, this implementation uses "rev-parse --symbolic-full-name" because the output from
            // "branch --list" is more difficult when in a detached HEAD state.
            // Note, this implementation uses "rev-parse --symbolic-full-name" because there is a bug
            // in Git 2.18 that causes "rev-parse --symbolic" to output symbolic full names.
            const args = ['rev-parse', '--symbolic-full-name'];
            if (remote) {
                args.push('--remotes=origin');
            }
            else {
                args.push('--branches');
            }
            const output = yield this.execGit(args);
            for (let branch of output.stdout.trim().split('\n')) {
                branch = branch.trim();
                if (branch) {
                    if (branch.startsWith('refs/heads/')) {
                        branch = branch.substr('refs/heads/'.length);
                    }
                    else if (branch.startsWith('refs/remotes/')) {
                        branch = branch.substr('refs/remotes/'.length);
                    }
                    result.push(branch);
                }
            }
            return result;
        });
    }
    checkout(ref, startPoint) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['checkout', '--progress', '--force'];
            if (startPoint) {
                args.push('-B', ref, startPoint);
            }
            else {
                args.push(ref);
            }
            yield this.execGit(args);
        });
    }
    checkoutDetach() {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['checkout', '--detach'];
            yield this.execGit(args);
        });
    }
    config(configKey, configValue, globalConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.execGit([
                'config',
                globalConfig ? '--global' : '--local',
                configKey,
                configValue
            ]);
        });
    }
    configExists(configKey, globalConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const pattern = regexpHelper.escape(configKey);
            const output = yield this.execGit([
                'config',
                globalConfig ? '--global' : '--local',
                '--name-only',
                '--get-regexp',
                pattern
            ], true);
            return output.exitCode === 0;
        });
    }
    fetch(refSpec, fetchDepth) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['-c', 'protocol.version=2', 'fetch'];
            if (!refSpec.some(x => x === refHelper.tagsRefSpec)) {
                args.push('--no-tags');
            }
            args.push('--prune', '--progress', '--no-recurse-submodules');
            if (fetchDepth && fetchDepth > 0) {
                args.push(`--depth=${fetchDepth}`);
            }
            else if (fshelper.fileExistsSync(path.join(this.workingDirectory, '.git', 'shallow'))) {
                args.push('--unshallow');
            }
            args.push('origin');
            for (const arg of refSpec) {
                args.push(arg);
            }
            const that = this;
            yield retryHelper.execute(() => __awaiter(this, void 0, void 0, function* () {
                yield that.execGit(args);
            }));
        });
    }
    getDefaultBranch(repositoryUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            let output;
            yield retryHelper.execute(() => __awaiter(this, void 0, void 0, function* () {
                output = yield this.execGit([
                    'ls-remote',
                    '--quiet',
                    '--exit-code',
                    '--symref',
                    repositoryUrl,
                    'HEAD'
                ]);
            }));
            if (output) {
                // Satisfy compiler, will always be set
                for (let line of output.stdout.trim().split('\n')) {
                    line = line.trim();
                    if (line.startsWith('ref:') || line.endsWith('HEAD')) {
                        return line
                            .substr('ref:'.length, line.length - 'ref:'.length - 'HEAD'.length)
                            .trim();
                    }
                }
            }
            throw new Error('Unexpected output when retrieving default branch');
        });
    }
    getWorkingDirectory() {
        return this.workingDirectory;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.execGit(['init', this.workingDirectory]);
        });
    }
    isDetached() {
        return __awaiter(this, void 0, void 0, function* () {
            // Note, "branch --show-current" would be simpler but isn't available until Git 2.22
            const output = yield this.execGit(['rev-parse', '--symbolic-full-name', '--verify', '--quiet', 'HEAD'], true);
            return !output.stdout.trim().startsWith('refs/heads/');
        });
    }
    lfsFetch(ref) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['lfs', 'fetch', 'origin', ref];
            const that = this;
            yield retryHelper.execute(() => __awaiter(this, void 0, void 0, function* () {
                yield that.execGit(args);
            }));
        });
    }
    lfsInstall() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.execGit(['lfs', 'install', '--local']);
        });
    }
    log1(format) {
        return __awaiter(this, void 0, void 0, function* () {
            var args = format ? ['log', '-1', format] : ['log', '-1'];
            var silent = format ? false : true;
            const output = yield this.execGit(args, false, silent);
            return output.stdout;
        });
    }
    remoteAdd(remoteName, remoteUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.execGit(['remote', 'add', remoteName, remoteUrl]);
        });
    }
    removeEnvironmentVariable(name) {
        delete this.gitEnv[name];
    }
    /**
     * Resolves a ref to a SHA. For a branch or lightweight tag, the commit SHA is returned.
     * For an annotated tag, the tag SHA is returned.
     * @param {string} ref  For example: 'refs/heads/main' or '/refs/tags/v1'
     * @returns {Promise<string>}
     */
    revParse(ref) {
        return __awaiter(this, void 0, void 0, function* () {
            const output = yield this.execGit(['rev-parse', ref]);
            return output.stdout.trim();
        });
    }
    setEnvironmentVariable(name, value) {
        this.gitEnv[name] = value;
    }
    shaExists(sha) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['rev-parse', '--verify', '--quiet', `${sha}^{object}`];
            const output = yield this.execGit(args, true);
            return output.exitCode === 0;
        });
    }
    submoduleForeach(command, recursive) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['submodule', 'foreach'];
            if (recursive) {
                args.push('--recursive');
            }
            args.push(command);
            const output = yield this.execGit(args);
            return output.stdout;
        });
    }
    submoduleSync(recursive) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['submodule', 'sync'];
            if (recursive) {
                args.push('--recursive');
            }
            yield this.execGit(args);
        });
    }
    submoduleUpdate(fetchDepth, recursive) {
        return __awaiter(this, void 0, void 0, function* () {
            const args = ['-c', 'protocol.version=2'];
            args.push('submodule', 'update', '--init', '--force');
            if (fetchDepth > 0) {
                args.push(`--depth=${fetchDepth}`);
            }
            if (recursive) {
                args.push('--recursive');
            }
            yield this.execGit(args);
        });
    }
    tagExists(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            const output = yield this.execGit(['tag', '--list', pattern]);
            return !!output.stdout.trim();
        });
    }
    tryClean() {
        return __awaiter(this, void 0, void 0, function* () {
            const output = yield this.execGit(['clean', '-ffdx'], true);
            return output.exitCode === 0;
        });
    }
    tryConfigUnset(configKey, globalConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            const output = yield this.execGit([
                'config',
                globalConfig ? '--global' : '--local',
                '--unset-all',
                configKey
            ], true);
            return output.exitCode === 0;
        });
    }
    tryDisableAutomaticGarbageCollection() {
        return __awaiter(this, void 0, void 0, function* () {
            const output = yield this.execGit(['config', '--local', 'gc.auto', '0'], true);
            return output.exitCode === 0;
        });
    }
    tryGetFetchUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const output = yield this.execGit(['config', '--local', '--get', 'remote.origin.url'], true);
            if (output.exitCode !== 0) {
                return '';
            }
            const stdout = output.stdout.trim();
            if (stdout.includes('\n')) {
                return '';
            }
            return stdout;
        });
    }
    tryReset() {
        return __awaiter(this, void 0, void 0, function* () {
            const output = yield this.execGit(['reset', '--hard', 'HEAD'], true);
            return output.exitCode === 0;
        });
    }
    static createCommandManager(workingDirectory, lfs) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = new GitCommandManager();
            yield result.initializeCommandManager(workingDirectory, lfs);
            return result;
        });
    }
    execGit(args, allowAllExitCodes = false, silent = false) {
        return __awaiter(this, void 0, void 0, function* () {
            fshelper.directoryExistsSync(this.workingDirectory, true);
            const result = new GitOutput();
            const env = {};
            for (const key of Object.keys(process.env)) {
                env[key] = process.env[key];
            }
            for (const key of Object.keys(this.gitEnv)) {
                env[key] = this.gitEnv[key];
            }
            const stdout = [];
            const options = {
                cwd: this.workingDirectory,
                env,
                silent,
                ignoreReturnCode: allowAllExitCodes,
                listeners: {
                    stdout: (data) => {
                        stdout.push(data.toString());
                    }
                }
            };
            result.exitCode = yield exec.exec(`"${this.gitPath}"`, args, options);
            result.stdout = stdout.join('');
            return result;
        });
    }
    initializeCommandManager(workingDirectory, lfs) {
        return __awaiter(this, void 0, void 0, function* () {
            this.workingDirectory = workingDirectory;
            // Git-lfs will try to pull down assets if any of the local/user/system setting exist.
            // If the user didn't enable `LFS` in their pipeline definition, disable LFS fetch/checkout.
            this.lfs = lfs;
            if (!this.lfs) {
                this.gitEnv['GIT_LFS_SKIP_SMUDGE'] = '1';
            }
            this.gitPath = yield io.which('git', true);
            // Git version
            core.debug('Getting git version');
            let gitVersion = new git_version_1.GitVersion();
            let gitOutput = yield this.execGit(['version']);
            let stdout = gitOutput.stdout.trim();
            if (!stdout.includes('\n')) {
                const match = stdout.match(/\d+\.\d+(\.\d+)?/);
                if (match) {
                    gitVersion = new git_version_1.GitVersion(match[0]);
                }
            }
            if (!gitVersion.isValid()) {
                throw new Error('Unable to determine git version');
            }
            // Minimum git version
            if (!gitVersion.checkMinimum(exports.MinimumGitVersion)) {
                throw new Error(`Minimum required git version is ${exports.MinimumGitVersion}. Your git ('${this.gitPath}') is ${gitVersion}`);
            }
            if (this.lfs) {
                // Git-lfs version
                core.debug('Getting git-lfs version');
                let gitLfsVersion = new git_version_1.GitVersion();
                const gitLfsPath = yield io.which('git-lfs', true);
                gitOutput = yield this.execGit(['lfs', 'version']);
                stdout = gitOutput.stdout.trim();
                if (!stdout.includes('\n')) {
                    const match = stdout.match(/\d+\.\d+(\.\d+)?/);
                    if (match) {
                        gitLfsVersion = new git_version_1.GitVersion(match[0]);
                    }
                }
                if (!gitLfsVersion.isValid()) {
                    throw new Error('Unable to determine git-lfs version');
                }
                // Minimum git-lfs version
                // Note:
                // - Auth header not supported before 2.1
                const minimumGitLfsVersion = new git_version_1.GitVersion('2.1');
                if (!gitLfsVersion.checkMinimum(minimumGitLfsVersion)) {
                    throw new Error(`Minimum required git-lfs version is ${minimumGitLfsVersion}. Your git-lfs ('${gitLfsPath}') is ${gitLfsVersion}`);
                }
            }
            // Set the user agent
            const gitHttpUserAgent = `git/${gitVersion} (github-actions-checkout)`;
            core.debug(`Set git useragent to: ${gitHttpUserAgent}`);
            this.gitEnv['GIT_HTTP_USER_AGENT'] = gitHttpUserAgent;
        });
    }
}
class GitOutput {
    constructor() {
        this.stdout = '';
        this.exitCode = 0;
    }
}
