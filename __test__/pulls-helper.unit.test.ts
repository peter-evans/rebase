import {PullsHelper} from '../lib/pulls-helper'

const mockGraphql = jest.fn()
jest.mock('@octokit/core', () => ({
  Octokit: jest.fn().mockImplementation(() => ({graphql: mockGraphql}))
}))

type Variables = Record<string, unknown>

function edge(n: number, labels: string[] = []) {
  return {
    cursor: `cursor-${n}`,
    node: {
      baseRefName: 'main',
      headRefName: `branch-${n}`,
      headRepository: {
        nameWithOwner: 'owner/repo',
        url: 'https://github.com/owner/repo'
      },
      headRepositoryOwner: {login: 'owner'},
      isDraft: false,
      labels: {nodes: labels.map(name => ({name}))},
      maintainerCanModify: false
    }
  }
}

function page(edges: ReturnType<typeof edge>[], hasNextPage: boolean) {
  return {repository: {pullRequests: {edges, pageInfo: {hasNextPage}}}}
}

// Responds with the given pages in order and records a copy of the variables
// sent with each request, since the same params object is reused across pages.
function mockPages(...pages: ReturnType<typeof page>[]): Variables[] {
  const requests: Variables[] = []
  mockGraphql.mockImplementation(async (_query: string, vars: Variables) => {
    requests.push({...vars})
    return pages.shift()
  })
  return requests
}

async function getPulls(includeLabels: string[] = []) {
  const pullsHelper = new PullsHelper('token')
  return pullsHelper.get('owner/repo', '', '', 'main', includeLabels, [], false)
}

describe('pulls helper tests', () => {
  beforeEach(() => {
    mockGraphql.mockReset()
  })

  it('fetches a single page without a cursor', async () => {
    const requests = mockPages(page([edge(1), edge(2)], false))

    const pulls = await getPulls()

    expect(requests).toHaveLength(1)
    expect(requests[0].cursor).toBeUndefined()
    expect(pulls.map(p => p.headRef)).toEqual(['branch-1', 'branch-2'])
  })

  it('follows the cursor until there are no more pages', async () => {
    const requests = mockPages(
      page([edge(1), edge(2)], true),
      page([edge(3)], true),
      page([edge(4)], false)
    )

    const pulls = await getPulls()

    expect(requests.map(r => r.cursor)).toEqual([
      undefined,
      'cursor-2',
      'cursor-3'
    ])
    expect(requests.every(r => r.base === 'main')).toBe(true)
    expect(pulls.map(p => p.headRef)).toEqual([
      'branch-1',
      'branch-2',
      'branch-3',
      'branch-4'
    ])
  })

  it('applies filters to pull requests from all pages', async () => {
    mockPages(
      page([edge(1), edge(2, ['ready'])], true),
      page([edge(3, ['ready']), edge(4)], false)
    )

    const pulls = await getPulls(['ready'])

    expect(pulls.map(p => p.headRef)).toEqual(['branch-2', 'branch-3'])
  })
})
