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
const gitDirectoryHelper = __importStar(require("../lib/git-directory-helper"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const testWorkspace = path.join(__dirname, '_temp', 'git-directory-helper');
let repositoryPath;
let repositoryUrl;
let clean;
let ref;
let git;
describe('git-directory-helper tests', () => {
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clear test workspace
        yield io.rmRF(testWorkspace);
    }));
    beforeEach(() => {
        // Mock error/warning/info/debug
        jest.spyOn(core, 'error').mockImplementation(jest.fn());
        jest.spyOn(core, 'warning').mockImplementation(jest.fn());
        jest.spyOn(core, 'info').mockImplementation(jest.fn());
        jest.spyOn(core, 'debug').mockImplementation(jest.fn());
    });
    afterEach(() => {
        // Unregister mocks
        jest.restoreAllMocks();
    });
    const cleansWhenCleanTrue = 'cleans when clean true';
    it(cleansWhenCleanTrue, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(cleansWhenCleanTrue);
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files.sort()).toEqual(['.git', 'my-file']);
        expect(git.tryClean).toHaveBeenCalled();
        expect(git.tryReset).toHaveBeenCalled();
        expect(core.warning).not.toHaveBeenCalled();
    }));
    const checkoutDetachWhenNotDetached = 'checkout detach when not detached';
    it(checkoutDetachWhenNotDetached, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(checkoutDetachWhenNotDetached);
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files.sort()).toEqual(['.git', 'my-file']);
        expect(git.checkoutDetach).toHaveBeenCalled();
    }));
    const doesNotCheckoutDetachWhenNotAlreadyDetached = 'does not checkout detach when already detached';
    it(doesNotCheckoutDetachWhenNotAlreadyDetached, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(doesNotCheckoutDetachWhenNotAlreadyDetached);
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        const mockIsDetached = git.isDetached;
        mockIsDetached.mockImplementation(() => __awaiter(void 0, void 0, void 0, function* () {
            return true;
        }));
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files.sort()).toEqual(['.git', 'my-file']);
        expect(git.checkoutDetach).not.toHaveBeenCalled();
    }));
    const doesNotCleanWhenCleanFalse = 'does not clean when clean false';
    it(doesNotCleanWhenCleanFalse, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(doesNotCleanWhenCleanFalse);
        clean = false;
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files.sort()).toEqual(['.git', 'my-file']);
        expect(git.isDetached).toHaveBeenCalled();
        expect(git.branchList).toHaveBeenCalled();
        expect(core.warning).not.toHaveBeenCalled();
        expect(git.tryClean).not.toHaveBeenCalled();
        expect(git.tryReset).not.toHaveBeenCalled();
    }));
    const removesContentsWhenCleanFails = 'removes contents when clean fails';
    it(removesContentsWhenCleanFails, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removesContentsWhenCleanFails);
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        let mockTryClean = git.tryClean;
        mockTryClean.mockImplementation(() => __awaiter(void 0, void 0, void 0, function* () {
            return false;
        }));
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files).toHaveLength(0);
        expect(git.tryClean).toHaveBeenCalled();
        expect(core.warning).toHaveBeenCalled();
        expect(git.tryReset).not.toHaveBeenCalled();
    }));
    const removesContentsWhenDifferentRepositoryUrl = 'removes contents when different repository url';
    it(removesContentsWhenDifferentRepositoryUrl, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removesContentsWhenDifferentRepositoryUrl);
        clean = false;
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        const differentRepositoryUrl = 'https://github.com/my-different-org/my-different-repo';
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, differentRepositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files).toHaveLength(0);
        expect(core.warning).not.toHaveBeenCalled();
        expect(git.isDetached).not.toHaveBeenCalled();
    }));
    const removesContentsWhenNoGitDirectory = 'removes contents when no git directory';
    it(removesContentsWhenNoGitDirectory, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removesContentsWhenNoGitDirectory);
        clean = false;
        yield io.rmRF(path.join(repositoryPath, '.git'));
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files).toHaveLength(0);
        expect(core.warning).not.toHaveBeenCalled();
        expect(git.isDetached).not.toHaveBeenCalled();
    }));
    const removesContentsWhenResetFails = 'removes contents when reset fails';
    it(removesContentsWhenResetFails, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removesContentsWhenResetFails);
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        let mockTryReset = git.tryReset;
        mockTryReset.mockImplementation(() => __awaiter(void 0, void 0, void 0, function* () {
            return false;
        }));
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files).toHaveLength(0);
        expect(git.tryClean).toHaveBeenCalled();
        expect(git.tryReset).toHaveBeenCalled();
        expect(core.warning).toHaveBeenCalled();
    }));
    const removesContentsWhenUndefinedGitCommandManager = 'removes contents when undefined git command manager';
    it(removesContentsWhenUndefinedGitCommandManager, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removesContentsWhenUndefinedGitCommandManager);
        clean = false;
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(undefined, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files).toHaveLength(0);
        expect(core.warning).not.toHaveBeenCalled();
    }));
    const removesLocalBranches = 'removes local branches';
    it(removesLocalBranches, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removesLocalBranches);
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        const mockBranchList = git.branchList;
        mockBranchList.mockImplementation((remote) => __awaiter(void 0, void 0, void 0, function* () {
            return remote ? [] : ['local-branch-1', 'local-branch-2'];
        }));
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files.sort()).toEqual(['.git', 'my-file']);
        expect(git.branchDelete).toHaveBeenCalledWith(false, 'local-branch-1');
        expect(git.branchDelete).toHaveBeenCalledWith(false, 'local-branch-2');
    }));
    const removesLockFiles = 'removes lock files';
    it(removesLockFiles, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removesLockFiles);
        clean = false;
        yield fs.promises.writeFile(path.join(repositoryPath, '.git', 'index.lock'), '');
        yield fs.promises.writeFile(path.join(repositoryPath, '.git', 'shallow.lock'), '');
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        let files = yield fs.promises.readdir(path.join(repositoryPath, '.git'));
        expect(files).toHaveLength(0);
        files = yield fs.promises.readdir(repositoryPath);
        expect(files.sort()).toEqual(['.git', 'my-file']);
        expect(git.isDetached).toHaveBeenCalled();
        expect(git.branchList).toHaveBeenCalled();
        expect(core.warning).not.toHaveBeenCalled();
        expect(git.tryClean).not.toHaveBeenCalled();
        expect(git.tryReset).not.toHaveBeenCalled();
    }));
    const removesAncestorRemoteBranch = 'removes ancestor remote branch';
    it(removesAncestorRemoteBranch, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removesAncestorRemoteBranch);
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        const mockBranchList = git.branchList;
        mockBranchList.mockImplementation((remote) => __awaiter(void 0, void 0, void 0, function* () {
            return remote ? ['origin/remote-branch-1', 'origin/remote-branch-2'] : [];
        }));
        ref = 'remote-branch-1/conflict';
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files.sort()).toEqual(['.git', 'my-file']);
        expect(git.branchDelete).toHaveBeenCalledTimes(1);
        expect(git.branchDelete).toHaveBeenCalledWith(true, 'origin/remote-branch-1');
    }));
    const removesDescendantRemoteBranches = 'removes descendant remote branch';
    it(removesDescendantRemoteBranches, () => __awaiter(void 0, void 0, void 0, function* () {
        // Arrange
        yield setup(removesDescendantRemoteBranches);
        yield fs.promises.writeFile(path.join(repositoryPath, 'my-file'), '');
        const mockBranchList = git.branchList;
        mockBranchList.mockImplementation((remote) => __awaiter(void 0, void 0, void 0, function* () {
            return remote
                ? ['origin/remote-branch-1/conflict', 'origin/remote-branch-2']
                : [];
        }));
        ref = 'remote-branch-1';
        // Act
        yield gitDirectoryHelper.prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref);
        // Assert
        const files = yield fs.promises.readdir(repositoryPath);
        expect(files.sort()).toEqual(['.git', 'my-file']);
        expect(git.branchDelete).toHaveBeenCalledTimes(1);
        expect(git.branchDelete).toHaveBeenCalledWith(true, 'origin/remote-branch-1/conflict');
    }));
});
function setup(testName) {
    return __awaiter(this, void 0, void 0, function* () {
        testName = testName.replace(/[^a-zA-Z0-9_]+/g, '-');
        // Repository directory
        repositoryPath = path.join(testWorkspace, testName);
        yield fs.promises.mkdir(path.join(repositoryPath, '.git'), { recursive: true });
        // Repository URL
        repositoryUrl = 'https://github.com/my-org/my-repo';
        // Clean
        clean = true;
        // Ref
        ref = '';
        // Git command manager
        git = {
            branchDelete: jest.fn(),
            branchExists: jest.fn(),
            branchList: jest.fn(() => __awaiter(this, void 0, void 0, function* () {
                return [];
            })),
            checkout: jest.fn(),
            checkoutDetach: jest.fn(),
            config: jest.fn(),
            configExists: jest.fn(),
            fetch: jest.fn(),
            getDefaultBranch: jest.fn(),
            getWorkingDirectory: jest.fn(() => repositoryPath),
            init: jest.fn(),
            isDetached: jest.fn(),
            lfsFetch: jest.fn(),
            lfsInstall: jest.fn(),
            log1: jest.fn(),
            remoteAdd: jest.fn(),
            removeEnvironmentVariable: jest.fn(),
            revParse: jest.fn(),
            setEnvironmentVariable: jest.fn(),
            shaExists: jest.fn(),
            submoduleForeach: jest.fn(),
            submoduleSync: jest.fn(),
            submoduleUpdate: jest.fn(),
            tagExists: jest.fn(),
            tryClean: jest.fn(() => __awaiter(this, void 0, void 0, function* () {
                return true;
            })),
            tryConfigUnset: jest.fn(),
            tryDisableAutomaticGarbageCollection: jest.fn(),
            tryGetFetchUrl: jest.fn(() => __awaiter(this, void 0, void 0, function* () {
                // Sanity check - this function shouldn't be called when the .git directory doesn't exist
                yield fs.promises.stat(path.join(repositoryPath, '.git'));
                return repositoryUrl;
            })),
            tryReset: jest.fn(() => __awaiter(this, void 0, void 0, function* () {
                return true;
            }))
        };
    });
}
