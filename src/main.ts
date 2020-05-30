import * as core from '@actions/core'
import * as io from '@actions/io'
import * as inputHelper from 'checkout/lib/input-helper'
import * as gitSourceProvider from 'checkout/lib/git-source-provider'
import * as gitCommandManager from 'checkout/lib/git-command-manager'
import {RebaseablePullsHelper} from './rebaseable-pulls-helper'
import {RebaseHelper} from './rebase-helper'
import assert from 'assert'
import {inspect} from 'util'
import {v4 as uuidv4} from 'uuid'

async function run(): Promise<void> {
  try {
    const inputs = {
      token: core.getInput('token'),
      repository: core.getInput('repository'),
      committer: core.getInput('committer'),
      head: core.getInput('head'),
      base: core.getInput('base')
    }
    core.debug(`Inputs: ${inspect(inputs)}`)

    const matches = inputs.committer.match(/^([^<]+)\s*<([^>]+)>$/)
    assert(
      matches,
      `Input 'committer' does not conform to the format 'Your Name <you@example.com>'`
    )
    const [, committerName, committerEmail] = matches

    const rebaseablePullsHelper = new RebaseablePullsHelper(inputs.token)
    const rebaseablePulls = await rebaseablePullsHelper.get(
      inputs.repository,
      inputs.head,
      inputs.base
    )

    if (rebaseablePulls.length > 0) {
      core.info('Rebaseable pull requests found.')

      // Checkout
      const path = uuidv4()
      process.env['INPUT_PATH'] = path
      process.env['INPUT_REF'] = 'master'
      process.env['INPUT_FETCH-DEPTH'] = '0'
      process.env['INPUT_PERSIST-CREDENTIALS'] = 'true'
      const sourceSettings = inputHelper.getInputs()
      core.debug(`sourceSettings: ${inspect(sourceSettings)}`)
      await gitSourceProvider.getSource(sourceSettings)

      // Rebase
      const git = await gitCommandManager.createCommandManager(
        sourceSettings.repositoryPath,
        sourceSettings.lfs
      )
      const rebaseHelper = new RebaseHelper(git, committerName, committerEmail)
      for (const rebaseablePull of rebaseablePulls) {
        await rebaseHelper.rebase(rebaseablePull)
      }

      // Delete the repository
      await io.rmRF(sourceSettings.repositoryPath)
    } else {
      core.info('No rebaseable pull requests found.')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
