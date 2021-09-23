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
exports.checkCommitInfo = exports.testRef = exports.getRefSpec = exports.getRefSpecForAllHistory = exports.getCheckoutInfo = exports.tagsRefSpec = void 0;
const url_1 = require("url");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
exports.tagsRefSpec = '+refs/tags/*:refs/tags/*';
function getCheckoutInfo(git, ref, commit) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!git) {
            throw new Error('Arg git cannot be empty');
        }
        if (!ref && !commit) {
            throw new Error('Args ref and commit cannot both be empty');
        }
        const result = {};
        const upperRef = (ref || '').toUpperCase();
        // SHA only
        if (!ref) {
            result.ref = commit;
        }
        // refs/heads/
        else if (upperRef.startsWith('REFS/HEADS/')) {
            const branch = ref.substring('refs/heads/'.length);
            result.ref = branch;
            result.startPoint = `refs/remotes/origin/${branch}`;
        }
        // refs/pull/
        else if (upperRef.startsWith('REFS/PULL/')) {
            const branch = ref.substring('refs/pull/'.length);
            result.ref = `refs/remotes/pull/${branch}`;
        }
        // refs/tags/
        else if (upperRef.startsWith('REFS/')) {
            result.ref = ref;
        }
        // Unqualified ref, check for a matching branch or tag
        else {
            if (yield git.branchExists(true, `origin/${ref}`)) {
                result.ref = ref;
                result.startPoint = `refs/remotes/origin/${ref}`;
            }
            else if (yield git.tagExists(`${ref}`)) {
                result.ref = `refs/tags/${ref}`;
            }
            else {
                throw new Error(`A branch or tag with the name '${ref}' could not be found`);
            }
        }
        return result;
    });
}
exports.getCheckoutInfo = getCheckoutInfo;
function getRefSpecForAllHistory(ref, commit) {
    const result = ['+refs/heads/*:refs/remotes/origin/*', exports.tagsRefSpec];
    if (ref && ref.toUpperCase().startsWith('REFS/PULL/')) {
        const branch = ref.substring('refs/pull/'.length);
        result.push(`+${commit || ref}:refs/remotes/pull/${branch}`);
    }
    return result;
}
exports.getRefSpecForAllHistory = getRefSpecForAllHistory;
function getRefSpec(ref, commit) {
    if (!ref && !commit) {
        throw new Error('Args ref and commit cannot both be empty');
    }
    const upperRef = (ref || '').toUpperCase();
    // SHA
    if (commit) {
        // refs/heads
        if (upperRef.startsWith('REFS/HEADS/')) {
            const branch = ref.substring('refs/heads/'.length);
            return [`+${commit}:refs/remotes/origin/${branch}`];
        }
        // refs/pull/
        else if (upperRef.startsWith('REFS/PULL/')) {
            const branch = ref.substring('refs/pull/'.length);
            return [`+${commit}:refs/remotes/pull/${branch}`];
        }
        // refs/tags/
        else if (upperRef.startsWith('REFS/TAGS/')) {
            return [`+${commit}:${ref}`];
        }
        // Otherwise no destination ref
        else {
            return [commit];
        }
    }
    // Unqualified ref, check for a matching branch or tag
    else if (!upperRef.startsWith('REFS/')) {
        return [
            `+refs/heads/${ref}*:refs/remotes/origin/${ref}*`,
            `+refs/tags/${ref}*:refs/tags/${ref}*`
        ];
    }
    // refs/heads/
    else if (upperRef.startsWith('REFS/HEADS/')) {
        const branch = ref.substring('refs/heads/'.length);
        return [`+${ref}:refs/remotes/origin/${branch}`];
    }
    // refs/pull/
    else if (upperRef.startsWith('REFS/PULL/')) {
        const branch = ref.substring('refs/pull/'.length);
        return [`+${ref}:refs/remotes/pull/${branch}`];
    }
    // refs/tags/
    else {
        return [`+${ref}:${ref}`];
    }
}
exports.getRefSpec = getRefSpec;
/**
 * Tests whether the initial fetch created the ref at the expected commit
 */
function testRef(git, ref, commit) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!git) {
            throw new Error('Arg git cannot be empty');
        }
        if (!ref && !commit) {
            throw new Error('Args ref and commit cannot both be empty');
        }
        // No SHA? Nothing to test
        if (!commit) {
            return true;
        }
        // SHA only?
        else if (!ref) {
            return yield git.shaExists(commit);
        }
        const upperRef = ref.toUpperCase();
        // refs/heads/
        if (upperRef.startsWith('REFS/HEADS/')) {
            const branch = ref.substring('refs/heads/'.length);
            return ((yield git.branchExists(true, `origin/${branch}`)) &&
                commit === (yield git.revParse(`refs/remotes/origin/${branch}`)));
        }
        // refs/pull/
        else if (upperRef.startsWith('REFS/PULL/')) {
            // Assume matches because fetched using the commit
            return true;
        }
        // refs/tags/
        else if (upperRef.startsWith('REFS/TAGS/')) {
            const tagName = ref.substring('refs/tags/'.length);
            return ((yield git.tagExists(tagName)) && commit === (yield git.revParse(ref)));
        }
        // Unexpected
        else {
            core.debug(`Unexpected ref format '${ref}' when testing ref info`);
            return true;
        }
    });
}
exports.testRef = testRef;
function checkCommitInfo(token, commitInfo, repositoryOwner, repositoryName, ref, commit) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // GHES?
            if (isGhes()) {
                return;
            }
            // Auth token?
            if (!token) {
                return;
            }
            // Public PR synchronize, for workflow repo?
            if (fromPayload('repository.private') !== false ||
                github.context.eventName !== 'pull_request' ||
                fromPayload('action') !== 'synchronize' ||
                repositoryOwner !== github.context.repo.owner ||
                repositoryName !== github.context.repo.repo ||
                ref !== github.context.ref ||
                !ref.startsWith('refs/pull/') ||
                commit !== github.context.sha) {
                return;
            }
            // Head SHA
            const expectedHeadSha = fromPayload('after');
            if (!expectedHeadSha) {
                core.debug('Unable to determine head sha');
                return;
            }
            // Base SHA
            const expectedBaseSha = fromPayload('pull_request.base.sha');
            if (!expectedBaseSha) {
                core.debug('Unable to determine base sha');
                return;
            }
            // Expected message?
            const expectedMessage = `Merge ${expectedHeadSha} into ${expectedBaseSha}`;
            if (commitInfo.indexOf(expectedMessage) >= 0) {
                return;
            }
            // Extract details from message
            const match = commitInfo.match(/Merge ([0-9a-f]{40}) into ([0-9a-f]{40})/);
            if (!match) {
                core.debug('Unexpected message format');
                return;
            }
            // Post telemetry
            const actualHeadSha = match[1];
            if (actualHeadSha !== expectedHeadSha) {
                core.debug(`Expected head sha ${expectedHeadSha}; actual head sha ${actualHeadSha}`);
                const octokit = new github.GitHub(token, {
                    userAgent: `actions-checkout-tracepoint/1.0 (code=STALE_MERGE;owner=${repositoryOwner};repo=${repositoryName};pr=${fromPayload('number')};run_id=${process.env['GITHUB_RUN_ID']};expected_head_sha=${expectedHeadSha};actual_head_sha=${actualHeadSha})`
                });
                yield octokit.repos.get({ owner: repositoryOwner, repo: repositoryName });
            }
        }
        catch (err) {
            core.debug(`Error when validating commit info: ${err.stack}`);
        }
    });
}
exports.checkCommitInfo = checkCommitInfo;
function fromPayload(path) {
    return select(github.context.payload, path);
}
function select(obj, path) {
    if (!obj) {
        return undefined;
    }
    const i = path.indexOf('.');
    if (i < 0) {
        return obj[path];
    }
    const key = path.substr(0, i);
    return select(obj[key], path.substr(i + 1));
}
function isGhes() {
    const ghUrl = new url_1.URL(process.env['GITHUB_SERVER_URL'] || 'https://github.com');
    return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}
