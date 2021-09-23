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
exports.setSshKnownHostsPath = exports.setSshKeyPath = exports.setRepositoryPath = exports.SshKnownHostsPath = exports.SshKeyPath = exports.RepositoryPath = exports.IsPost = void 0;
const coreCommand = __importStar(require("@actions/core/lib/command"));
/**
 * Indicates whether the POST action is running
 */
exports.IsPost = !!process.env['STATE_isPost'];
/**
 * The repository path for the POST action. The value is empty during the MAIN action.
 */
exports.RepositoryPath = process.env['STATE_repositoryPath'] || '';
/**
 * The SSH key path for the POST action. The value is empty during the MAIN action.
 */
exports.SshKeyPath = process.env['STATE_sshKeyPath'] || '';
/**
 * The SSH known hosts path for the POST action. The value is empty during the MAIN action.
 */
exports.SshKnownHostsPath = process.env['STATE_sshKnownHostsPath'] || '';
/**
 * Save the repository path so the POST action can retrieve the value.
 */
function setRepositoryPath(repositoryPath) {
    coreCommand.issueCommand('save-state', { name: 'repositoryPath' }, repositoryPath);
}
exports.setRepositoryPath = setRepositoryPath;
/**
 * Save the SSH key path so the POST action can retrieve the value.
 */
function setSshKeyPath(sshKeyPath) {
    coreCommand.issueCommand('save-state', { name: 'sshKeyPath' }, sshKeyPath);
}
exports.setSshKeyPath = setSshKeyPath;
/**
 * Save the SSH known hosts path so the POST action can retrieve the value.
 */
function setSshKnownHostsPath(sshKnownHostsPath) {
    coreCommand.issueCommand('save-state', { name: 'sshKnownHostsPath' }, sshKnownHostsPath);
}
exports.setSshKnownHostsPath = setSshKnownHostsPath;
// Publish a variable so that when the POST action runs, it can determine it should run the cleanup logic.
// This is necessary since we don't have a separate entry point.
if (!exports.IsPost) {
    coreCommand.issueCommand('save-state', { name: 'isPost' }, 'true');
}
