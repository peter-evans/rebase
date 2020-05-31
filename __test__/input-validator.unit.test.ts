import * as inputValidator from '../lib/input-validator'

describe('input validator tests', () => {
  it('successfully parses the committer input', async () => {
    expect(
      inputValidator.parseCommitter('Test User <test@example.com>')
    ).toEqual(['Test User', 'test@example.com'])
  })

  it('throws an error when unable to parse the committer input', async () => {
    expect(() => {
      inputValidator.parseCommitter('Test User')
    }).toThrow(
      `Input 'committer' does not conform to the format 'Display Name <email@address.com>'`
    )
  })

  it('successfully parses the head input', async () => {
    expect(inputValidator.parseHead('owner:ref')).toEqual(['owner', 'ref'])
  })

  it('throws an error when unable to parse the head input', async () => {
    expect(() => {
      inputValidator.parseHead('ref')
    }).toThrow(
      `Input 'head' does not conform to the format 'user:ref-name' or 'organization:ref-name'`
    )
  })
})
