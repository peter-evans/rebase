import * as core from '@actions/core'
import {IGitCommandManager} from 'checkout/lib/git-command-manager'
import {RebaseablePull} from './rebaseable-pulls-helper'
import {v4 as uuidv4} from 'uuid'

export class RebaseHelper {
  private git: IGitCommandManager

  constructor(git: IGitCommandManager) {
    this.git = git
  }

  async rebase(rebaseablePull: RebaseablePull): Promise<void> {
    core.info(
      `Starting rebase of head ref '${rebaseablePull.headRef}' at '${rebaseablePull.headRepoName}'`
    )

    // Add head remote
    const remoteName = uuidv4()
    await this.git.remoteAdd(remoteName, rebaseablePull.headRepoUrl)

    // Fetch
    core.startGroup(`Fetching head ref '${rebaseablePull.headRef}'`)
    await this.git.fetch([rebaseablePull.headRef], 0, remoteName)
    core.endGroup()

    // Checkout
    core.startGroup(`Checking out head ref '${rebaseablePull.headRef}'`)
    const localRef = uuidv4()
    await this.git.checkout(
      localRef,
      `refs/remotes/${remoteName}/${rebaseablePull.headRef}`
    )
    core.endGroup()

    // Get/set the committer
    const sha = await this.git.revParse('HEAD')
    const committerName = await this.git.log1([`--format='%cn'`, sha])
    const committerEmail = await this.git.log1([`--format='%ce'`, sha])
    await this.git.config('user.name', committerName)
    await this.git.config('user.email', committerEmail)

    // Rebase
    core.startGroup(`Rebasing on base ref '${rebaseablePull.baseRef}'`)
    const rebased = await this.git.rebase('origin', rebaseablePull.baseRef)
    core.endGroup()

    if (rebased) {
      core.info(`Pushing changes to head ref '${rebaseablePull.headRef}'`)
      const options = ['--force-with-lease']
      await this.git.push(remoteName, `HEAD:${rebaseablePull.headRef}`, options)
    } else {
      core.info(
        `Head ref '${rebaseablePull.headRef}' is already up to date with the base`
      )
    }
  }
}
