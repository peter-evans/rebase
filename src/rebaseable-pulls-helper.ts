import * as core from '@actions/core'
import {graphql} from '@octokit/graphql'
import {graphql as Graphql} from '@octokit/graphql/dist-types/types'
import * as OctokitTypes from '@octokit/types'
import {inspect} from 'util'

export class RebaseablePullsHelper {
  graphqlClient: Graphql

  constructor(token: string) {
    this.graphqlClient = graphql.defaults({
      headers: {
        authorization: `token ${token}`,
        accept: 'application/vnd.github.merge-info-preview+json'
      }
    })
  }

  async get(
    repository: string,
    head: string,
    base: string
  ): Promise<RebaseablePull[]> {
    const [owner, repo] = repository.split('/')
    const params: OctokitTypes.RequestParameters = {
      owner: owner,
      repo: repo
    }
    if (head.length > 0) params.head = head
    if (base.length > 0) params.base = base
    const query = `query Pulls($owner: String!, $repo: String!, $head: String, $base: String) {
      repository(owner:$owner, name:$repo) {
        pullRequests(first: 100, states: OPEN, headRefName: $head, baseRefName: $base) {
          edges {
            node {
              id
              baseRefName
              headRefName
              headRepository {
                nameWithOwner
                url
              }
              canBeRebased
            }
          }
        }
      }
    }`
    const pulls = await this.graphqlClient<Pulls>(query, params)
    core.debug(`Pulls: ${inspect(pulls.repository.pullRequests.edges)}`)

    const rebaseablePulls = pulls.repository.pullRequests.edges
      .map(p => {
        if (p.node.canBeRebased) {
          return new RebaseablePull(
            p.node.baseRefName,
            p.node.headRepository.url,
            p.node.headRepository.nameWithOwner,
            p.node.headRefName
          )
        }
      })
      .filter(notUndefined)
    core.debug(`rebaseablePulls: ${inspect(rebaseablePulls)}`)

    return rebaseablePulls
  }
}

type Edge = {
  node: {
    id: string
    baseRefName: string
    headRefName: string
    headRepository: {
      nameWithOwner: string
      url: string
    }
    canBeRebased: boolean
  }
}

type Pulls = {
  repository: {
    pullRequests: {
      edges: Edge[]
    }
  }
}

export class RebaseablePull {
  baseRef: string
  headRepoUrl: string
  headRepoName: string
  headRef: string
  constructor(
    baseRef: string,
    headRepoUrl: string,
    headRepoName: string,
    headRef: string
  ) {
    this.baseRef = baseRef
    this.headRepoUrl = headRepoUrl
    this.headRepoName = headRepoName
    this.headRef = headRef
  }
}

function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined
}
