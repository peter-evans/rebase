import * as core from '@actions/core'
import {RebaseablePullsHelper} from './rebaseable-pulls-helper'
import {RebaseHelper} from './rebase-helper'
import {inspect} from 'util'

async function run(): Promise<void> {
  try {
    const inputs = {
      token: core.getInput('token'),
      repository: core.getInput('repository'),
      head: core.getInput('head') != '' ? core.getInput('head') : undefined,
      base: core.getInput('base') != '' ? core.getInput('base') : undefined
    }
    core.debug(`Inputs: ${inspect(inputs)}`)

    // Get rebaseable pulls
    const rebaseablePullsHelper = new RebaseablePullsHelper(inputs.token)
    const rebaseablePulls = await rebaseablePullsHelper.get(
      inputs.repository,
      inputs.head,
      inputs.base
    )

    if (rebaseablePulls.length > 0) {
      core.info('Rebaseable pull requests found.')

      const rebaseHelper = await RebaseHelper.create()

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
