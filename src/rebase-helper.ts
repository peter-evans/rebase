import * as core from '@actions/core'
import {IGitCommandManager} from 'checkout/lib/git-command-manager'
import {Pull} from './pulls-helper'
import {v4 as uuidv4} from 'uuid'

export class RebaseHelper {
  private git: IGitCommandManager

  constructor(git: IGitCommandManager) {
    this.git = git
  }

  async rebase(pull: Pull): Promise<void> {
    core.info(
      `Starting rebase of head ref '${pull.headRef}' at '${pull.headRepoName}'`
    )

    // Add head remote
    const remoteName = uuidv4()
    await this.git.remoteAdd(remoteName, pull.headRepoUrl)

    // Fetch
    core.startGroup(`Fetching head ref '${pull.headRef}'`)
    await this.git.fetch([pull.headRef], 0, remoteName)
    core.endGroup()

    // Checkout
    core.startGroup(`Checking out head ref '${pull.headRef}'`)
    const localRef = uuidv4()
    await this.git.checkout(
      localRef,
      `refs/remotes/${remoteName}/${pull.headRef}`
    )
    core.endGroup()

    // Get/set the committer
    core.startGroup(`Setting the committer to the HEAD commit committer`)
    const sha = await this.git.revParse('HEAD')
    const committerName = await this.git.log1([`--format='%cn'`, sha])
    const committerEmail = await this.git.log1([`--format='%ce'`, sha])
    await this.git.config('user.name', committerName)
    await this.git.config('user.email', committerEmail)
    core.endGroup()

    // Rebase
    core.startGroup(`Rebasing on base ref '${pull.baseRef}'`)
    const rebased = await this.tryRebase('origin', pull.baseRef)
    core.endGroup()

    if (rebased) {
      core.info(`Pushing changes to head ref '${pull.headRef}'`)
      const options = ['--force-with-lease']
      await this.git.push(remoteName, `HEAD:${pull.headRef}`, options)
    } else {
      core.info(
        `Head ref '${pull.headRef}' is already up to date with the base`
      )
    }
  }

  private async tryRebase(remoteName: string, ref: string): Promise<boolean> {
    try {
      return await this.git.rebase(remoteName, ref)
    } catch {
      core.info('Automatic rebase failed. Conflicts must be resolved manually.')
      return false
    }
  }
}
