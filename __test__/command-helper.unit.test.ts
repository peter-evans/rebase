import * as cmdHelper from '../lib/command-helper'

describe('command helper tests', () => {
  it('successfully echos a command to a file', async () => {
    const cmd1 = new cmdHelper.CommandHelper(
      process.cwd(),
      `bash -c "echo hello > /tmp/test.txt"`,
      undefined
    )
    const output1 = new cmdHelper.CommandOutput()
    output1.stdout = ''
    expect(await cmd1.exec()).toEqual(output1)

    const cmd2 = new cmdHelper.CommandHelper(
      process.cwd(),
      'bash -c "VAR=$(cat /tmp/test.txt) echo $VAR"',
      undefined
    )
    const output2 = new cmdHelper.CommandOutput()
    output2.stdout = '"hello"'
    expect(await cmd2.exec()).toEqual(output1)
  })

  // it('successfully reads a file and prints the content', async () => {
  //   const cmd1 = new cmdHelper.CommandHelper(
  //     process.cwd(),
  //     'bash -c "VAR=$(cat test.txt) echo $VAR"',
  //     undefined
  //   )
  //   const output1 = new cmdHelper.CommandOutput()
  //   output1.stdout = '"hello"'
  //   expect(await cmd1.exec()).toEqual(output1)
  // })
})
