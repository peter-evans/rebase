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
const assert = __importStar(require("assert"));
const refHelper = __importStar(require("../lib/ref-helper"));
const commit = '1234567890123456789012345678901234567890';
let git;
describe('ref-helper tests', () => {
    beforeEach(() => {
        git = {};
    });
    it('getCheckoutInfo requires git', () => __awaiter(void 0, void 0, void 0, function* () {
        const git = null;
        try {
            yield refHelper.getCheckoutInfo(git, 'refs/heads/my/branch', commit);
            throw new Error('Should not reach here');
        }
        catch (err) {
            expect(err.message).toBe('Arg git cannot be empty');
        }
    }));
    it('getCheckoutInfo requires ref or commit', () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield refHelper.getCheckoutInfo(git, '', '');
            throw new Error('Should not reach here');
        }
        catch (err) {
            expect(err.message).toBe('Args ref and commit cannot both be empty');
        }
    }));
    it('getCheckoutInfo sha only', () => __awaiter(void 0, void 0, void 0, function* () {
        const checkoutInfo = yield refHelper.getCheckoutInfo(git, '', commit);
        expect(checkoutInfo.ref).toBe(commit);
        expect(checkoutInfo.startPoint).toBeFalsy();
    }));
    it('getCheckoutInfo refs/heads/', () => __awaiter(void 0, void 0, void 0, function* () {
        const checkoutInfo = yield refHelper.getCheckoutInfo(git, 'refs/heads/my/branch', commit);
        expect(checkoutInfo.ref).toBe('my/branch');
        expect(checkoutInfo.startPoint).toBe('refs/remotes/origin/my/branch');
    }));
    it('getCheckoutInfo refs/pull/', () => __awaiter(void 0, void 0, void 0, function* () {
        const checkoutInfo = yield refHelper.getCheckoutInfo(git, 'refs/pull/123/merge', commit);
        expect(checkoutInfo.ref).toBe('refs/remotes/pull/123/merge');
        expect(checkoutInfo.startPoint).toBeFalsy();
    }));
    it('getCheckoutInfo refs/tags/', () => __awaiter(void 0, void 0, void 0, function* () {
        const checkoutInfo = yield refHelper.getCheckoutInfo(git, 'refs/tags/my-tag', commit);
        expect(checkoutInfo.ref).toBe('refs/tags/my-tag');
        expect(checkoutInfo.startPoint).toBeFalsy();
    }));
    it('getCheckoutInfo unqualified branch only', () => __awaiter(void 0, void 0, void 0, function* () {
        git.branchExists = jest.fn((remote, pattern) => __awaiter(void 0, void 0, void 0, function* () {
            return true;
        }));
        const checkoutInfo = yield refHelper.getCheckoutInfo(git, 'my/branch', '');
        expect(checkoutInfo.ref).toBe('my/branch');
        expect(checkoutInfo.startPoint).toBe('refs/remotes/origin/my/branch');
    }));
    it('getCheckoutInfo unqualified tag only', () => __awaiter(void 0, void 0, void 0, function* () {
        git.branchExists = jest.fn((remote, pattern) => __awaiter(void 0, void 0, void 0, function* () {
            return false;
        }));
        git.tagExists = jest.fn((pattern) => __awaiter(void 0, void 0, void 0, function* () {
            return true;
        }));
        const checkoutInfo = yield refHelper.getCheckoutInfo(git, 'my-tag', '');
        expect(checkoutInfo.ref).toBe('refs/tags/my-tag');
        expect(checkoutInfo.startPoint).toBeFalsy();
    }));
    it('getCheckoutInfo unqualified ref only, not a branch or tag', () => __awaiter(void 0, void 0, void 0, function* () {
        git.branchExists = jest.fn((remote, pattern) => __awaiter(void 0, void 0, void 0, function* () {
            return false;
        }));
        git.tagExists = jest.fn((pattern) => __awaiter(void 0, void 0, void 0, function* () {
            return false;
        }));
        try {
            yield refHelper.getCheckoutInfo(git, 'my-ref', '');
            throw new Error('Should not reach here');
        }
        catch (err) {
            expect(err.message).toBe("A branch or tag with the name 'my-ref' could not be found");
        }
    }));
    it('getRefSpec requires ref or commit', () => __awaiter(void 0, void 0, void 0, function* () {
        assert.throws(() => refHelper.getRefSpec('', ''), /Args ref and commit cannot both be empty/);
    }));
    it('getRefSpec sha + refs/heads/', () => __awaiter(void 0, void 0, void 0, function* () {
        const refSpec = refHelper.getRefSpec('refs/heads/my/branch', commit);
        expect(refSpec.length).toBe(1);
        expect(refSpec[0]).toBe(`+${commit}:refs/remotes/origin/my/branch`);
    }));
    it('getRefSpec sha + refs/pull/', () => __awaiter(void 0, void 0, void 0, function* () {
        const refSpec = refHelper.getRefSpec('refs/pull/123/merge', commit);
        expect(refSpec.length).toBe(1);
        expect(refSpec[0]).toBe(`+${commit}:refs/remotes/pull/123/merge`);
    }));
    it('getRefSpec sha + refs/tags/', () => __awaiter(void 0, void 0, void 0, function* () {
        const refSpec = refHelper.getRefSpec('refs/tags/my-tag', commit);
        expect(refSpec.length).toBe(1);
        expect(refSpec[0]).toBe(`+${commit}:refs/tags/my-tag`);
    }));
    it('getRefSpec sha only', () => __awaiter(void 0, void 0, void 0, function* () {
        const refSpec = refHelper.getRefSpec('', commit);
        expect(refSpec.length).toBe(1);
        expect(refSpec[0]).toBe(commit);
    }));
    it('getRefSpec unqualified ref only', () => __awaiter(void 0, void 0, void 0, function* () {
        const refSpec = refHelper.getRefSpec('my-ref', '');
        expect(refSpec.length).toBe(2);
        expect(refSpec[0]).toBe('+refs/heads/my-ref*:refs/remotes/origin/my-ref*');
        expect(refSpec[1]).toBe('+refs/tags/my-ref*:refs/tags/my-ref*');
    }));
    it('getRefSpec refs/heads/ only', () => __awaiter(void 0, void 0, void 0, function* () {
        const refSpec = refHelper.getRefSpec('refs/heads/my/branch', '');
        expect(refSpec.length).toBe(1);
        expect(refSpec[0]).toBe('+refs/heads/my/branch:refs/remotes/origin/my/branch');
    }));
    it('getRefSpec refs/pull/ only', () => __awaiter(void 0, void 0, void 0, function* () {
        const refSpec = refHelper.getRefSpec('refs/pull/123/merge', '');
        expect(refSpec.length).toBe(1);
        expect(refSpec[0]).toBe('+refs/pull/123/merge:refs/remotes/pull/123/merge');
    }));
    it('getRefSpec refs/tags/ only', () => __awaiter(void 0, void 0, void 0, function* () {
        const refSpec = refHelper.getRefSpec('refs/tags/my-tag', '');
        expect(refSpec.length).toBe(1);
        expect(refSpec[0]).toBe('+refs/tags/my-tag:refs/tags/my-tag');
    }));
});
