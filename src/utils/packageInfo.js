import { readFileSync } from 'fs'
import { execWithOutput } from '../utils/execWithOutput.js'

/**
 * Get info from the registry about a package that is already published.
 *
 * Returns null if package is not published to NPM.
 */
export async function getPublishedInfo() {
  try {
    const packageInfo = await execWithOutput('npm', ['view', '--json'])
    return packageInfo ? JSON.parse(packageInfo) : null
  } catch (error) {
    if (!error?.message?.match(/code E404/)) {
      throw error
    }
    return null
  }
}

/**
 * Get info from the local package.json file.
 *
 * This might need to become a bit more sophisticated if support for monorepos is added,
 * @see https://github.com/nearform-actions/optic-release-automation-action/issues/177
 */
export function getLocalInfo() {
  const packageJsonFile = readFileSync('./package.json', 'utf8')
  const packageInfo = JSON.parse(packageJsonFile)

  return packageInfo
}

export default {
  getLocalInfo,
  getPublishedInfo,
}
