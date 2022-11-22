'use strict'

const fs = require('fs')
const pMap = require('p-map')
const { logError, logInfo } = require('../log')

const { getPrNumbersFromReleaseNotes } = require('./releaseNotes')

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
    repoName,
    repoOwner,
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


  Your **[optic](https://github.com/nearform/optic-release-automation-action)** bot 📦🚀`
  }

  return `🎉 This issue has been resolved in version ${packageVersion} 🎉


  The release is available on:
  * [GitHub release](${releaseUrl})


  Your **[optic](https://github.com/nearform/optic-release-automation-action)** bot 📦🚀`
}

async function notifyIssues(
  githubClient,
  shouldPostNpmLink,
  owner,
  repo,
  release
) {
  const packageJsonFile = fs.readFileSync('./package.json', 'utf8')
  const packageJson = JSON.parse(packageJsonFile)

  const { name: packageName, version: packageVersion } = packageJson
  const { body: releaseNotes, html_url: releaseUrl } = release

  const prNumbers = getPrNumbersFromReleaseNotes(releaseNotes)

  const issueNumbersToNotify = (
    await pMap(prNumbers, ({ prNumber, repoOwner, repoName }) =>
      getLinkedIssueNumbers(
        githubClient,
        parseInt(prNumber, 10),
        repoOwner,
        repoName
      )
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
        logInfo(
          `Skipping external issue-${issueNumber}, repoOwner-${repoOwner} , repo-${repoName}`
        )
        return pMap.pMapSkip
      }
      const response = await githubClient.rest.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: issueNumber,
        body,
      })
      return response
    } catch (error) {
      logError(
        `Failed to create comment for issue-${issueNumber}, repo-${repoName}. Error-${error.message}`
      )
      return pMap.pMapSkip
    }
  }

  await pMap(issueNumbersToNotify, mapper, {
    concurrency: 10,
    stopOnError: false,
  })
}

exports.notifyIssues = notifyIssues
