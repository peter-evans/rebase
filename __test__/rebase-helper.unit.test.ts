import * as core from '@actions/core'
import {execFileSync} from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import {GitCommandManager} from '../lib/git-command-manager'
import {Pull} from '../lib/pulls-helper'
import {RebaseHelper} from '../lib/rebase-helper'

jest.setTimeout(30000)

// Runs real git against a local bare repository standing in for the remote
describe('rebase helper tests', () => {
  const heads = ['a', 'b', 'c']
  const isolatedEnvKeys = ['GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM']
  const originalEnv: Record<string, string | undefined> = {}
  let tempDir: string
  let remotePath: string
  let workPath: string

  function git(cwd: string, ...args: string[]): string {
    return execFileSync(
      'git',
      [
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.com',
        '-c',
        'commit.gpgsign=false',
        ...args
      ],
      {cwd, stdio: 'pipe', encoding: 'utf8'}
    )
  }

  function commitFile(repoPath: string, name: string): void {
    fs.writeFileSync(path.join(repoPath, name), name)
    git(repoPath, 'add', name)
    git(repoPath, 'commit', '-m', `Add ${name}`)
  }

  function rejectPushesTo(head: string, message: string): void {
    fs.writeFileSync(
      path.join(remotePath, 'hooks', 'pre-receive'),
      [
        '#!/bin/sh',
        'while read old new ref; do',
        `  if [ "$ref" = "refs/heads/${head}" ]; then echo "${message}" >&2; exit 1; fi`,
        'done'
      ].join('\n'),
      {mode: 0o755}
    )
  }

  function isRebasedOnMain(head: string): boolean {
    try {
      git(
        tempDir,
        '--git-dir',
        remotePath,
        'merge-base',
        '--is-ancestor',
        'main',
        head
      )
      return true
    } catch {
      return false
    }
  }

  beforeEach(() => {
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebase-test-'))
    // Isolate from the user's git config, e.g. commit signing
    for (const key of isolatedEnvKeys) originalEnv[key] = process.env[key]
    const emptyConfig = path.join(tempDir, 'gitconfig')
    fs.writeFileSync(emptyConfig, '')
    process.env['GIT_CONFIG_GLOBAL'] = emptyConfig
    process.env['GIT_CONFIG_NOSYSTEM'] = '1'

    // Create head branches, then advance main so each needs rebasing
    remotePath = path.join(tempDir, 'remote.git')
    git(tempDir, 'init', '--bare', '-b', 'main', remotePath)
    const seedPath = path.join(tempDir, 'seed')
    git(tempDir, 'clone', remotePath, seedPath)
    commitFile(seedPath, 'base.txt')
    git(seedPath, 'push', 'origin', 'main')
    for (const head of heads) {
      git(seedPath, 'checkout', '-b', head, 'main')
      commitFile(seedPath, `${head}.txt`)
      git(seedPath, 'push', 'origin', head)
    }
    git(seedPath, 'checkout', 'main')
    commitFile(seedPath, 'main.txt')
    git(seedPath, 'push', 'origin', 'main')

    workPath = path.join(tempDir, 'work')
    git(tempDir, 'clone', remotePath, workPath)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    for (const key of isolatedEnvKeys) {
      if (originalEnv[key] === undefined) delete process.env[key]
      else process.env[key] = originalEnv[key]
    }
    fs.rmSync(tempDir, {recursive: true, force: true})
  })

  async function createRebaseHelper(): Promise<RebaseHelper> {
    return new RebaseHelper(await GitCommandManager.create(workPath), [])
  }

  function pullsFor(refs: string[]): Pull[] {
    return refs.map(head => new Pull('main', remotePath, 'owner/repo', head))
  }

  it('continues with the remaining pull requests when a push is rejected', async () => {
    rejectPushesTo('b', 'push rejected by test hook')
    const errorSpy = jest.spyOn(core, 'error').mockImplementation(() => {})
    const rebaseHelper = await createRebaseHelper()

    const result = await rebaseHelper.rebaseAll(pullsFor(heads))

    expect(result).toEqual({rebasedCount: 2, failedRefs: ['b']})
    expect(heads.map(isRebasedOnMain)).toEqual([true, false, true])
    // The reported error includes git's stderr, not just the exit code
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Failed to rebase 'b'.*push rejected by test hook/s)
    )
  })

  it('does not count pull requests that are already up to date', async () => {
    git(tempDir, '--git-dir', remotePath, 'branch', 'up-to-date', 'main')
    const rebaseHelper = await createRebaseHelper()

    const result = await rebaseHelper.rebaseAll(pullsFor(['a', 'up-to-date']))

    expect(result).toEqual({rebasedCount: 1, failedRefs: []})
  })
})
