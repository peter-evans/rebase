import * as core from '@actions/core'
import {GitCommandManager} from './git-command-manager'
import {Pull} from './pulls-helper'
import {v4 as uuidv4} from 'uuid'
import * as utils from './utils'

export class RebaseHelper {
  private git: GitCommandManager
  private extraOptions: string[]

  constructor(git: GitCommandManager, options: string[]) {
    this.git = git
    this.extraOptions = options
  }

  async rebaseAll(
    pulls: Pull[]
  ): Promise<{rebasedCount: number; failedRefs: string[]}> {
    let rebasedCount = 0
    const failedRefs: string[] = []
    for (const pull of pulls) {
      try {
        if (await this.rebase(pull)) rebasedCount++
      } catch (error) {
        failedRefs.push(pull.headRef)
        core.error(
          `Failed to rebase '${pull.headRef}': ${utils.getErrorMessage(error)}`
        )
      }
    }
    return {rebasedCount, failedRefs}
  }

  async rebase(pull: Pull): Promise<boolean> {
    core.info(
      `Attempting rebase of head ref '${pull.headRef}' at '${pull.headRepoName}'.`
    )

    // Add head remote
    const remoteName = uuidv4()
    await this.git.exec(['remote', 'add', remoteName, pull.headRepoUrl])

    // Fetch
    await core.group(`Fetching head ref '${pull.headRef}'.`, async () =>
      this.git.fetch([pull.headRef], remoteName)
    )

    // Checkout
    const localRef = uuidv4()
    await core.group(`Checking out head ref '${pull.headRef}'.`, async () =>
      this.git.checkout(localRef, `refs/remotes/${remoteName}/${pull.headRef}`)
    )

    // Get/set the committer
    await core.group(
      `Setting committer to match the last commit on the head ref.`,
      async () => {
        const sha = await this.git.revParse('HEAD')
        const committerName = await this.log1([`--format='%cn'`, sha])
        const committerEmail = await this.log1([`--format='%ce'`, sha])
        await this.git.config('user.name', committerName)
        await this.git.config('user.email', committerEmail)
      }
    )

    // Rebase
    const result = await core.group(
      `Rebasing on base ref '${pull.baseRef}'.`,
      async () => this.tryRebase('origin', pull.baseRef)
    )

    if (result == RebaseResult.Rebased) {
      await core.group(
        `Pushing changes to head ref '${pull.headRef}'`,
        async () =>
          this.git.push([
            '--force-with-lease',
            remoteName,
            `HEAD:${pull.headRef}`
          ])
      )
      core.info(`Head ref '${pull.headRef}' successfully rebased.`)
      return true
    } else if (result == RebaseResult.AlreadyUpToDate) {
      core.info(
        `Head ref '${pull.headRef}' is already up to date with the base.`
      )
    } else if (result == RebaseResult.Failed) {
      core.info(
        `Rebase of head ref '${pull.headRef}' failed. Conflicts must be resolved manually.`
      )
      // Try to abort any in-progress rebase
      await this.git.exec(['rebase', '--abort'], true)
    }

    return false
  }

  private async log1(options: string[]): Promise<string> {
    const params = ['log', '-1']
    params.push(...options)
    const output = await this.git.exec(params)
    return output.stdout.trim()
  }

  private async tryRebase(
    remoteName: string,
    ref: string
  ): Promise<RebaseResult> {
    const headBefore = await this.git.revParse('HEAD')
    try {
      await this.git.exec([
        'rebase',
        ...this.extraOptions,
        `${remoteName}/${ref}`
      ])
    } catch {
      return RebaseResult.Failed
    }
    const headAfter = await this.git.revParse('HEAD')
    return headAfter === headBefore
      ? RebaseResult.AlreadyUpToDate
      : RebaseResult.Rebased
  }
}

enum RebaseResult {
  Rebased,
  AlreadyUpToDate,
  Failed
}
