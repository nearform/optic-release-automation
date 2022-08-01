'use strict'

const { stat, readFile } = require('fs/promises')
const github = require('@actions/github')
const { archiveItem } = require('./archiver')

const attachArtifact = async (path, filename, label, releaseId, token) => {
  try {
    await archiveItem(path, filename)
  } catch (err) {
    throw new Error(err.message)
  }

  // determine content-length for header to upload asset
  const { size: contentLength } = await stat(filename)

  // setup headers fro the API call
  const headers = {
    'content-type': 'application/zip',
    'content-length': contentLength,
  }

  try {
    const data = await readFile(filename)

    const { owner, repo } = github.context.repo
    const octokit = github.getOctokit(token)
    const postAssetResponse = await octokit.rest.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: releaseId,
      data,
      name: filename,
      label,
      headers,
    })

    if (!postAssetResponse.data) {
      throw new Error('POST asset response data not available')
    }

    const { browser_download_url: url, label: assetLabel } =
      postAssetResponse.data

    return {
      artifact: {
        isPresent: true,
        url,
        label: assetLabel,
      },
    }
  } catch (err) {
    throw new Error(`Unable to upload the asset to the release: ${err.message}`)
  }
}

exports.attachArtifact = attachArtifact
