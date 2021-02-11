import * as exec from '@actions/exec'

export class CommandHelper {
  private command: string | undefined
  private args: string[] | undefined
  private workingDirectory: string

  constructor(
    workingDirectory: string,
    command: string | undefined,
    args: string[] | undefined
  ) {
    if (command) {
      if (args == undefined) {
        // const cmdArr = command.match(/[^\s"]+|"([^"]*)"/gi)
        const parseWords = (words = '') =>
          (words.match(/[^\s"]+|"([^"]*)"/gi) || []).map(word =>
            word.replace(/^"(.+(?="$))"$/, '$1')
          )
        const cmdArr = parseWords(command)

        if (cmdArr) {
          this.command = cmdArr[0] || ''
          this.args = cmdArr.slice(1) || []
        }
      } else {
        this.command = command
        this.args = args
      }
    } else {
      this.command = undefined
      this.args = undefined
    }
    this.workingDirectory = workingDirectory
  }

  async exec(allowAllExitCodes = false): Promise<CommandOutput> {
    const result = new CommandOutput()
    if (this.command) {
      const env = {}
      for (const key of Object.keys(process.env)) {
        env[key] = process.env[key]
      }

      const stdout: string[] = []
      const stderr: string[] = []

      const options = {
        cwd: this.workingDirectory,
        env,
        ignoreReturnCode: allowAllExitCodes,
        listeners: {
          stdout: (data: Buffer) => {
            stdout.push(data.toString())
          },
          stderr: (data: Buffer) => {
            stderr.push(data.toString())
          }
        }
      }

      result.exitCode = await exec.exec(`"${this.command}"`, this.args, options)
      result.stdout = stdout.join('').trim()
      result.stderr = stderr.join('').trim()
    }
    return result
  }
}

export class CommandOutput {
  stdout = ''
  stderr = ''
  exitCode = 0
}
