# Rebase
[![CI](https://github.com/peter-evans/rebase/workflows/CI/badge.svg)](https://github.com/peter-evans/rebase/actions?query=workflow%3ACI)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Rebase%20Pulls-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=)](https://github.com/marketplace/actions/rebase-pulls)

A GitHub action to rebase pull requests in a repository.

## Usage

The default behaviour of the action with no configured inputs is to check the current repository for rebaseable pull requests and rebase them.
Pull requests from forks are rebaseable only if they [allow edits from maintainers](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork).

```yml
      - uses: peter-evans/rebase@v1
```

### Periodically rebase all pull requests

The simplest way to use this action is to schedule it to run periodically.

```yml
name: Rebase
on:
  schedule:
    - cron:  '0 0 * * *'
jobs:
  rebase:
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/rebase@v1
```

### Rebase all pull requests on push to the base branch

```yml
name: Rebase
on:
  push:
    branches: [main]
jobs:
  rebase:
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/rebase@v1
        with:
          base: main
```

### Exclude pull requests with specific labels

```yml
      - uses: peter-evans/rebase@v1
        with:
          exclude-labels: |
            no-rebase
            dependencies
```

### Action inputs

| Name | Description | Default |
| --- | --- | --- |
| `token` | `GITHUB_TOKEN` or a `repo` scoped [PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token). The `workflow` scope may also be required if rebasing pull requests containing changes to workflows under `.github/workflows`. | `GITHUB_TOKEN` |
| `repository` | The target GitHub repository containing the pull request. | `github.repository` (Current repository) |
| `head` | Filter pull requests by head user or head organization and branch name in the format `user:ref-name` or `organization:ref-name`. Use the `*` wildcard match any ref. e.g. `my-org:new-script-format` or `octocat:*`. | |
| `base` | Filter pull requests by base branch name. Example: `gh-pages`. | |
| `exclude-labels` | A comma or newline separated list of pull request labels to exclude. | |
| `exclude-drafts` | Exclude draft pull requests. | `false` |

### Rebase slash command

Use the following two workflows and a `repo` scoped [PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) to add a `/rebase` slash command to pull request comments.
The [slash-command-dispatch](https://github.com/peter-evans/slash-command-dispatch) action makes sure that the command is only executable by users with `write` access to the repository.

```yml
name: Slash Command Dispatch
on:
  issue_comment:
    types: [created]
jobs:
  slashCommandDispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Slash Command Dispatch
        uses: peter-evans/slash-command-dispatch@v1
        with:
          token: ${{ secrets.PAT }}
          commands: rebase
          permission: write
          issue-type: pull-request
```

```yml
name: rebase-command
on:
  repository_dispatch:
    types: [rebase-command]
jobs:
  rebase:
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/rebase@v1
        id: rebase
        with:
          head: ${{ github.event.client_payload.pull_request.head.label }}
      - name: Add reaction
        if: steps.rebase.outputs.rebased-count == 1
        uses: peter-evans/create-or-update-comment@v1
        with:
          token: ${{ secrets.PAT }}
          repository: ${{ github.event.client_payload.github.payload.repository.full_name }}
          comment-id: ${{ github.event.client_payload.github.payload.comment.id }}
          reaction-type: hooray
```

### Target other repositories

You can rebase requests in another repository by using a `repo` scoped [PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) instead of `GITHUB_TOKEN`.
The user associated with the PAT must have write access to the repository.

This example targets multiple repositories.

```yml
name: Rebase
on:
  schedule:
    - cron:  '0 0 * * *'
jobs:
  rebase:
    strategy:
      matrix:
        repo: ['my-org/repo1', 'my-org/repo2', 'my-org/repo3']
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/rebase@v1
        with:
          token: ${{ secrets.PAT }}
          repository: ${{ matrix.repo }}
```

## License

[MIT](LICENSE)
