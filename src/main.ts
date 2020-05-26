import * as core from '@actions/core'
import {
  ConfigOption,
  getRepoPath,
  getAndUnsetConfigOption,
  addConfigOption
} from './git'
import {inspect} from 'util'

const EXTRAHEADER_OPTION = 'http.https://github.com/.extraheader'
const EXTRAHEADER_VALUE_REGEX = '^AUTHORIZATION:'

async function run(): Promise<void> {
  let repoPath
  let extraHeaderOption = new ConfigOption()
  try {
    const inputs = {
      token: core.getInput('token'),
      path: core.getInput('path'),
      base: core.getInput('base'),
      head: core.getInput('head')
    }
    core.debug(`Inputs: ${inspect(inputs)}`)

    // Get the repository path
    repoPath = getRepoPath(inputs.path)
    // Get the extraheader config option if it exists
    extraHeaderOption = await getAndUnsetConfigOption(
      repoPath,
      EXTRAHEADER_OPTION,
      EXTRAHEADER_VALUE_REGEX
    )

    // Action logic
  } catch (error) {
    core.setFailed(error.message)
  } finally {
    // Restore the extraheader config option
    if (extraHeaderOption.value != '') {
      if (
        await addConfigOption(
          repoPath,
          EXTRAHEADER_OPTION,
          extraHeaderOption.value
        )
      )
        core.debug(`Restored config option '${EXTRAHEADER_OPTION}'`)
    }
  }
}

run()
