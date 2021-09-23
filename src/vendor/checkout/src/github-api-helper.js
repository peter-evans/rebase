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
exports.getDefaultBranch = exports.downloadRepository = void 0;
const assert = __importStar(require("assert"));
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const github = __importStar(require("@actions/github"));
const io = __importStar(require("@actions/io"));
const path = __importStar(require("path"));
const retryHelper = __importStar(require("./retry-helper"));
const toolCache = __importStar(require("@actions/tool-cache"));
const v4_1 = __importDefault(require("uuid/v4"));
const IS_WINDOWS = process.platform === 'win32';
function downloadRepository(authToken, owner, repo, ref, commit, repositoryPath) {
    return __awaiter(this, void 0, void 0, function* () {
        // Determine the default branch
        if (!ref && !commit) {
            core.info('Determining the default branch');
            ref = yield getDefaultBranch(authToken, owner, repo);
        }
        // Download the archive
        let archiveData = yield retryHelper.execute(() => __awaiter(this, void 0, void 0, function* () {
            core.info('Downloading the archive');
            return yield downloadArchive(authToken, owner, repo, ref, commit);
        }));
        // Write archive to disk
        core.info('Writing archive to disk');
        const uniqueId = v4_1.default();
        const archivePath = path.join(repositoryPath, `${uniqueId}.tar.gz`);
        yield fs.promises.writeFile(archivePath, archiveData);
        archiveData = Buffer.from(''); // Free memory
        // Extract archive
        core.info('Extracting the archive');
        const extractPath = path.join(repositoryPath, uniqueId);
        yield io.mkdirP(extractPath);
        if (IS_WINDOWS) {
            yield toolCache.extractZip(archivePath, extractPath);
        }
        else {
            yield toolCache.extractTar(archivePath, extractPath);
        }
        yield io.rmRF(archivePath);
        // Determine the path of the repository content. The archive contains
        // a top-level folder and the repository content is inside.
        const archiveFileNames = yield fs.promises.readdir(extractPath);
        assert.ok(archiveFileNames.length == 1, 'Expected exactly one directory inside archive');
        const archiveVersion = archiveFileNames[0]; // The top-level folder name includes the short SHA
        core.info(`Resolved version ${archiveVersion}`);
        const tempRepositoryPath = path.join(extractPath, archiveVersion);
        // Move the files
        for (const fileName of yield fs.promises.readdir(tempRepositoryPath)) {
            const sourcePath = path.join(tempRepositoryPath, fileName);
            const targetPath = path.join(repositoryPath, fileName);
            if (IS_WINDOWS) {
                yield io.cp(sourcePath, targetPath, { recursive: true }); // Copy on Windows (Windows Defender may have a lock)
            }
            else {
                yield io.mv(sourcePath, targetPath);
            }
        }
        yield io.rmRF(extractPath);
    });
}
exports.downloadRepository = downloadRepository;
/**
 * Looks up the default branch name
 */
function getDefaultBranch(authToken, owner, repo) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield retryHelper.execute(() => __awaiter(this, void 0, void 0, function* () {
            core.info('Retrieving the default branch name');
            const octokit = new github.GitHub(authToken);
            let result;
            try {
                // Get the default branch from the repo info
                const response = yield octokit.repos.get({ owner, repo });
                result = response.data.default_branch;
                assert.ok(result, 'default_branch cannot be empty');
            }
            catch (err) {
                // Handle .wiki repo
                if (err['status'] === 404 && repo.toUpperCase().endsWith('.WIKI')) {
                    result = 'master';
                }
                // Otherwise error
                else {
                    throw err;
                }
            }
            // Print the default branch
            core.info(`Default branch '${result}'`);
            // Prefix with 'refs/heads'
            if (!result.startsWith('refs/')) {
                result = `refs/heads/${result}`;
            }
            return result;
        }));
    });
}
exports.getDefaultBranch = getDefaultBranch;
function downloadArchive(authToken, owner, repo, ref, commit) {
    return __awaiter(this, void 0, void 0, function* () {
        const octokit = new github.GitHub(authToken);
        const params = {
            owner: owner,
            repo: repo,
            archive_format: IS_WINDOWS ? 'zipball' : 'tarball',
            ref: commit || ref
        };
        const response = yield octokit.repos.getArchiveLink(params);
        if (response.status != 200) {
            throw new Error(`Unexpected response from GitHub API. Status: ${response.status}, Data: ${response.data}`);
        }
        return Buffer.from(response.data); // response.data is ArrayBuffer
    });
}
