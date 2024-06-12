import { context, getOctokit } from '@actions/github'
import { logInfo, logError } from '../log.js'

export async function fetchLatestRelease(token) {
  try {
    logInfo('Fetching the latest release')

    const { owner, repo } = context.repo
    const octokit = getOctokit(token)
    const { data: latestRelease } = await octokit.rest.repos.getLatestRelease({
      owner,
      repo,
    })

    logInfo(
      `Latest release fetched successfully with tag: ${latestRelease.tag_name}`
    )

    return latestRelease
  } catch (err) {
    if (err.message === 'Not Found') {
      logInfo(`No previous releases found`)
      return
    }

    throw new Error(
      `An error occurred while fetching the latest release: ${err.message}`
    )
  }
}

export async function generateReleaseNotes(token, newVersion, baseVersion) {
  try {
    logInfo(`Generating release notes: [${baseVersion} -> ${newVersion}]`)

    const { owner, repo } = context.repo
    const octokit = getOctokit(token)

    const { data: releaseNotes } =
      await octokit.rest.repos.generateReleaseNotes({
        owner,
        repo,
        tag_name: newVersion,
        ...(baseVersion && { previous_tag_name: baseVersion }),
      })

    logInfo(`Release notes generated: [${baseVersion} -> ${newVersion}]`)

    return releaseNotes
  } catch (err) {
    throw new Error(
      `An error occurred while generating the release notes: ${err.message}`
    )
  }
}

export async function fetchReleaseByTag(token, tag) {
  try {
    logInfo(`Fetching release with tag: ${tag}`)

    const { owner, repo } = context.repo
    const octokit = getOctokit(token)
    const { data: release } = await octokit.rest.repos.getReleaseByTag({
      owner,
      repo,
      tag: tag,
    })

    logInfo(`Release fetched successfully with tag: ${release.tag_name}`)

    return release
  } catch (err) {
    if (err.message === 'Not Found') {
      logError(`Release with tag ${tag} not found.`)
      throw err
    }

    throw new Error(
      `An error occurred while fetching the release with tag ${tag}: ${err.message}`
    )
  }
}
