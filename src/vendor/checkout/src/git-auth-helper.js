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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthHelper = void 0;
const assert = __importStar(require("assert"));
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const io = __importStar(require("@actions/io"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const regexpHelper = __importStar(require("./regexp-helper"));
const stateHelper = __importStar(require("./state-helper"));
const urlHelper = __importStar(require("./url-helper"));
const v4_1 = __importDefault(require("uuid/v4"));
const IS_WINDOWS = process.platform === 'win32';
const SSH_COMMAND_KEY = 'core.sshCommand';
function createAuthHelper(git, settings) {
    return new GitAuthHelper(git, settings);
}
exports.createAuthHelper = createAuthHelper;
class GitAuthHelper {
    constructor(gitCommandManager, gitSourceSettings) {
        this.sshCommand = '';
        this.sshKeyPath = '';
        this.sshKnownHostsPath = '';
        this.temporaryHomePath = '';
        this.git = gitCommandManager;
        this.settings = gitSourceSettings || {};
        // Token auth header
        const serverUrl = urlHelper.getServerUrl();
        this.tokenConfigKey = `http.${serverUrl.origin}/.extraheader`; // "origin" is SCHEME://HOSTNAME[:PORT]
        const basicCredential = Buffer.from(`x-access-token:${this.settings.authToken}`, 'utf8').toString('base64');
        core.setSecret(basicCredential);
        this.tokenPlaceholderConfigValue = `AUTHORIZATION: basic ***`;
        this.tokenConfigValue = `AUTHORIZATION: basic ${basicCredential}`;
        // Instead of SSH URL
        this.insteadOfKey = `url.${serverUrl.origin}/.insteadOf`; // "origin" is SCHEME://HOSTNAME[:PORT]
        this.insteadOfValue = `git@${serverUrl.hostname}:`;
    }
    configureAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove possible previous values
            yield this.removeAuth();
            // Configure new values
            yield this.configureSsh();
            yield this.configureToken();
        });
    }
    configureGlobalAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            // Create a temp home directory
            const runnerTemp = process.env['RUNNER_TEMP'] || '';
            assert.ok(runnerTemp, 'RUNNER_TEMP is not defined');
            const uniqueId = v4_1.default();
            this.temporaryHomePath = path.join(runnerTemp, uniqueId);
            yield fs.promises.mkdir(this.temporaryHomePath, { recursive: true });
            // Copy the global git config
            const gitConfigPath = path.join(process.env['HOME'] || os.homedir(), '.gitconfig');
            const newGitConfigPath = path.join(this.temporaryHomePath, '.gitconfig');
            let configExists = false;
            try {
                yield fs.promises.stat(gitConfigPath);
                configExists = true;
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }
            if (configExists) {
                core.info(`Copying '${gitConfigPath}' to '${newGitConfigPath}'`);
                yield io.cp(gitConfigPath, newGitConfigPath);
            }
            else {
                yield fs.promises.writeFile(newGitConfigPath, '');
            }
            try {
                // Override HOME
                core.info(`Temporarily overriding HOME='${this.temporaryHomePath}' before making global git config changes`);
                this.git.setEnvironmentVariable('HOME', this.temporaryHomePath);
                // Configure the token
                yield this.configureToken(newGitConfigPath, true);
                // Configure HTTPS instead of SSH
                yield this.git.tryConfigUnset(this.insteadOfKey, true);
                if (!this.settings.sshKey) {
                    yield this.git.config(this.insteadOfKey, this.insteadOfValue, true);
                }
            }
            catch (err) {
                // Unset in case somehow written to the real global config
                core.info('Encountered an error when attempting to configure token. Attempting unconfigure.');
                yield this.git.tryConfigUnset(this.tokenConfigKey, true);
                throw err;
            }
        });
    }
    configureSubmoduleAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            // Remove possible previous HTTPS instead of SSH
            yield this.removeGitConfig(this.insteadOfKey, true);
            if (this.settings.persistCredentials) {
                // Configure a placeholder value. This approach avoids the credential being captured
                // by process creation audit events, which are commonly logged. For more information,
                // refer to https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/command-line-process-auditing
                const output = yield this.git.submoduleForeach(`git config --local '${this.tokenConfigKey}' '${this.tokenPlaceholderConfigValue}' && git config --local --show-origin --name-only --get-regexp remote.origin.url`, this.settings.nestedSubmodules);
                // Replace the placeholder
                const configPaths = output.match(/(?<=(^|\n)file:)[^\t]+(?=\tremote\.origin\.url)/g) || [];
                for (const configPath of configPaths) {
                    core.debug(`Replacing token placeholder in '${configPath}'`);
                    yield this.replaceTokenPlaceholder(configPath);
                }
                if (this.settings.sshKey) {
                    // Configure core.sshCommand
                    yield this.git.submoduleForeach(`git config --local '${SSH_COMMAND_KEY}' '${this.sshCommand}'`, this.settings.nestedSubmodules);
                }
                else {
                    // Configure HTTPS instead of SSH
                    yield this.git.submoduleForeach(`git config --local '${this.insteadOfKey}' '${this.insteadOfValue}'`, this.settings.nestedSubmodules);
                }
            }
        });
    }
    removeAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.removeSsh();
            yield this.removeToken();
        });
    }
    removeGlobalAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            core.debug(`Unsetting HOME override`);
            this.git.removeEnvironmentVariable('HOME');
            yield io.rmRF(this.temporaryHomePath);
        });
    }
    configureSsh() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.settings.sshKey) {
                return;
            }
            // Write key
            const runnerTemp = process.env['RUNNER_TEMP'] || '';
            assert.ok(runnerTemp, 'RUNNER_TEMP is not defined');
            const uniqueId = v4_1.default();
            this.sshKeyPath = path.join(runnerTemp, uniqueId);
            stateHelper.setSshKeyPath(this.sshKeyPath);
            yield fs.promises.mkdir(runnerTemp, { recursive: true });
            yield fs.promises.writeFile(this.sshKeyPath, this.settings.sshKey.trim() + '\n', { mode: 0o600 });
            // Remove inherited permissions on Windows
            if (IS_WINDOWS) {
                const icacls = yield io.which('icacls.exe');
                yield exec.exec(`"${icacls}" "${this.sshKeyPath}" /grant:r "${process.env['USERDOMAIN']}\\${process.env['USERNAME']}:F"`);
                yield exec.exec(`"${icacls}" "${this.sshKeyPath}" /inheritance:r`);
            }
            // Write known hosts
            const userKnownHostsPath = path.join(os.homedir(), '.ssh', 'known_hosts');
            let userKnownHosts = '';
            try {
                userKnownHosts = (yield fs.promises.readFile(userKnownHostsPath)).toString();
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }
            let knownHosts = '';
            if (userKnownHosts) {
                knownHosts += `# Begin from ${userKnownHostsPath}\n${userKnownHosts}\n# End from ${userKnownHostsPath}\n`;
            }
            if (this.settings.sshKnownHosts) {
                knownHosts += `# Begin from input known hosts\n${this.settings.sshKnownHosts}\n# end from input known hosts\n`;
            }
            knownHosts += `# Begin implicitly added github.com\ngithub.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==\n# End implicitly added github.com\n`;
            this.sshKnownHostsPath = path.join(runnerTemp, `${uniqueId}_known_hosts`);
            stateHelper.setSshKnownHostsPath(this.sshKnownHostsPath);
            yield fs.promises.writeFile(this.sshKnownHostsPath, knownHosts);
            // Configure GIT_SSH_COMMAND
            const sshPath = yield io.which('ssh', true);
            this.sshCommand = `"${sshPath}" -i "$RUNNER_TEMP/${path.basename(this.sshKeyPath)}"`;
            if (this.settings.sshStrict) {
                this.sshCommand += ' -o StrictHostKeyChecking=yes -o CheckHostIP=no';
            }
            this.sshCommand += ` -o "UserKnownHostsFile=$RUNNER_TEMP/${path.basename(this.sshKnownHostsPath)}"`;
            core.info(`Temporarily overriding GIT_SSH_COMMAND=${this.sshCommand}`);
            this.git.setEnvironmentVariable('GIT_SSH_COMMAND', this.sshCommand);
            // Configure core.sshCommand
            if (this.settings.persistCredentials) {
                yield this.git.config(SSH_COMMAND_KEY, this.sshCommand);
            }
        });
    }
    configureToken(configPath, globalConfig) {
        return __awaiter(this, void 0, void 0, function* () {
            // Validate args
            assert.ok((configPath && globalConfig) || (!configPath && !globalConfig), 'Unexpected configureToken parameter combinations');
            // Default config path
            if (!configPath && !globalConfig) {
                configPath = path.join(this.git.getWorkingDirectory(), '.git', 'config');
            }
            // Configure a placeholder value. This approach avoids the credential being captured
            // by process creation audit events, which are commonly logged. For more information,
            // refer to https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/manage/component-updates/command-line-process-auditing
            yield this.git.config(this.tokenConfigKey, this.tokenPlaceholderConfigValue, globalConfig);
            // Replace the placeholder
            yield this.replaceTokenPlaceholder(configPath || '');
        });
    }
    replaceTokenPlaceholder(configPath) {
        return __awaiter(this, void 0, void 0, function* () {
            assert.ok(configPath, 'configPath is not defined');
            let content = (yield fs.promises.readFile(configPath)).toString();
            const placeholderIndex = content.indexOf(this.tokenPlaceholderConfigValue);
            if (placeholderIndex < 0 ||
                placeholderIndex != content.lastIndexOf(this.tokenPlaceholderConfigValue)) {
                throw new Error(`Unable to replace auth placeholder in ${configPath}`);
            }
            assert.ok(this.tokenConfigValue, 'tokenConfigValue is not defined');
            content = content.replace(this.tokenPlaceholderConfigValue, this.tokenConfigValue);
            yield fs.promises.writeFile(configPath, content);
        });
    }
    removeSsh() {
        return __awaiter(this, void 0, void 0, function* () {
            // SSH key
            const keyPath = this.sshKeyPath || stateHelper.SshKeyPath;
            if (keyPath) {
                try {
                    yield io.rmRF(keyPath);
                }
                catch (err) {
                    core.debug(err.message);
                    core.warning(`Failed to remove SSH key '${keyPath}'`);
                }
            }
            // SSH known hosts
            const knownHostsPath = this.sshKnownHostsPath || stateHelper.SshKnownHostsPath;
            if (knownHostsPath) {
                try {
                    yield io.rmRF(knownHostsPath);
                }
                catch (_a) {
                    // Intentionally empty
                }
            }
            // SSH command
            yield this.removeGitConfig(SSH_COMMAND_KEY);
        });
    }
    removeToken() {
        return __awaiter(this, void 0, void 0, function* () {
            // HTTP extra header
            yield this.removeGitConfig(this.tokenConfigKey);
        });
    }
    removeGitConfig(configKey, submoduleOnly = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!submoduleOnly) {
                if ((yield this.git.configExists(configKey)) &&
                    !(yield this.git.tryConfigUnset(configKey))) {
                    // Load the config contents
                    core.warning(`Failed to remove '${configKey}' from the git config`);
                }
            }
            const pattern = regexpHelper.escape(configKey);
            yield this.git.submoduleForeach(`git config --local --name-only --get-regexp '${pattern}' && git config --local --unset-all '${configKey}' || :`, true);
        });
    }
}
