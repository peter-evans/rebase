import * as fs from 'fs'

export function fileExistsSync(path: string): boolean {
  if (!path) {
    throw new Error("Arg 'path' must not be empty")
  }

  let stats: fs.Stats
  try {
    stats = fs.statSync(path)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false
    }

    throw new Error(
      `Encountered an error when checking whether path '${path}' exists: ${error.message}`
    )
  }

  if (!stats.isDirectory()) {
    return true
  }

  return false
}
