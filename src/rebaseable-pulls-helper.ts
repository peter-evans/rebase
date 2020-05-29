import * as core from '@actions/core'
import * as github from '@actions/github'
import {inspect} from 'util'

export class RebaseablePullsHelper {
  octokit: github.GitHub

  constructor(token: string) {
    this.octokit = new github.GitHub(token)
  }

  async get(
    repository: string,
    head?: string,
    base?: string
  ): Promise<RebaseablePull[]> {
    const [owner, repo] = repository.split('/')
    const {data: pulls} = await this.octokit.pulls.list({
      owner: owner,
      repo: repo,
      state: 'open',
      head: head,
      base: base
    })
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
