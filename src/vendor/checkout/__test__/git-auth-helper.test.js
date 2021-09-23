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
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const gitAuthHelper = __importStar(require("../lib/git-auth-helper"));
const io = __importStar(require("@actions/io"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const stateHelper = __importStar(require("../lib/state-helper"));
const isWindows = process.platform === 'win32';
const testWorkspace = path.join(__dirname, '_temp', 'git-auth-helper');
const originalRunnerTemp = process.env['RUNNER_TEMP'];
const originalHome = process.env['HOME'];
let workspace;
let localGitConfigPath;
let globalGitConfigPath;
let runnerTemp;
let tempHomedir;
let git;
let settings;
let sshPath;
describe('git-auth-helper tests', () => {
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // SSH
        sshPath = yield io.which('ssh');
        // Clear test workspace
        yield io.rmRF(testWorkspace);
    }));
    beforeEach(() => {
        // Mock setSecret
        jest.spyOn(core, 'setSecret').mockImplementation((secret) => { });
        // Mock error/warning/info/debug
        jest.spyOn(core, 'error').mockImplementation(jest.fn());
        jest.spyOn(core, 'warning').mockImplementation(jest.fn());
        jest.spyOn(core, 'info').mockImplementation(jest.fn());
        jest.spyOn(core, 'debug').mockImplementation(jest.fn());
        // Mock state helper
        jest.spyOn(stateHelper, 'setSshKeyPath').mockImplementation(jest.fn());
        jest
            .spyOn(stateHelper, 'setSshKnownHostsPath')
            .mockImplementation(jest.fn());
    });
    afterEach(() => {
        // Unregister mocks
        jest.restoreAllMocks();
        // Restore HOME
        if (originalHome) {
            process.env['HOME'] = originalHome;
        }
        else {
            delete process.env['HOME'];
        }
    });
    afterAll(() => {
        // Restore RUNNER_TEMP
        delete process.env['RUNNER_TEMP'];
        if (originalRunnerTemp) {
            process.env['RUNNER_TEMP'] = originalRunnerTemp;
        }
    });
    const configureAuth_configuresAuthHeader = 'configureAuth configures auth header';
    it(configureAuth_configuresAuthHeader, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(configureAuth_configuresAuthHeader);
        expect(settings.authToken).toBeTruthy(); // sanity check
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        // Assert config
        const configContent = (yield fs.promises.readFile(localGitConfigPath)).toString();
        const basicCredential = Buffer.from(`x-access-token:${settings.authToken}`, 'utf8').toString('base64');
        expect(configContent.indexOf(`http.https://github.com/.extraheader AUTHORIZATION: basic ${basicCredential}`)).toBeGreaterThanOrEqual(0);
    }));
    const configureAuth_configuresAuthHeaderEvenWhenPersistCredentialsFalse = 'configureAuth configures auth header even when persist credentials false';
    it(configureAuth_configuresAuthHeaderEvenWhenPersistCredentialsFalse, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(configureAuth_configuresAuthHeaderEvenWhenPersistCredentialsFalse);
        expect(settings.authToken).toBeTruthy(); // sanity check
        settings.persistCredentials = false;
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        // Assert config
        const configContent = (yield fs.promises.readFile(localGitConfigPath)).toString();
        expect(configContent.indexOf(`http.https://github.com/.extraheader AUTHORIZATION`)).toBeGreaterThanOrEqual(0);
    }));
    const configureAuth_copiesUserKnownHosts = 'configureAuth copies user known hosts';
    it(configureAuth_copiesUserKnownHosts, () => __awaiter(void 0, void 0, void 0, function* () {
        if (!sshPath) {
            process.stdout.write(`Skipped test "${configureAuth_copiesUserKnownHosts}". Executable 'ssh' not found in the PATH.\n`);
            return;
        }
        // Arange
        yield setup(configureAuth_copiesUserKnownHosts);
        expect(settings.sshKey).toBeTruthy(); // sanity check
        // Mock fs.promises.readFile
        const realReadFile = fs.promises.readFile;
        jest.spyOn(fs.promises, 'readFile').mockImplementation((file, options) => __awaiter(void 0, void 0, void 0, function* () {
            const userKnownHostsPath = path.join(os.homedir(), '.ssh', 'known_hosts');
            if (file === userKnownHostsPath) {
                return Buffer.from('some-domain.com ssh-rsa ABCDEF');
            }
            return yield realReadFile(file, options);
        }));
        // Act
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        yield authHelper.configureAuth();
        // Assert known hosts
        const actualSshKnownHostsPath = yield getActualSshKnownHostsPath();
        const actualSshKnownHostsContent = (yield fs.promises.readFile(actualSshKnownHostsPath)).toString();
        expect(actualSshKnownHostsContent).toMatch(/some-domain\.com ssh-rsa ABCDEF/);
        expect(actualSshKnownHostsContent).toMatch(/github\.com ssh-rsa AAAAB3N/);
    }));
    const configureAuth_registersBasicCredentialAsSecret = 'configureAuth registers basic credential as secret';
    it(configureAuth_registersBasicCredentialAsSecret, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(configureAuth_registersBasicCredentialAsSecret);
        expect(settings.authToken).toBeTruthy(); // sanity check
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        // Assert secret
        const setSecretSpy = core.setSecret;
        expect(setSecretSpy).toHaveBeenCalledTimes(1);
        const expectedSecret = Buffer.from(`x-access-token:${settings.authToken}`, 'utf8').toString('base64');
        expect(setSecretSpy).toHaveBeenCalledWith(expectedSecret);
    }));
    const setsSshCommandEnvVarWhenPersistCredentialsFalse = 'sets SSH command env var when persist-credentials false';
    it(setsSshCommandEnvVarWhenPersistCredentialsFalse, () => __awaiter(void 0, void 0, void 0, function* () {
        if (!sshPath) {
            process.stdout.write(`Skipped test "${setsSshCommandEnvVarWhenPersistCredentialsFalse}". Executable 'ssh' not found in the PATH.\n`);
            return;
        }
        // Arrange
        yield setup(setsSshCommandEnvVarWhenPersistCredentialsFalse);
        settings.persistCredentials = false;
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        // Assert git env var
        const actualKeyPath = yield getActualSshKeyPath();
        const actualKnownHostsPath = yield getActualSshKnownHostsPath();
        const expectedSshCommand = `"${sshPath}" -i "$RUNNER_TEMP/${path.basename(actualKeyPath)}" -o StrictHostKeyChecking=yes -o CheckHostIP=no -o "UserKnownHostsFile=$RUNNER_TEMP/${path.basename(actualKnownHostsPath)}"`;
        expect(git.setEnvironmentVariable).toHaveBeenCalledWith('GIT_SSH_COMMAND', expectedSshCommand);
        // Asserty git config
        const gitConfigLines = (yield fs.promises.readFile(localGitConfigPath))
            .toString()
            .split('\n')
            .filter(x => x);
        expect(gitConfigLines).toHaveLength(1);
        expect(gitConfigLines[0]).toMatch(/^http\./);
    }));
    const configureAuth_setsSshCommandWhenPersistCredentialsTrue = 'sets SSH command when persist-credentials true';
    it(configureAuth_setsSshCommandWhenPersistCredentialsTrue, () => __awaiter(void 0, void 0, void 0, function* () {
        if (!sshPath) {
            process.stdout.write(`Skipped test "${configureAuth_setsSshCommandWhenPersistCredentialsTrue}". Executable 'ssh' not found in the PATH.\n`);
            return;
        }
        // Arrange
        yield setup(configureAuth_setsSshCommandWhenPersistCredentialsTrue);
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        // Assert git env var
        const actualKeyPath = yield getActualSshKeyPath();
        const actualKnownHostsPath = yield getActualSshKnownHostsPath();
        const expectedSshCommand = `"${sshPath}" -i "$RUNNER_TEMP/${path.basename(actualKeyPath)}" -o StrictHostKeyChecking=yes -o CheckHostIP=no -o "UserKnownHostsFile=$RUNNER_TEMP/${path.basename(actualKnownHostsPath)}"`;
        expect(git.setEnvironmentVariable).toHaveBeenCalledWith('GIT_SSH_COMMAND', expectedSshCommand);
        // Asserty git config
        expect(git.config).toHaveBeenCalledWith('core.sshCommand', expectedSshCommand);
    }));
    const configureAuth_writesExplicitKnownHosts = 'writes explicit known hosts';
    it(configureAuth_writesExplicitKnownHosts, () => __awaiter(void 0, void 0, void 0, function* () {
        if (!sshPath) {
            process.stdout.write(`Skipped test "${configureAuth_writesExplicitKnownHosts}". Executable 'ssh' not found in the PATH.\n`);
            return;
        }
        // Arrange
        yield setup(configureAuth_writesExplicitKnownHosts);
        expect(settings.sshKey).toBeTruthy(); // sanity check
        settings.sshKnownHosts = 'my-custom-host.com ssh-rsa ABC123';
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        // Assert known hosts
        const actualSshKnownHostsPath = yield getActualSshKnownHostsPath();
        const actualSshKnownHostsContent = (yield fs.promises.readFile(actualSshKnownHostsPath)).toString();
        expect(actualSshKnownHostsContent).toMatch(/my-custom-host\.com ssh-rsa ABC123/);
        expect(actualSshKnownHostsContent).toMatch(/github\.com ssh-rsa AAAAB3N/);
    }));
    const configureAuth_writesSshKeyAndImplicitKnownHosts = 'writes SSH key and implicit known hosts';
    it(configureAuth_writesSshKeyAndImplicitKnownHosts, () => __awaiter(void 0, void 0, void 0, function* () {
        if (!sshPath) {
            process.stdout.write(`Skipped test "${configureAuth_writesSshKeyAndImplicitKnownHosts}". Executable 'ssh' not found in the PATH.\n`);
            return;
        }
        // Arrange
        yield setup(configureAuth_writesSshKeyAndImplicitKnownHosts);
        expect(settings.sshKey).toBeTruthy(); // sanity check
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        // Assert SSH key
        const actualSshKeyPath = yield getActualSshKeyPath();
        expect(actualSshKeyPath).toBeTruthy();
        const actualSshKeyContent = (yield fs.promises.readFile(actualSshKeyPath)).toString();
        expect(actualSshKeyContent).toBe(settings.sshKey + '\n');
        if (!isWindows) {
            // Assert read/write for user, not group or others.
            // Otherwise SSH client will error.
            expect((yield fs.promises.stat(actualSshKeyPath)).mode & 0o777).toBe(0o600);
        }
        // Assert known hosts
        const actualSshKnownHostsPath = yield getActualSshKnownHostsPath();
        const actualSshKnownHostsContent = (yield fs.promises.readFile(actualSshKnownHostsPath)).toString();
        expect(actualSshKnownHostsContent).toMatch(/github\.com ssh-rsa AAAAB3N/);
    }));
    const configureGlobalAuth_configuresUrlInsteadOfWhenSshKeyNotSet = 'configureGlobalAuth configures URL insteadOf when SSH key not set';
    it(configureGlobalAuth_configuresUrlInsteadOfWhenSshKeyNotSet, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(configureGlobalAuth_configuresUrlInsteadOfWhenSshKeyNotSet);
        settings.sshKey = '';
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        yield authHelper.configureGlobalAuth();
        // Assert temporary global config
        expect(git.env['HOME']).toBeTruthy();
        const configContent = (yield fs.promises.readFile(path.join(git.env['HOME'], '.gitconfig'))).toString();
        expect(configContent.indexOf(`url.https://github.com/.insteadOf git@github.com`)).toBeGreaterThanOrEqual(0);
    }));
    const configureGlobalAuth_copiesGlobalGitConfig = 'configureGlobalAuth copies global git config';
    it(configureGlobalAuth_copiesGlobalGitConfig, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(configureGlobalAuth_copiesGlobalGitConfig);
        yield fs.promises.writeFile(globalGitConfigPath, 'value-from-global-config');
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        yield authHelper.configureGlobalAuth();
        // Assert original global config not altered
        let configContent = (yield fs.promises.readFile(globalGitConfigPath)).toString();
        expect(configContent).toBe('value-from-global-config');
        // Assert temporary global config
        expect(git.env['HOME']).toBeTruthy();
        const basicCredential = Buffer.from(`x-access-token:${settings.authToken}`, 'utf8').toString('base64');
        configContent = (yield fs.promises.readFile(path.join(git.env['HOME'], '.gitconfig'))).toString();
        expect(configContent.indexOf('value-from-global-config')).toBeGreaterThanOrEqual(0);
        expect(configContent.indexOf(`http.https://github.com/.extraheader AUTHORIZATION: basic ${basicCredential}`)).toBeGreaterThanOrEqual(0);
    }));
    const configureGlobalAuth_createsNewGlobalGitConfigWhenGlobalDoesNotExist = 'configureGlobalAuth creates new git config when global does not exist';
    it(configureGlobalAuth_createsNewGlobalGitConfigWhenGlobalDoesNotExist, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(configureGlobalAuth_createsNewGlobalGitConfigWhenGlobalDoesNotExist);
        yield io.rmRF(globalGitConfigPath);
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        // Act
        yield authHelper.configureAuth();
        yield authHelper.configureGlobalAuth();
        // Assert original global config not recreated
        try {
            yield fs.promises.stat(globalGitConfigPath);
            throw new Error(`Did not expect file to exist: '${globalGitConfigPath}'`);
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
        // Assert temporary global config
        expect(git.env['HOME']).toBeTruthy();
        const basicCredential = Buffer.from(`x-access-token:${settings.authToken}`, 'utf8').toString('base64');
        const configContent = (yield fs.promises.readFile(path.join(git.env['HOME'], '.gitconfig'))).toString();
        expect(configContent.indexOf(`http.https://github.com/.extraheader AUTHORIZATION: basic ${basicCredential}`)).toBeGreaterThanOrEqual(0);
    }));
    const configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsFalseAndSshKeyNotSet = 'configureSubmoduleAuth configures submodules when persist credentials false and SSH key not set';
    it(configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsFalseAndSshKeyNotSet, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsFalseAndSshKeyNotSet);
        settings.persistCredentials = false;
        settings.sshKey = '';
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        yield authHelper.configureAuth();
        const mockSubmoduleForeach = git.submoduleForeach;
        mockSubmoduleForeach.mockClear(); // reset calls
        // Act
        yield authHelper.configureSubmoduleAuth();
        // Assert
        expect(mockSubmoduleForeach).toBeCalledTimes(1);
        expect(mockSubmoduleForeach.mock.calls[0][0]).toMatch(/unset-all.*insteadOf/);
    }));
    const configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsFalseAndSshKeySet = 'configureSubmoduleAuth configures submodules when persist credentials false and SSH key set';
    it(configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsFalseAndSshKeySet, () => __awaiter(void 0, void 0, void 0, function* () {
        if (!sshPath) {
            process.stdout.write(`Skipped test "${configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsFalseAndSshKeySet}". Executable 'ssh' not found in the PATH.\n`);
            return;
        }
        // Arrange
        yield setup(configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsFalseAndSshKeySet);
        settings.persistCredentials = false;
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        yield authHelper.configureAuth();
        const mockSubmoduleForeach = git.submoduleForeach;
        mockSubmoduleForeach.mockClear(); // reset calls
        // Act
        yield authHelper.configureSubmoduleAuth();
        // Assert
        expect(mockSubmoduleForeach).toHaveBeenCalledTimes(1);
        expect(mockSubmoduleForeach.mock.calls[0][0]).toMatch(/unset-all.*insteadOf/);
    }));
    const configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsTrueAndSshKeyNotSet = 'configureSubmoduleAuth configures submodules when persist credentials true and SSH key not set';
    it(configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsTrueAndSshKeyNotSet, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsTrueAndSshKeyNotSet);
        settings.sshKey = '';
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        yield authHelper.configureAuth();
        const mockSubmoduleForeach = git.submoduleForeach;
        mockSubmoduleForeach.mockClear(); // reset calls
        // Act
        yield authHelper.configureSubmoduleAuth();
        // Assert
        expect(mockSubmoduleForeach).toHaveBeenCalledTimes(3);
        expect(mockSubmoduleForeach.mock.calls[0][0]).toMatch(/unset-all.*insteadOf/);
        expect(mockSubmoduleForeach.mock.calls[1][0]).toMatch(/http.*extraheader/);
        expect(mockSubmoduleForeach.mock.calls[2][0]).toMatch(/url.*insteadOf/);
    }));
    const configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsTrueAndSshKeySet = 'configureSubmoduleAuth configures submodules when persist credentials true and SSH key set';
    it(configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsTrueAndSshKeySet, () => __awaiter(void 0, void 0, void 0, function* () {
        if (!sshPath) {
            process.stdout.write(`Skipped test "${configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsTrueAndSshKeySet}". Executable 'ssh' not found in the PATH.\n`);
            return;
        }
        // Arrange
        yield setup(configureSubmoduleAuth_configuresSubmodulesWhenPersistCredentialsTrueAndSshKeySet);
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        yield authHelper.configureAuth();
        const mockSubmoduleForeach = git.submoduleForeach;
        mockSubmoduleForeach.mockClear(); // reset calls
        // Act
        yield authHelper.configureSubmoduleAuth();
        // Assert
        expect(mockSubmoduleForeach).toHaveBeenCalledTimes(3);
        expect(mockSubmoduleForeach.mock.calls[0][0]).toMatch(/unset-all.*insteadOf/);
        expect(mockSubmoduleForeach.mock.calls[1][0]).toMatch(/http.*extraheader/);
        expect(mockSubmoduleForeach.mock.calls[2][0]).toMatch(/core\.sshCommand/);
    }));
    const removeAuth_removesSshCommand = 'removeAuth removes SSH command';
    it(removeAuth_removesSshCommand, () => __awaiter(void 0, void 0, void 0, function* () {
        if (!sshPath) {
            process.stdout.write(`Skipped test "${removeAuth_removesSshCommand}". Executable 'ssh' not found in the PATH.\n`);
            return;
        }
        // Arrange
        yield setup(removeAuth_removesSshCommand);
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        yield authHelper.configureAuth();
        let gitConfigContent = (yield fs.promises.readFile(localGitConfigPath)).toString();
        expect(gitConfigContent.indexOf('core.sshCommand')).toBeGreaterThanOrEqual(0); // sanity check
        const actualKeyPath = yield getActualSshKeyPath();
        expect(actualKeyPath).toBeTruthy();
        yield fs.promises.stat(actualKeyPath);
        const actualKnownHostsPath = yield getActualSshKnownHostsPath();
        expect(actualKnownHostsPath).toBeTruthy();
        yield fs.promises.stat(actualKnownHostsPath);
        // Act
        yield authHelper.removeAuth();
        // Assert git config
        gitConfigContent = (yield fs.promises.readFile(localGitConfigPath)).toString();
        expect(gitConfigContent.indexOf('core.sshCommand')).toBeLessThan(0);
        // Assert SSH key file
        try {
            yield fs.promises.stat(actualKeyPath);
            throw new Error('SSH key should have been deleted');
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
        // Assert known hosts file
        try {
            yield fs.promises.stat(actualKnownHostsPath);
            throw new Error('SSH known hosts should have been deleted');
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }));
    const removeAuth_removesToken = 'removeAuth removes token';
    it(removeAuth_removesToken, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removeAuth_removesToken);
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        yield authHelper.configureAuth();
        let gitConfigContent = (yield fs.promises.readFile(localGitConfigPath)).toString();
        expect(gitConfigContent.indexOf('http.')).toBeGreaterThanOrEqual(0); // sanity check
        // Act
        yield authHelper.removeAuth();
        // Assert git config
        gitConfigContent = (yield fs.promises.readFile(localGitConfigPath)).toString();
        expect(gitConfigContent.indexOf('http.')).toBeLessThan(0);
    }));
    const removeGlobalAuth_removesOverride = 'removeGlobalAuth removes override';
    it(removeGlobalAuth_removesOverride, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removeGlobalAuth_removesOverride);
        const authHelper = gitAuthHelper.createAuthHelper(git, settings);
        yield authHelper.configureAuth();
        yield authHelper.configureGlobalAuth();
        const homeOverride = git.env['HOME']; // Sanity check
        expect(homeOverride).toBeTruthy();
        yield fs.promises.stat(path.join(git.env['HOME'], '.gitconfig'));
        // Act
        yield authHelper.removeGlobalAuth();
        // Assert
        expect(git.env['HOME']).toBeUndefined();
        try {
            yield fs.promises.stat(homeOverride);
            throw new Error(`Should have been deleted '${homeOverride}'`);
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }));
});
function setup(testName) {
    return __awaiter(this, void 0, void 0, function* () {
        testName = testName.replace(/[^a-zA-Z0-9_]+/g, '-');
        // Directories
        workspace = path.join(testWorkspace, testName, 'workspace');
        runnerTemp = path.join(testWorkspace, testName, 'runner-temp');
        tempHomedir = path.join(testWorkspace, testName, 'home-dir');
        yield fs.promises.mkdir(workspace, { recursive: true });
        yield fs.promises.mkdir(runnerTemp, { recursive: true });
        yield fs.promises.mkdir(tempHomedir, { recursive: true });
        process.env['RUNNER_TEMP'] = runnerTemp;
        process.env['HOME'] = tempHomedir;
        // Create git config
        globalGitConfigPath = path.join(tempHomedir, '.gitconfig');
        yield fs.promises.writeFile(globalGitConfigPath, '');
        localGitConfigPath = path.join(workspace, '.git', 'config');
        yield fs.promises.mkdir(path.dirname(localGitConfigPath), { recursive: true });
        yield fs.promises.writeFile(localGitConfigPath, '');
        git = {
            branchDelete: jest.fn(),
            branchExists: jest.fn(),
            branchList: jest.fn(),
            checkout: jest.fn(),
            checkoutDetach: jest.fn(),
            config: jest.fn((key, value, globalConfig) => __awaiter(this, void 0, void 0, function* () {
                const configPath = globalConfig
                    ? path.join(git.env['HOME'] || tempHomedir, '.gitconfig')
                    : localGitConfigPath;
                yield fs.promises.appendFile(configPath, `\n${key} ${value}`);
            })),
            configExists: jest.fn((key, globalConfig) => __awaiter(this, void 0, void 0, function* () {
                const configPath = globalConfig
                    ? path.join(git.env['HOME'] || tempHomedir, '.gitconfig')
                    : localGitConfigPath;
                const content = yield fs.promises.readFile(configPath);
                const lines = content
                    .toString()
                    .split('\n')
                    .filter(x => x);
                return lines.some(x => x.startsWith(key));
            })),
            env: {},
            fetch: jest.fn(),
            getDefaultBranch: jest.fn(),
            getWorkingDirectory: jest.fn(() => workspace),
            init: jest.fn(),
            isDetached: jest.fn(),
            lfsFetch: jest.fn(),
            lfsInstall: jest.fn(),
            log1: jest.fn(),
            remoteAdd: jest.fn(),
            removeEnvironmentVariable: jest.fn((name) => delete git.env[name]),
            revParse: jest.fn(),
            setEnvironmentVariable: jest.fn((name, value) => {
                git.env[name] = value;
            }),
            shaExists: jest.fn(),
            submoduleForeach: jest.fn(() => __awaiter(this, void 0, void 0, function* () {
                return '';
            })),
            submoduleSync: jest.fn(),
            submoduleUpdate: jest.fn(),
            tagExists: jest.fn(),
            tryClean: jest.fn(),
            tryConfigUnset: jest.fn((key, globalConfig) => __awaiter(this, void 0, void 0, function* () {
                const configPath = globalConfig
                    ? path.join(git.env['HOME'] || tempHomedir, '.gitconfig')
                    : localGitConfigPath;
                let content = yield fs.promises.readFile(configPath);
                let lines = content
                    .toString()
                    .split('\n')
                    .filter(x => x)
                    .filter(x => !x.startsWith(key));
                yield fs.promises.writeFile(configPath, lines.join('\n'));
                return true;
            })),
            tryDisableAutomaticGarbageCollection: jest.fn(),
            tryGetFetchUrl: jest.fn(),
            tryReset: jest.fn()
        };
        settings = {
            authToken: 'some auth token',
            clean: true,
            commit: '',
            fetchDepth: 1,
            lfs: false,
            submodules: false,
            nestedSubmodules: false,
            persistCredentials: true,
            ref: 'refs/heads/main',
            repositoryName: 'my-repo',
            repositoryOwner: 'my-org',
            repositoryPath: '',
            sshKey: sshPath ? 'some ssh private key' : '',
            sshKnownHosts: '',
            sshStrict: true
        };
    });
}
function getActualSshKeyPath() {
    return __awaiter(this, void 0, void 0, function* () {
        let actualTempFiles = (yield fs.promises.readdir(runnerTemp))
            .sort()
            .map(x => path.join(runnerTemp, x));
        if (actualTempFiles.length === 0) {
            return '';
        }
        expect(actualTempFiles).toHaveLength(2);
        expect(actualTempFiles[0].endsWith('_known_hosts')).toBeFalsy();
        return actualTempFiles[0];
    });
}
function getActualSshKnownHostsPath() {
    return __awaiter(this, void 0, void 0, function* () {
        let actualTempFiles = (yield fs.promises.readdir(runnerTemp))
            .sort()
            .map(x => path.join(runnerTemp, x));
        if (actualTempFiles.length === 0) {
            return '';
        }
        expect(actualTempFiles).toHaveLength(2);
        expect(actualTempFiles[1].endsWith('_known_hosts')).toBeTruthy();
        expect(actualTempFiles[1].startsWith(actualTempFiles[0])).toBeTruthy();
        return actualTempFiles[1];
    });
}
