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
const retry_helper_1 = require("../lib/retry-helper");
let info;
let retryHelper;
describe('retry-helper tests', () => {
    beforeAll(() => {
        // Mock @actions/core info()
        jest.spyOn(core, 'info').mockImplementation((message) => {
            info.push(message);
        });
        retryHelper = new retry_helper_1.RetryHelper(3, 0, 0);
    });
    beforeEach(() => {
        // Reset info
        info = [];
    });
    afterAll(() => {
        // Restore
        jest.restoreAllMocks();
    });
    it('first attempt succeeds', () => __awaiter(void 0, void 0, void 0, function* () {
        const actual = yield retryHelper.execute(() => __awaiter(void 0, void 0, void 0, function* () {
            return 'some result';
        }));
        expect(actual).toBe('some result');
        expect(info).toHaveLength(0);
    }));
    it('second attempt succeeds', () => __awaiter(void 0, void 0, void 0, function* () {
        let attempts = 0;
        const actual = yield retryHelper.execute(() => {
            if (++attempts == 1) {
                throw new Error('some error');
            }
            return Promise.resolve('some result');
        });
        expect(attempts).toBe(2);
        expect(actual).toBe('some result');
        expect(info).toHaveLength(2);
        expect(info[0]).toBe('some error');
        expect(info[1]).toMatch(/Waiting .+ seconds before trying again/);
    }));
    it('third attempt succeeds', () => __awaiter(void 0, void 0, void 0, function* () {
        let attempts = 0;
        const actual = yield retryHelper.execute(() => {
            if (++attempts < 3) {
                throw new Error(`some error ${attempts}`);
            }
            return Promise.resolve('some result');
        });
        expect(attempts).toBe(3);
        expect(actual).toBe('some result');
        expect(info).toHaveLength(4);
        expect(info[0]).toBe('some error 1');
        expect(info[1]).toMatch(/Waiting .+ seconds before trying again/);
        expect(info[2]).toBe('some error 2');
        expect(info[3]).toMatch(/Waiting .+ seconds before trying again/);
    }));
    it('all attempts fail succeeds', () => __awaiter(void 0, void 0, void 0, function* () {
        let attempts = 0;
        let error = null;
        try {
            yield retryHelper.execute(() => {
                throw new Error(`some error ${++attempts}`);
            });
        }
        catch (err) {
            error = err;
        }
        expect(error.message).toBe('some error 3');
        expect(attempts).toBe(3);
        expect(info).toHaveLength(4);
        expect(info[0]).toBe('some error 1');
        expect(info[1]).toMatch(/Waiting .+ seconds before trying again/);
        expect(info[2]).toBe('some error 2');
        expect(info[3]).toMatch(/Waiting .+ seconds before trying again/);
    }));
});
