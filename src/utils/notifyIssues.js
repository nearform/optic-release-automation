import pMap from 'p-map'
import { logWarning } from '../log.js'

import { getPrNumbersFromReleaseNotes } from './releaseNotes.js'
import { getLocalInfo } from '../utils/packageInfo.js'

const { pMapSkip } = pMap

async function getLinkedIssueNumbers(github, prNumber, repoOwner, repoName) {
  const data = await github.graphql(
    `
    query getLinkedIssues($repoOwner: String!, $repoName: String!, $prNumber: Int!) {
      repository(owner: $repoOwner, name: $repoName) {
        pullRequest(number: $prNumber) {
          id
          closingIssuesReferences(first: 100) {
            nodes {
              id
              number
              repository {
                name
                owner {
                  login
                }
              }
            }
          }
        }
      }
    }
    `,
    {
      repoOwner,
      repoName,
      prNumber,
    }
  )

  const linkedIssues =
    data?.repository?.pullRequest?.closingIssuesReferences?.nodes

  if (!linkedIssues) {
    return []
  }

  return linkedIssues.map(issue => ({
    issueNumber: issue.number,
    repoName: issue?.repository?.name,
    repoOwner: issue?.repository?.owner?.login,
  }))
}

function createCommentBody(
  shouldPostNpmLink,
  packageName,
  packageVersion,
  releaseUrl
) {
  const npmUrl = `https://www.npmjs.com/package/${packageName}/v/${packageVersion}`

  if (shouldPostNpmLink) {
    return `🎉 This issue has been resolved in version ${packageVersion} 🎉


  The release is available on:
  * [npm package](${npmUrl})
  * [GitHub release](${releaseUrl})


  Your **[optic](https://github.com/nearform-actions/optic-release-automation-action)** bot 📦🚀`
  }

  return `🎉 This issue has been resolved in version ${packageVersion} 🎉


  The release is available on:
  * [GitHub release](${releaseUrl})


  Your **[optic](https://github.com/nearform-actions/optic-release-automation-action)** bot 📦🚀`
}

export async function notifyIssues(
  githubClient,
  shouldPostNpmLink,
  owner,
  repo,
  release
) {
  const packageJson = getLocalInfo()

  const { name: packageName, version: packageVersion } = packageJson
  const { body: releaseNotes, html_url: releaseUrl } = release

  const prNumbers = getPrNumbersFromReleaseNotes(releaseNotes)

  const issueNumbersToNotify = (
    await pMap(prNumbers, prNumber =>
      getLinkedIssueNumbers(githubClient, parseInt(prNumber, 10), owner, repo)
    )
  ).flat()

  const body = createCommentBody(
    shouldPostNpmLink,
    packageName,
    packageVersion,
    releaseUrl
  )

  const mapper = async ({ issueNumber, repoOwner, repoName }) => {
    try {
      if (repoOwner !== owner || repoName !== repo) {
        logWarning(
          `Skipping external issue-${issueNumber}, repoOwner-${repoOwner} , repo-${repoName}`
        )
        return pMapSkip
      }

      return await githubClient.rest.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: issueNumber,
        body,
      })
    } catch (error) {
      logWarning(
        `Failed to create comment for issue-${issueNumber}, repo-${repoName}. Error-${error.message}`
      )
      return pMapSkip
    }
  }

  await pMap(issueNumbersToNotify, mapper, {
    concurrency: 10,
    stopOnError: false,
  })
}
