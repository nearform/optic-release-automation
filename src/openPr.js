import { readFileSync } from 'fs'
import { join } from 'path'
import _template from 'lodash.template'
import { setFailed } from '@actions/core'

import { PR_TITLE_PREFIX } from './const.js'
import { callApi } from './utils/callApi.js'
import transformCommitMessage from './utils/commitMessage.js'
import { logInfo, logWarning } from './log.js'
import { attach } from './utils/artifact.js'
import { getPRBody } from './utils/releaseNotes.js'
import { execWithOutput } from './utils/execWithOutput.js'
import {
  generateReleaseNotes,
  fetchReleaseByTag,
  fetchLatestRelease,
} from './utils/releases.js'

const tpl = readFileSync(join(import.meta.dirname, 'pr.tpl'), 'utf8')

const addArtifact = async (inputs, releaseId) => {
  const artifactPath = inputs['artifact-path']
  const token = inputs['github-token']

  const artifact = await attach(artifactPath, releaseId, token)

  return artifact
}

const tryGetReleaseNotes = async (token, baseRelease, newVersion) => {
  try {
    if (!baseRelease) {
      return
    }

    const { tag_name: baseReleaseTag } = baseRelease

    const releaseNotes = await generateReleaseNotes(
      token,
      newVersion,
      baseReleaseTag
    )
    return releaseNotes?.body
  } catch (err) {
    logWarning(err.message)
  }
}

const createDraftRelease = async (inputs, newVersion, releaseNotes) => {
  try {
    const releaseCommitHash = await execWithOutput('git', ['rev-parse', 'HEAD'])

    logInfo(`Creating draft release from commit: ${releaseCommitHash}`)

    const { data: draftRelease } = await callApi(
      {
        method: 'POST',
        endpoint: 'release',
        body: {
          version: newVersion,
          target: releaseCommitHash,
          generateReleaseNotes: releaseNotes ? false : true,
          ...(releaseNotes && { releaseNotes }),
        },
      },
      inputs
    )

    if (!draftRelease?.id) {
      throw new Error(
        'API responded with a 200 status but no draft release returned.  Please clean up any artifacts (draft release, release branch, etc.) and try again'
      )
    }

    logInfo(`Draft release created successfully`)

    return draftRelease
  } catch (err) {
    throw new Error(`Unable to create draft release: ${err.message}`)
  }
}

export default async function ({ context, inputs, packageVersion }) {
  logInfo('** Starting Opening Release PR **')

  if (!packageVersion) {
    throw new Error('packageVersion is missing!')
  }

  const token = inputs['github-token']

  const baseTag = inputs['base-tag']
  const baseRelease = baseTag
    ? await fetchReleaseByTag(token, baseTag)
    : await fetchLatestRelease(token)

  const newVersion = `${inputs['version-prefix']}${packageVersion}`

  const branchName = `release/${newVersion}`

  const messageTemplate = inputs['commit-message']

  // first, call ls-remote to see if the branch already exists. if it gives us anything
  // back (i.e. the matching branch), we should bail out and instruct user to clean up
  // the remote or use a different version, otherwise proceed
  const branches = await execWithOutput('git', [
    'ls-remote',
    '--heads',
    'origin',
    branchName,
  ])
  if (branches.length !== 0) {
    throw new Error(
      `Release branch ${branchName} already exists on the remote.  Please either delete it and run again, or select a different version`
    )
  }

  await execWithOutput('git', ['checkout', '-b', branchName])
  await execWithOutput('git', ['add', '-A'])
  await execWithOutput('git', [
    'commit',
    '-m',
    `${transformCommitMessage(messageTemplate, newVersion)}`,
  ])

  await execWithOutput('git', ['push', 'origin', branchName])

  const releaseNotes = await tryGetReleaseNotes(token, baseRelease, newVersion)

  const draftRelease = await createDraftRelease(
    inputs,
    newVersion,
    releaseNotes
  )

  logInfo(`New version ${newVersion}`)

  const artifact =
    inputs['artifact-path'] && (await addArtifact(inputs, draftRelease.id))
  if (artifact) {
    logInfo('Artifact attached!')
  }

  const prBody = getPRBody(_template(tpl), {
    newVersion,
    draftRelease,
    inputs,
    author: context.actor,
    artifact,
  })
  try {
    const response = await callApi(
      {
        method: 'POST',
        endpoint: 'pr',
        body: {
          head: `refs/heads/${branchName}`,
          base: context.payload.ref,
          title: `${PR_TITLE_PREFIX} ${branchName}`,
          body: prBody,
        },
      },
      inputs
    )
    /* istanbul ignore else */
    if (response?.status !== 201) {
      const errMessage = response?.message || 'PR creation failed'
      throw new Error(errMessage)
    }
  } catch (err) {
    let message = `Unable to create the pull request ${err.message}`
    try {
      await execWithOutput('git', ['push', 'origin', '--delete', branchName])
    } catch (error) {
      message += `\n Unable to delete branch ${branchName}:  ${error.message}`
    }
    setFailed(message)
  }

  logInfo('** Finished! **')
}
