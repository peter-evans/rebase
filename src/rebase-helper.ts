import * as core from '@actions/core'
import {GitCommandManager} from './git-command-manager'
import {Pull} from './pulls-helper'
import {v4 as uuidv4} from 'uuid'

export class RebaseHelper {
  private git: GitCommandManager

  constructor(git: GitCommandManager) {
    this.git = git
  }

  async rebase(pull: Pull): Promise<boolean> {
    core.info(
      `Attempting rebase of head ref '${pull.headRef}' at '${pull.headRepoName}'.`
    )

    // Add head remote
    const remoteName = uuidv4()
    await this.git.exec(['remote', 'add', remoteName, pull.headRepoUrl])

    // Fetch
    core.startGroup(`Fetching head ref '${pull.headRef}'.`)
    await this.git.fetch([pull.headRef], remoteName)
    core.endGroup()

    // Checkout
    core.startGroup(`Checking out head ref '${pull.headRef}'.`)
    const localRef = uuidv4()
    await this.git.checkout(
      localRef,
      `refs/remotes/${remoteName}/${pull.headRef}`
    )
    core.endGroup()

    // Get/set the committer
    core.startGroup(
      `Setting committer to match the last commit on the head ref.`
    )
    const sha = await this.git.revParse('HEAD')
    const committerName = await this.log1([`--format='%cn'`, sha])
    const committerEmail = await this.log1([`--format='%ce'`, sha])
    await this.git.config('user.name', committerName)
    await this.git.config('user.email', committerEmail)
    core.endGroup()

    // Rebase
    core.startGroup(`Rebasing on base ref '${pull.baseRef}'.`)
    const result = await this.tryRebase('origin', pull.baseRef)
    core.endGroup()

    if (result == RebaseResult.Rebased) {
      core.startGroup(`Pushing changes to head ref '${pull.headRef}'`)
      await this.git.push([
        '--force-with-lease',
        remoteName,
        `HEAD:${pull.headRef}`
      ])
      core.endGroup()
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
    try {
      const result = await this.git.exec(['rebase', `${remoteName}/${ref}`])
      return result ? RebaseResult.Rebased : RebaseResult.AlreadyUpToDate
    } catch {
      return RebaseResult.Failed
    }
  }
}

enum RebaseResult {
  Rebased,
  AlreadyUpToDate,
  Failed
}
