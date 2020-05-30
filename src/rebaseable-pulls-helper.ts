import * as core from '@actions/core'
import {Octokit} from '@octokit/rest'
import {inspect} from 'util'

// Using multiple plugins
// https://github.com/octokit/rest.js/issues/1624#issuecomment-601436499

export class RebaseablePullsHelper {
  octokit: Octokit

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token
    })
  }

  async get(
    repository: string,
    head: string,
    base: string
  ): Promise<RebaseablePull[]> {
    const [owner, repo] = repository.split('/')
    const params: Octokit.PullsListParams = {
      owner: owner,
      repo: repo,
      state: 'open',
      per_page: 100
    }
    if (head.length > 0) params.head = head
    if (base.length > 0) params.base = base
    const {data: pulls} = await this.octokit.pulls.list(params)
    core.debug(`Pulls: ${inspect(pulls)}`)

    const getPullResults = await Promise.allSettled(
      pulls.map(async pull => {
        return await this.octokit.pulls.get({
          owner: owner,
          repo: repo,
          pull_number: pull.number
        })
      })
    )
    core.debug(`getPullResults: ${inspect(getPullResults)}`)

    for (let i = 0, l = getPullResults.length; i < l; i++) {
      if (getPullResults[i].status === 'rejected') {
        core.warning(`Fetching '${pulls[i].url}' failed.`)
      }
    }

    const rebaseablePulls = getPullResults
      .map(p => {
        if (p.status === 'fulfilled' && p.value.data.rebaseable) {
          return new RebaseablePull(
            p.value.data.base.ref,
            p.value.data.head.repo.html_url,
            p.value.data.head.repo.full_name,
            p.value.data.head.ref
          )
        }
      })
      .filter(notUndefined)
    core.debug(`rebaseablePulls: ${inspect(rebaseablePulls)}`)

    return rebaseablePulls
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
