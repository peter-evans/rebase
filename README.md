# Rebase
[![CI](https://github.com/peter-evans/rebase/workflows/CI/badge.svg)](https://github.com/peter-evans/rebase/actions?query=workflow%3ACI)
[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Rebase%20Pulls-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=)](https://github.com/marketplace/actions/rebase-pulls)

A GitHub action to rebase pull requests in a repository.

## Usage

The default behavior of the action with no configured inputs is to check the current repository for rebaseable pull requests and rebase them.
Pull requests from forks are rebaseable only if they [allow edits from maintainers](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/allowing-changes-to-a-pull-request-branch-created-from-a-fork).


### Action inputs

<!-- start usage -->
```yaml
- uses: peter-evans/rebase@v1.0.11
  with:
    # GitHub auth token
    # Default: ${{ github.token }}
    token: ''

    # The target GitHub repository
    # Default: ${{ github.repository }}
    repository: ''

    # Filter pull requests by head user or head organization and branch name in the
    # format user:ref-name or organization:ref-name. For example:
    # github:new-script-format or octocat:test-branch.
    head: ''

    # Filter pull requests by base branch name. Example: gh-pages.
    base: ''

    # Run this command within the branch before rebasing against `base`
    command-to-run-before-rebase: ''

    # Run this command when a conflict is found, and try to merge again.
    command-to-run-on-conflict: ''

    # The default branch for the repo, defaults to master
    # Default: master
    default-branch: ''
```
<!-- end usage -->

### Periodically rebase all pull requests

The simplest way to use this action is to schedule it to run periodically.

```yaml
name: Rebase
on:
  schedule:
    - cron:  '0 0 * * *'
jobs:
  rebase:
    runs-on: Ubuntu-20.04
    steps:
      - uses: peter-evans/rebase@v1.0.11
```

### Rebase all pull requests on push to the base branch

```yaml
name: Rebase
on:
  push:
    branches: [master]
jobs:
  rebase:
    runs-on: Ubuntu-20.04
    steps:
      - uses: peter-evans/rebase@v1.0.11
        with:
          base: master
```

### Run commands before and after a rebase to handle rebase conflicts

```yaml
name: Rebase Open PR's after a Merge to Dev
on:
  push:
    branches:
      - dev
jobs:
  rebase:
    runs-on: Ubuntu-20.04
    steps:
      - uses: peter-evans/rebase@v1.0.11
        with:
          base: dev
          default-branch: dev
          command-to-run-before-rebase: bash -c "grep -m 1 -Po '<version>\K[^<]*' pom.xml > version.tmp"
          command-to-run-on-conflict: bash -c ".github/scripts/fix_version_conflicts.rb -s git -v $(cat version.tmp);git add pom.xml;git commit -m \"Fix merge conflict\""
```

**NOTE:** This example is using the ruby script for fixing conflicting version numbers in a pom file for maven projects found [here](https://gist.github.com/brettporter/1723108)

### Rebase slash command

Use the following two workflows and a `repo` scoped [PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token) to add a `/rebase` slash command to pull request comments.
The [slash-command-dispatch](https://github.com/peter-evans/slash-command-dispatch) action makes sure that the command is only executable by users with `write` access to the repository.

```yaml
name: Slash Command Dispatch
on:
  issue_comment:
    types: [created]
jobs:
  slashCommandDispatch:
    runs-on: Ubuntu-20.04
    steps:
      - name: Slash Command Dispatch
        uses: peter-evans/slash-command-dispatch@v1
        with:
          token: ${{ secrets.PAT }}
          commands: rebase
          permission: write
          issue-type: pull-request
```

### Action inputs

| Name                           | Description                                                                                                                                                                                        | Default                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `token`                        | `GITHUB_TOKEN` or a `repo` scoped [PAT](https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token).                                                              | `GITHUB_TOKEN`                           |
| `repository`                   | The target GitHub repository containing the pull request.                                                                                                                                          | `github.repository` (Current repository) |
| `head`                         | Filter pull requests by head user or head organization and branch name in the format `user:ref-name` or `organization:ref-name`. For example: `github:new-script-format` or `octocat:test-branch`. |                                          |
| `base`                         | Filter pull requests by base branch name. Example: `gh-pages`.                                                                                                                                     |                                          |
| `command-to-run-before-rebase` | Run this command within the branch before rebasing against `base`                                                                                                                                  |                                          |
| `command-to-run-on-conflict`   | Run this command when a conflict is found, and try to merge again.                                                                                                                                 |                                          |
| `default-branch`               | The default branch for the repo, defaults to master                                                                                                                                                | `master`                                 |

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
    runs-on: Ubuntu-20.04
    steps:
      - uses: peter-evans/rebase@v1.0.11
        with:
          token: ${{ secrets.PAT }}
          repository: ${{ matrix.repo }}
```

## License

[MIT](LICENSE)
