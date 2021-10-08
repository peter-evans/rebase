export function parseHead(head: string): string[] {
  if (head.length > 0) {
    const [headOwner, headRef] = head.split(':')
    if (!headRef) {
      throw `Input 'head' does not conform to the format 'user:ref-name' or 'organization:ref-name'`
    }
    if (headRef == '*') {
      return [headOwner, '']
    } else {
      return [headOwner, headRef]
    }
  } else {
    return ['', '']
  }
}
