import * as core from '@actions/core'
import * as inputHelper from 'checkout/lib/input-helper'
import * as gitSourceProvider from 'checkout/lib/git-source-provider'
import {inspect} from 'util'

async function run(): Promise<void> {
  try {
    const inputs = {
      token: core.getInput('token'),
      repository: core.getInput('repository'),
      base: core.getInput('base'),
      head: core.getInput('head')
    }
    core.debug(`Inputs: ${inspect(inputs)}`)

    process.env['INPUT_PATH'] = 'somepath'
    process.env['INPUT_REF'] = 'master'
    process.env['INPUT_FETCH-DEPTH'] = '0'
    process.env['INPUT_PERSIST_CREDENTIALS'] = 'true'

    const sourceSettings = inputHelper.getInputs()
    core.debug(`sourceSettings: ${inspect(sourceSettings)}`)

    await gitSourceProvider.getSource(sourceSettings)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
