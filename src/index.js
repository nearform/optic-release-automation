import openPr from './openPr.js'
import release from './release.js'
import { AUTO_INPUT } from './const.js'
import { execWithOutput } from './utils/execWithOutput.js'
import { logError, logInfo } from './log.js'

export async function runAction({ github, context, inputs, packageVersion }) {
  if (context.eventName === 'workflow_dispatch') {
    return openPr({ context, inputs, packageVersion })
  }

  if (context.eventName === 'pull_request') {
    return release({ github, context, inputs })
  }

  logError('Unsupported event')
}

export async function bumpVersion({ inputs }) {
  const newVersion =
    inputs.semver === AUTO_INPUT
      ? await getAutoBumpedVersion(inputs['base-tag'])
      : inputs.semver

  const preReleasePrefix = inputs['prerelease-prefix'] || ''

  await execWithOutput('npm', [
    'version',
    '--no-git-tag-version',
    `--preid=${preReleasePrefix}`,
    newVersion,
  ])
  return await execWithOutput('npm', ['pkg', 'get', 'version'])
}

async function getAutoBumpedVersion(baseTag) {
  await execWithOutput('git', ['fetch', '--unshallow']) // by default optic does a shallow clone so we need to do this to get full commit history
  await execWithOutput('git', ['fetch', '--tags'])

  const tag =
    baseTag ||
    (await execWithOutput('git', ['tag', '--sort=-creatordate'])).split('\n')[0]

  logInfo(`Using ${tag} as base release tag for version bump`)

  const { Bumper } = await import('conventional-recommended-bump')

  const bumper = new Bumper(process.cwd())
  bumper.loadPreset('conventionalcommits')
  bumper.tag(tag)

  const { releaseType = 'patch' } = await bumper.bump()

  logInfo(`Auto generated release type is ${JSON.stringify(releaseType)}`)
  return releaseType
}
