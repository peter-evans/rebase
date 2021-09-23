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
const assert = __importStar(require("assert"));
const core = __importStar(require("@actions/core"));
const fsHelper = __importStar(require("../lib/fs-helper"));
const github = __importStar(require("@actions/github"));
const inputHelper = __importStar(require("../lib/input-helper"));
const path = __importStar(require("path"));
const originalGitHubWorkspace = process.env['GITHUB_WORKSPACE'];
const gitHubWorkspace = path.resolve('/checkout-tests/workspace');
// Inputs for mock @actions/core
let inputs = {};
// Shallow clone original @actions/github context
let originalContext = Object.assign({}, github.context);
describe('input-helper tests', () => {
    beforeAll(() => {
        // Mock getInput
        jest.spyOn(core, 'getInput').mockImplementation((name) => {
            return inputs[name];
        });
        // Mock error/warning/info/debug
        jest.spyOn(core, 'error').mockImplementation(jest.fn());
        jest.spyOn(core, 'warning').mockImplementation(jest.fn());
        jest.spyOn(core, 'info').mockImplementation(jest.fn());
        jest.spyOn(core, 'debug').mockImplementation(jest.fn());
        // Mock github context
        jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
            return {
                owner: 'some-owner',
                repo: 'some-repo'
            };
        });
        github.context.ref = 'refs/heads/some-ref';
        github.context.sha = '1234567890123456789012345678901234567890';
        // Mock ./fs-helper directoryExistsSync()
        jest
            .spyOn(fsHelper, 'directoryExistsSync')
            .mockImplementation((path) => path == gitHubWorkspace);
        // GitHub workspace
        process.env['GITHUB_WORKSPACE'] = gitHubWorkspace;
    });
    beforeEach(() => {
        // Reset inputs
        inputs = {};
    });
    afterAll(() => {
        // Restore GitHub workspace
        delete process.env['GITHUB_WORKSPACE'];
        if (originalGitHubWorkspace) {
            process.env['GITHUB_WORKSPACE'] = originalGitHubWorkspace;
        }
        // Restore @actions/github context
        github.context.ref = originalContext.ref;
        github.context.sha = originalContext.sha;
        // Restore
        jest.restoreAllMocks();
    });
    it('sets defaults', () => {
        const settings = inputHelper.getInputs();
        expect(settings).toBeTruthy();
        expect(settings.authToken).toBeFalsy();
        expect(settings.clean).toBe(true);
        expect(settings.commit).toBeTruthy();
        expect(settings.commit).toBe('1234567890123456789012345678901234567890');
        expect(settings.fetchDepth).toBe(1);
        expect(settings.lfs).toBe(false);
        expect(settings.ref).toBe('refs/heads/some-ref');
        expect(settings.repositoryName).toBe('some-repo');
        expect(settings.repositoryOwner).toBe('some-owner');
        expect(settings.repositoryPath).toBe(gitHubWorkspace);
    });
    it('qualifies ref', () => {
        let originalRef = github.context.ref;
        try {
            github.context.ref = 'some-unqualified-ref';
            const settings = inputHelper.getInputs();
            expect(settings).toBeTruthy();
            expect(settings.commit).toBe('1234567890123456789012345678901234567890');
            expect(settings.ref).toBe('refs/heads/some-unqualified-ref');
        }
        finally {
            github.context.ref = originalRef;
        }
    });
    it('requires qualified repo', () => {
        inputs.repository = 'some-unqualified-repo';
        assert.throws(() => {
            inputHelper.getInputs();
        }, /Invalid repository 'some-unqualified-repo'/);
    });
    it('roots path', () => {
        inputs.path = 'some-directory/some-subdirectory';
        const settings = inputHelper.getInputs();
        expect(settings.repositoryPath).toBe(path.join(gitHubWorkspace, 'some-directory', 'some-subdirectory'));
    });
    it('sets ref to empty when explicit sha', () => {
        inputs.ref = '1111111111222222222233333333334444444444';
        const settings = inputHelper.getInputs();
        expect(settings.ref).toBeFalsy();
        expect(settings.commit).toBe('1111111111222222222233333333334444444444');
    });
    it('sets sha to empty when explicit ref', () => {
        inputs.ref = 'refs/heads/some-other-ref';
        const settings = inputHelper.getInputs();
        expect(settings.ref).toBe('refs/heads/some-other-ref');
        expect(settings.commit).toBeFalsy();
    });
});
