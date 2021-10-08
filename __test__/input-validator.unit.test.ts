import * as inputValidator from '../lib/input-validator'

describe('input validator tests', () => {
  it('successfully parses the head input', async () => {
    expect(inputValidator.parseHead('owner:ref')).toEqual(['owner', 'ref'])
  })

  it('successfully parses the head input with wildcard ref', async () => {
    expect(inputValidator.parseHead('owner:*')).toEqual(['owner', ''])
  })

  it('throws an error when unable to parse the head input', async () => {
    expect(() => {
      inputValidator.parseHead('ref')
    }).toThrow(
      `Input 'head' does not conform to the format 'user:ref-name' or 'organization:ref-name'`
    )
  })
})
