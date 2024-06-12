import { satisfies } from 'semver'
import { execWithOutput } from './execWithOutput.js'
import { getLocalInfo, getPublishedInfo } from './packageInfo.js'

/**
 * Abort if the user specified they want NPM provenance, but their CI's NPM version doesn't support it.
 * If we continued, the release will go ahead with no warnings, and no provenance will be generated.
 */
export function checkIsSupported(npmVersion) {
  const validNpmVersion = '>=9.5.0'

  if (!satisfies(npmVersion, validNpmVersion)) {
    throw new Error(
      `Provenance requires NPM ${validNpmVersion}, but this action is using v${npmVersion}.
Either remove provenance from your release action's inputs, or update your release CI's NPM version.`
    )
  }
}

/**
 * Abort with a meaningful error if the user would get a misleading error message from NPM
 * due to an NPM bug that existed between 9.5.0 and 9.6.1.
 * As of April 2023, this would affect anyone whose CI is set to Node 18 (which defaults to NPM 9.5.1).
 */
export function checkPermissions(npmVersion) {
  // Bug was fixed in this NPM version - see https://github.com/npm/cli/pull/6226
  const correctNpmErrorVersion = '>=9.6.1'

  if (
    // Same test condition as in fixed versions of NPM
    !process.env.ACTIONS_ID_TOKEN_REQUEST_URL &&
    // Let NPM handle this itself after their bug was fixed, so we're not brittle against future changes
    !satisfies(npmVersion, correctNpmErrorVersion)
  ) {
    throw new Error(
      // Same error message as in fixed versions of NPM
      'Provenance generation in GitHub Actions requires "write" access to the "id-token" permission'
    )
  }
}

/**
 * NPM does an internal check on access that fails unnecessarily for first-time publication
 * of unscoped packages to NPM. Unscoped packages are always public, but NPM's provenance generation
 * doesn't realise this unless it sees the status in a previous release or in explicit options.
 */
export async function getAccessAdjustment({ access } = {}) {
  // Don't overrule any user-set access preference.
  if (access) return

  const { name: packageName, publishConfig } = getLocalInfo()

  // Don't do anything for scoped packages - those require being made public explicitly.
  // Let NPM's own validation handle it if a user tries to get provenance on a private package.
  // `.startsWith('@')` is what a lot of NPM internal code use to detect scoped packages,
  // they don't export any more sophisticated scoped name detector any more.
  if (packageName.startsWith('@')) return

  // Don't do anything if the user has set any access control in package.json publishConfig.
  // https://docs.npmjs.com/cli/v9/configuring-npm/package-json#publishconfig
  // Let NPM deal with that internally when `npm publish` reads the local package.json file.
  if (publishConfig?.access) return

  // Don't do anything if package is already published.
  const publishedInfo = await getPublishedInfo()
  if (publishedInfo) return

  // Set explicit public access **only** if it's unscoped (inherently public), a first publish
  // (so we know NPM will fail to realise that this is inherently public), and the user
  // has not attempted to explicitly set access themselves anywhere.
  return { access: 'public' }
}

/**
 * Fail fast and throw a meaningful error if NPM Provenance will fail silently or misleadingly,
 * and where necessary, provide new publish options without overriding user preferences or expectations.
 *
 * @see https://docs.npmjs.com/generating-provenance-statements
 */
export async function getProvenanceOptions(npmVersion, publishOptions) {
  if (!npmVersion) throw new Error('Current npm version not provided')
  checkIsSupported(npmVersion)
  checkPermissions(npmVersion)

  const extraOptions = await getAccessAdjustment(publishOptions)

  return extraOptions
}

/**
 * Gets npm version via `npm -v` on the command line.
 * Split out as its own export so it can be easily mocked in tests.
 */
export async function getNpmVersion() {
  return execWithOutput('npm', ['-v'])
}

export default {
  getProvenanceOptions,
  getNpmVersion,
  getAccessAdjustment,
  checkIsSupported,
  checkPermissions,
}
