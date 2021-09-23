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
const coreCommand = __importStar(require("@actions/core/lib/command"));
const gitSourceProvider = __importStar(require("./git-source-provider"));
const inputHelper = __importStar(require("./input-helper"));
const path = __importStar(require("path"));
const stateHelper = __importStar(require("./state-helper"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const sourceSettings = inputHelper.getInputs();
            try {
                // Register problem matcher
                coreCommand.issueCommand('add-matcher', {}, path.join(__dirname, 'problem-matcher.json'));
                // Get sources
                yield gitSourceProvider.getSource(sourceSettings);
            }
            finally {
                // Unregister problem matcher
                coreCommand.issueCommand('remove-matcher', { owner: 'checkout-git' }, '');
            }
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
function cleanup() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield gitSourceProvider.cleanup(stateHelper.RepositoryPath);
        }
        catch (error) {
            core.warning(error.message);
        }
    });
}
// Main
if (!stateHelper.IsPost) {
    run();
}
// Post
else {
    cleanup();
}
