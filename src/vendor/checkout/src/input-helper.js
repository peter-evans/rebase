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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInputs = void 0;
const core = __importStar(require("@actions/core"));
const fsHelper = __importStar(require("./fs-helper"));
const github = __importStar(require("@actions/github"));
const path = __importStar(require("path"));
function getInputs() {
    const result = {};
    // GitHub workspace
    let githubWorkspacePath = process.env['GITHUB_WORKSPACE'];
    if (!githubWorkspacePath) {
        throw new Error('GITHUB_WORKSPACE not defined');
    }
    githubWorkspacePath = path.resolve(githubWorkspacePath);
    core.debug(`GITHUB_WORKSPACE = '${githubWorkspacePath}'`);
    fsHelper.directoryExistsSync(githubWorkspacePath, true);
    // Qualified repository
    const qualifiedRepository = core.getInput('repository') ||
        `${github.context.repo.owner}/${github.context.repo.repo}`;
    core.debug(`qualified repository = '${qualifiedRepository}'`);
    const splitRepository = qualifiedRepository.split('/');
    if (splitRepository.length !== 2 ||
        !splitRepository[0] ||
        !splitRepository[1]) {
        throw new Error(`Invalid repository '${qualifiedRepository}'. Expected format {owner}/{repo}.`);
    }
    result.repositoryOwner = splitRepository[0];
    result.repositoryName = splitRepository[1];
    // Repository path
    result.repositoryPath = core.getInput('path') || '.';
    result.repositoryPath = path.resolve(githubWorkspacePath, result.repositoryPath);
    if (!(result.repositoryPath + path.sep).startsWith(githubWorkspacePath + path.sep)) {
        throw new Error(`Repository path '${result.repositoryPath}' is not under '${githubWorkspacePath}'`);
    }
    // Workflow repository?
    const isWorkflowRepository = qualifiedRepository.toUpperCase() ===
        `${github.context.repo.owner}/${github.context.repo.repo}`.toUpperCase();
    // Source branch, source version
    result.ref = core.getInput('ref');
    if (!result.ref) {
        if (isWorkflowRepository) {
            result.ref = github.context.ref;
            result.commit = github.context.sha;
            // Some events have an unqualifed ref. For example when a PR is merged (pull_request closed event),
            // the ref is unqualifed like "main" instead of "refs/heads/main".
            if (result.commit && result.ref && !result.ref.startsWith('refs/')) {
                result.ref = `refs/heads/${result.ref}`;
            }
        }
    }
    // SHA?
    else if (result.ref.match(/^[0-9a-fA-F]{40}$/)) {
        result.commit = result.ref;
        result.ref = '';
    }
    core.debug(`ref = '${result.ref}'`);
    core.debug(`commit = '${result.commit}'`);
    // Clean
    result.clean = (core.getInput('clean') || 'true').toUpperCase() === 'TRUE';
    core.debug(`clean = ${result.clean}`);
    // Fetch depth
    result.fetchDepth = Math.floor(Number(core.getInput('fetch-depth') || '1'));
    if (isNaN(result.fetchDepth) || result.fetchDepth < 0) {
        result.fetchDepth = 0;
    }
    core.debug(`fetch depth = ${result.fetchDepth}`);
    // LFS
    result.lfs = (core.getInput('lfs') || 'false').toUpperCase() === 'TRUE';
    core.debug(`lfs = ${result.lfs}`);
    // Submodules
    result.submodules = false;
    result.nestedSubmodules = false;
    const submodulesString = (core.getInput('submodules') || '').toUpperCase();
    if (submodulesString == 'RECURSIVE') {
        result.submodules = true;
        result.nestedSubmodules = true;
    }
    else if (submodulesString == 'TRUE') {
        result.submodules = true;
    }
    core.debug(`submodules = ${result.submodules}`);
    core.debug(`recursive submodules = ${result.nestedSubmodules}`);
    // Auth token
    result.authToken = core.getInput('token', { required: true });
    // SSH
    result.sshKey = core.getInput('ssh-key');
    result.sshKnownHosts = core.getInput('ssh-known-hosts');
    result.sshStrict =
        (core.getInput('ssh-strict') || 'true').toUpperCase() === 'TRUE';
    // Persist credentials
    result.persistCredentials =
        (core.getInput('persist-credentials') || 'false').toUpperCase() === 'TRUE';
    return result;
}
exports.getInputs = getInputs;
