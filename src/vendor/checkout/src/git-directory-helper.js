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
exports.prepareExistingDirectory = void 0;
const assert = __importStar(require("assert"));
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const fsHelper = __importStar(require("./fs-helper"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
function prepareExistingDirectory(git, repositoryPath, repositoryUrl, clean, ref) {
    return __awaiter(this, void 0, void 0, function* () {
        assert.ok(repositoryPath, 'Expected repositoryPath to be defined');
        assert.ok(repositoryUrl, 'Expected repositoryUrl to be defined');
        // Indicates whether to delete the directory contents
        let remove = false;
        // Check whether using git or REST API
        if (!git) {
            remove = true;
        }
        // Fetch URL does not match
        else if (!fsHelper.directoryExistsSync(path.join(repositoryPath, '.git')) ||
            repositoryUrl !== (yield git.tryGetFetchUrl())) {
            remove = true;
        }
        else {
            // Delete any index.lock and shallow.lock left by a previously canceled run or crashed git process
            const lockPaths = [
                path.join(repositoryPath, '.git', 'index.lock'),
                path.join(repositoryPath, '.git', 'shallow.lock')
            ];
            for (const lockPath of lockPaths) {
                try {
                    yield io.rmRF(lockPath);
                }
                catch (error) {
                    core.debug(`Unable to delete '${lockPath}'. ${error.message}`);
                }
            }
            try {
                core.startGroup('Removing previously created refs, to avoid conflicts');
                // Checkout detached HEAD
                if (!(yield git.isDetached())) {
                    yield git.checkoutDetach();
                }
                // Remove all refs/heads/*
                let branches = yield git.branchList(false);
                for (const branch of branches) {
                    yield git.branchDelete(false, branch);
                }
                // Remove any conflicting refs/remotes/origin/*
                // Example 1: Consider ref is refs/heads/foo and previously fetched refs/remotes/origin/foo/bar
                // Example 2: Consider ref is refs/heads/foo/bar and previously fetched refs/remotes/origin/foo
                if (ref) {
                    ref = ref.startsWith('refs/') ? ref : `refs/heads/${ref}`;
                    if (ref.startsWith('refs/heads/')) {
                        const upperName1 = ref.toUpperCase().substr('REFS/HEADS/'.length);
                        const upperName1Slash = `${upperName1}/`;
                        branches = yield git.branchList(true);
                        for (const branch of branches) {
                            const upperName2 = branch.substr('origin/'.length).toUpperCase();
                            const upperName2Slash = `${upperName2}/`;
                            if (upperName1.startsWith(upperName2Slash) ||
                                upperName2.startsWith(upperName1Slash)) {
                                yield git.branchDelete(true, branch);
                            }
                        }
                    }
                }
                core.endGroup();
                // Clean
                if (clean) {
                    core.startGroup('Cleaning the repository');
                    if (!(yield git.tryClean())) {
                        core.debug(`The clean command failed. This might be caused by: 1) path too long, 2) permission issue, or 3) file in use. For futher investigation, manually run 'git clean -ffdx' on the directory '${repositoryPath}'.`);
                        remove = true;
                    }
                    else if (!(yield git.tryReset())) {
                        remove = true;
                    }
                    core.endGroup();
                    if (remove) {
                        core.warning(`Unable to clean or reset the repository. The repository will be recreated instead.`);
                    }
                }
            }
            catch (error) {
                core.warning(`Unable to prepare the existing repository. The repository will be recreated instead.`);
                remove = true;
            }
        }
        if (remove) {
            // Delete the contents of the directory. Don't delete the directory itself
            // since it might be the current working directory.
            core.info(`Deleting the contents of '${repositoryPath}'`);
            for (const file of yield fs.promises.readdir(repositoryPath)) {
                yield io.rmRF(path.join(repositoryPath, file));
            }
        }
    });
}
exports.prepareExistingDirectory = prepareExistingDirectory;
