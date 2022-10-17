import * as core from '@actions/core'
import * as fs from 'fs'

export function fileExistsSync(path: string): boolean {
  if (!path) {
    throw new Error("Arg 'path' must not be empty")
  }

  let stats: fs.Stats
  try {
    stats = fs.statSync(path)
  } catch (error) {
    if (hasErrorCode(error) && error.code === 'ENOENT') {
      return false
    }

    throw new Error(
      `Encountered an error when checking whether path '${path}' exists: ${getErrorMessage(
        error
      )}`
    )
  }

  if (!stats.isDirectory()) {
    return true
  }

  return false
}

export function getInputAsArray(
  name: string,
  options?: core.InputOptions
): string[] {
  return getStringAsArray(core.getInput(name, options))
}

function getStringAsArray(str: string): string[] {
  return str
    .split(/[\n,]+/)
    .map(s => s.trim())
    .filter(x => x !== '')
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
function hasErrorCode(error: any): error is {code: string} {
  return typeof (error && error.code) === 'string'
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
