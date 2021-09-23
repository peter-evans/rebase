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
exports.getServerUrl = exports.getFetchUrl = void 0;
const assert = __importStar(require("assert"));
const url_1 = require("url");
function getFetchUrl(settings) {
    assert.ok(settings.repositoryOwner, 'settings.repositoryOwner must be defined');
    assert.ok(settings.repositoryName, 'settings.repositoryName must be defined');
    const serviceUrl = getServerUrl();
    const encodedOwner = encodeURIComponent(settings.repositoryOwner);
    const encodedName = encodeURIComponent(settings.repositoryName);
    if (settings.sshKey) {
        return `git@${serviceUrl.hostname}:${encodedOwner}/${encodedName}.git`;
    }
    // "origin" is SCHEME://HOSTNAME[:PORT]
    return `${serviceUrl.origin}/${encodedOwner}/${encodedName}`;
}
exports.getFetchUrl = getFetchUrl;
function getServerUrl() {
    // todo: remove GITHUB_URL after support for GHES Alpha is no longer needed
    return new url_1.URL(process.env['GITHUB_SERVER_URL'] ||
        process.env['GITHUB_URL'] ||
        'https://github.com');
}
exports.getServerUrl = getServerUrl;
