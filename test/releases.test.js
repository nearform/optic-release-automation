import { afterEach, test, mockImport } from 'tap'
import { stub, restore } from 'sinon'
// import actionLog from '../src/log.js'

const TOKEN = 'GH-TOKEN'
const TAG = 'v1.0.1'

const setup = async ({ throwsError }) => {
  const logStub = { logError: stub(), logInfo: stub(), logWarning: stub() }

  const releasesModule = await mockImport('../src/utils/releases.js', {
    '../src/log.js': logStub,
    '@actions/github': {
      context: {
        repo: {
          repo: 'repo',
          owner: 'owner',
        },
      },
      getOctokit: () => ({
        rest: {
          repos: {
            getLatestRelease: async () => {
              if (throwsError) {
                throw new Error()
              }
              return {
                status: 200,
                data: {},
              }
            },
            generateReleaseNotes: async () => {
              if (throwsError) {
                throw new Error()
              }
              return {
                status: 200,
                data: {},
              }
            },
            getReleaseByTag: async () => {
              if (throwsError) {
                throw new Error()
              }
              return {
                status: 200,
                data: {},
              }
            },
          },
        },
      }),
    },
  })

  return { logStub, releasesModule }
}

afterEach(() => {
  restore()
})

test('fetchLatestRelease return properly the latest release', async t => {
  const { releasesModule } = await setup({ throwsError: false })

  await t.resolves(releasesModule.fetchLatestRelease(TOKEN))
})

test('fetchLatestRelease throws an error if an exception occurs while calling GitHub APIs', async t => {
  const { releasesModule } = await setup({ throwsError: true })

  await t.rejects(releasesModule.fetchLatestRelease(TOKEN))
})

test('generateReleaseNotes return properly the generated release notes', async t => {
  const { releasesModule } = await setup({ throwsError: false })

  await t.resolves(releasesModule.generateReleaseNotes(TOKEN, '1.1.0', '1.0.0'))
})

test('generateReleaseNotes throws an error if an exception occurs while calling GitHub APIs', async t => {
  const { releasesModule } = await setup({ throwsError: true })

  await t.rejects(releasesModule.generateReleaseNotes(TOKEN))
})

test('fetchLatestRelease returns null if no previous releases are found', async t => {
  const logStub = { logError: stub(), logInfo: stub(), logWarning: stub() }
  const releasesModule = await mockImport('../src/utils/releases.js', {
    '../src/log.js': logStub,
    '@actions/github': {
      context: {
        repo: {
          repo: 'repo',
          owner: 'owner',
        },
      },
      getOctokit: () => ({
        rest: {
          repos: {
            getLatestRelease: async () => {
              throw new Error('Not Found')
            },
          },
        },
      }),
    },
  })

  await t.resolves(releasesModule.fetchLatestRelease(TOKEN))
})

test('fetchReleaseByTag return properly the specified release', async t => {
  const { releasesModule } = await setup({ throwsError: false })

  await t.resolves(releasesModule.fetchReleaseByTag(TOKEN, TAG))
})

test('fetchReleaseByTag throws an error if an exception occurs while calling GitHub APIs', async t => {
  const { releasesModule } = await setup({ throwsError: true })

  await t.rejects(releasesModule.fetchReleaseByTag(TOKEN, TAG))
})

test('fetchReleaseByTag throws an error if Not Found', async t => {
  const logStub = { logError: stub(), logInfo: stub(), logWarning: stub() }
  const releasesModule = await mockImport('../src/utils/releases.js', {
    '../src/log.js': logStub,
    '@actions/github': {
      context: {
        repo: {
          repo: 'repo',
          owner: 'owner',
        },
      },
      getOctokit: () => ({
        rest: {
          repos: {
            getReleaseByTag: async () => {
              throw new Error('Not Found')
            },
          },
        },
      }),
    },
  })

  await t.rejects(releasesModule.fetchReleaseByTag(TOKEN, TAG))
})
