import * as core from '@actions/core'
import * as inputHelper from 'checkout/lib/input-helper'
import * as gitSourceProvider from 'checkout/lib/git-source-provider'
import * as gitCommandManager from 'checkout/lib/git-command-manager'
import {RebaseablePull} from './rebaseable-pulls-helper'
import {v4 as uuidv4} from 'uuid'
import {inspect} from 'util'

export class RebaseHelper {
  private git: gitCommandManager.IGitCommandManager

  // Private constructor; use create()
  private constructor(git: gitCommandManager.IGitCommandManager) {
    this.git = git
  }

  static async create(): Promise<RebaseHelper> {
    // Additional inputs needed by checkout
    process.env['INPUT_PATH'] = 'somepath'
    process.env['INPUT_REF'] = 'master'
    process.env['INPUT_FETCH-DEPTH'] = '0'
    process.env['INPUT_PERSIST-CREDENTIALS'] = 'true'
    const sourceSettings = inputHelper.getInputs()
    core.debug(`sourceSettings: ${inspect(sourceSettings)}`)

    // Checkout
    await gitSourceProvider.getSource(sourceSettings)

    // Create a git command manager
    const git = await gitCommandManager.createCommandManager(
      sourceSettings.repositoryPath,
      sourceSettings.lfs
    )
    return new RebaseHelper(git)
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

    // Set a default git user
    await this.git.config('user.email', 'you@example.com')
    await this.git.config('user.name', 'Your Name')

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
