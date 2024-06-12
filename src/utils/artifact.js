import { stat, readFile } from 'fs/promises'
import { context, getOctokit } from '@actions/github'
import { basename } from 'path'
import { archiveItem } from './archiver.js'
import { ZIP_EXTENSION } from '../const.js'

export const attach = async (path, releaseId, token) => {
  const filename = deriveFilename(path, ZIP_EXTENSION)

  /* istanbul ignore else */
  if (!path.endsWith(ZIP_EXTENSION)) {
    await archiveItem(path, filename)
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

    const { owner, repo } = context.repo
    const octokit = getOctokit(token)
    const response = await octokit.rest.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: releaseId,
      data,
      name: filename,
      label: filename,
      headers,
    })

    if (response.data.state !== 'uploaded') {
      throw new Error('The asset has not been uploaded properly.')
    }

    const { browser_download_url: url, label } = response.data

    return {
      url,
      label,
    }
  } catch (err) {
    throw new Error(`Unable to upload the asset to the release: ${err.message}`)
  }
}

const deriveFilename = (filePath, extension) => {
  return basename(filePath) + extension
}
