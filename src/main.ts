import * as core from '@actions/core'
import {RebaseablePullsHelper} from './rebaseable-pulls-helper'
import {RebaseHelper} from './rebase-helper'
import assert from 'assert'
import {inspect} from 'util'

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

      const rebaseHelper = await RebaseHelper.create(
        committerName,
        committerEmail
      )

      for (const rebaseablePull of rebaseablePulls) {
        await rebaseHelper.rebase(rebaseablePull)
      }
    } else {
      core.info('No rebaseable pull requests found.')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
