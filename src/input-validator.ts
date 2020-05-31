import assert from 'assert'

export function parseCommitter(committer: string): string[] {
  const matches = committer.match(/^([^<]+)\s*<([^>]+)>$/)
  assert(
    matches,
    `Input 'committer' does not conform to the format 'Display Name <email@address.com>'`
  )
  const [, name, email] = matches
  return [name, email]
}

export function parseHead(head: string): string[] {
  if (head.length > 0) {
    const [headOwner, headRef] = head.split(':')
    assert(
      headRef,
      `Input 'head' does not conform to the format 'user:ref-name' or 'organization:ref-name'`
    )
    return [headOwner, headRef]
  } else {
    return ['', '']
  }
}
