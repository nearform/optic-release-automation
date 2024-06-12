import t from 'tap'
import { stub, restore, assert } from 'sinon'
import clone from 'lodash.clonedeep'
import { PR_TITLE_PREFIX } from '../src/const.js'

const TEST_RELEASE_NOTES = 'Release Notes'
const TEST_BASE_TAG_VERSION = 'v1.0.0'
const TEST_LATEST_VERSION = '3.1.0'
const TEST_VERSION = '3.1.1'
const TEST_COMMIT_HASH = 'c86b0a35014a7036b245f81ff9de9bd738a5fe95'

async function setup() {
  const attachArtifactStub = stub().resolves({
    artifact: {
      isPresent: true,
      url: 'https://example.com',
      label: 'label',
    },
  })

  const callApiStub = stub().resolves({
    data: { id: 'foo' },
  })

  const coreStub = {
    setFailed: stub(),
    debug: stub(),
    error: stub(),
    info: stub(),
    warning: stub(),
  }

  const execWithOutputStub = stub().resolves(TEST_VERSION)
  execWithOutputStub
    .withArgs('git', ['rev-parse', 'HEAD'])
    .resolves(TEST_COMMIT_HASH)
  execWithOutputStub
    .withArgs('git', ['ls-remote', '--heads', 'origin', 'release/v3.1.1'])
    .resolves('')
  execWithOutputStub
    .withArgs('git', ['ls-remote', '--heads', 'origin', 'release/3.1.1'])
    .resolves('')
  execWithOutputStub
    .withArgs('git', ['ls-remote', '--heads', 'origin', 'release/v2.0.0'])
    .resolves('')
  execWithOutputStub
    .withArgs('git', ['ls-remote', '--heads', 'origin', 'release/v0.0.5'])
    .resolves('')

  const releasesFetchLatestReleaseStub = stub().returns({
    tag_name: TEST_LATEST_VERSION,
  })

  const releasesFetchReleaseByTagStub = stub().returns({
    tag_name: TEST_BASE_TAG_VERSION,
  })

  const releasesGenerateReleaseNotesStub = stub().returns({
    body: TEST_RELEASE_NOTES,
  })

  const openPr = await t.mockImport('../src/openPr.js', {
    '../src/utils/execWithOutput.js': { execWithOutput: execWithOutputStub },
    '../src/utils/artifact.js': {
      attach: attachArtifactStub,
    },
    '../src/utils/callApi.js': { callApi: callApiStub },
    '../src/utils/releases.js': {
      generateReleaseNotes: releasesGenerateReleaseNotesStub,
      fetchReleaseByTag: releasesFetchReleaseByTagStub,
      fetchLatestRelease: releasesFetchLatestReleaseStub,
    },

    '@actions/core': coreStub,
  })

  return {
    openPr: openPr.default,
    stubs: {
      execWithOutputStub,
      callApiStub,
      coreStub,
      attachArtifactStub,
      releasesFetchReleaseByTagStub,
      releasesFetchLatestReleaseStub,
      releasesGenerateReleaseNotesStub,
    },
  }
}

t.afterEach(() => {
  restore()
})

const DEFAULT_ACTION_DATA = {
  packageVersion: TEST_VERSION,
  inputs: {
    semver: 'patch',
    'commit-message': 'Release {version}',
    'version-prefix': 'v',
  },
  context: {
    actor: 'John',
    eventName: 'pull_request',
    repo: {
      repo: {},
      owner: {},
    },
    payload: {
      ref: 'ref',
      action: 'closed',
      pull_request: {
        user: { login: 'optic-release-automation[bot]' },
        title: PR_TITLE_PREFIX,
      },
    },
  },
}

t.test(
  'should trigger an error when the packageVersion is missing',
  async t => {
    const { openPr } = await setup()

    await t.rejects(
      openPr({
        ...DEFAULT_ACTION_DATA,
        packageVersion: undefined,
      }),
      'packageVersion is missing'
    )
  }
)

t.test('should trigger an error if the branch already exists', async t => {
  const { openPr, stubs } = await setup()

  const actionData = {
    ...DEFAULT_ACTION_DATA,
    packageVersion: '1.2.3',
  }

  stubs.execWithOutputStub
    .withArgs('git', ['ls-remote', '--heads', 'origin', 'release/v1.2.3'])
    .resolves('somehashhere          refs/heads/release/v1.2.3')

  await t.rejects(
    openPr(actionData),
    'Release branch release/v1.2.3 already exists on the remote.  Please either delete it and run again, or select a different version'
  )
})

t.test('should create a new git branch', async () => {
  const { openPr, stubs } = await setup()
  await openPr(DEFAULT_ACTION_DATA)

  const branchName = `release/v${TEST_VERSION}`

  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'checkout',
    '-b',
    branchName,
  ])
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', ['add', '-A'])
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'commit',
    '-m',
    `Release v${TEST_VERSION}`,
  ])
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'push',
    'origin',
    branchName,
  ])
})

t.test('should handle custom commit messages', async () => {
  const { openPr, stubs } = await setup()
  const data = clone(DEFAULT_ACTION_DATA)
  data.inputs['commit-message'] =
    '[{version}] The brand new {version} has been released'
  await openPr(data)

  const branchName = `release/v${TEST_VERSION}`

  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'checkout',
    '-b',
    branchName,
  ])
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'commit',
    '-m',
    `[v${TEST_VERSION}] The brand new v${TEST_VERSION} has been released`,
  ])
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'push',
    'origin',
    branchName,
  ])
})

t.test('should work with a custom version-prefix', async () => {
  const { openPr, stubs } = await setup()

  const prData = {
    ...DEFAULT_ACTION_DATA,
    inputs: {
      ...DEFAULT_ACTION_DATA.inputs,
      'version-prefix': '',
    },
  }

  await openPr(prData)

  const branchName = `release/${TEST_VERSION}`

  // git
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'ls-remote',
    '--heads',
    'origin',
    branchName,
  ])
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'checkout',
    '-b',
    branchName,
  ])
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', ['add', '-A'])
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'commit',
    '-m',
    `Release ${TEST_VERSION}`,
  ])
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'push',
    'origin',
    branchName,
  ])

  // github release
  assert.calledWithExactly(
    stubs.callApiStub,
    {
      method: 'POST',
      endpoint: 'release',
      body: {
        version: TEST_VERSION,
        target: TEST_COMMIT_HASH,
        generateReleaseNotes: false,
        releaseNotes: TEST_RELEASE_NOTES,
      },
    },
    prData.inputs
  )

  assert.calledWithMatch(stubs.callApiStub, {
    method: 'POST',
    endpoint: 'pr',
    body: {
      head: `refs/heads/${branchName}`,
    },
  })
})

t.test('should call the release endpoint with a new version', async () => {
  const { openPr, stubs } = await setup()
  await openPr(DEFAULT_ACTION_DATA)

  assert.calledWithExactly(
    stubs.callApiStub,
    {
      method: 'POST',
      endpoint: 'release',
      body: {
        version: `v${TEST_VERSION}`,
        target: TEST_COMMIT_HASH,
        generateReleaseNotes: false,
        releaseNotes: TEST_RELEASE_NOTES,
      },
    },
    DEFAULT_ACTION_DATA.inputs
  )
})

t.test(
  'should trigger an error if the release endpoint responds with an invalid draft release',
  async t => {
    const { openPr, stubs } = await setup()

    stubs.callApiStub.resolves({})

    await t.rejects(
      openPr(DEFAULT_ACTION_DATA),
      'Unable to create draft release: API responded with a 200 status but no draft release returned.  Please clean up any artifacts (draft release, release branch, etc.) and try again'
    )
  }
)

t.test('should call the PR endpoint with a new version', async () => {
  const { openPr, stubs } = await setup()
  await openPr(DEFAULT_ACTION_DATA)

  const branchName = `release/v${TEST_VERSION}`

  assert.calledWithExactly(
    stubs.callApiStub,
    {
      method: 'POST',
      endpoint: 'pr',
      body: {
        head: `refs/heads/${branchName}`,
        base: DEFAULT_ACTION_DATA.context.payload.ref,
        title: `${PR_TITLE_PREFIX} ${branchName}`,
        body:
          '## Optic Release Automation\n' +
          '\n' +
          'This **draft** PR is opened by Github action [optic-release-automation-action](https://github.com/nearform-actions/optic-release-automation-action).\n' +
          '\n' +
          `A new **draft** GitHub release [v${TEST_VERSION}]() has been created.\n` +
          '\n' +
          `Release author: @John\n` +
          '\n' +
          '#### If you want to go ahead with the release, please merge this PR. When you merge:\n' +
          '\n' +
          '- The GitHub release will be published\n' +
          '\n' +
          '- No npm package will be published as configured\n' +
          '\n' +
          '\n' +
          '\n' +
          '- No major or minor tags will be updated as configured\n' +
          '\n' +
          '\n' +
          '#### If you close the PR\n' +
          '\n' +
          '- The new draft release will be deleted and nothing will change\n' +
          '\n' +
          '\n' +
          '\n' +
          '<!--\n' +
          `<release-meta>{"id":"foo","version":"v${TEST_VERSION}"}</release-meta>\n` +
          '-->\n',
      },
    },
    DEFAULT_ACTION_DATA.inputs
  )
})

t.test(
  'should create the correct release for a version with no minor',
  async () => {
    const localVersion = '2.0.0'
    const { openPr, stubs } = await setup()

    stubs.execWithOutputStub.returns(localVersion)

    await openPr({
      ...DEFAULT_ACTION_DATA,
      packageVersion: localVersion,
    })
    const branchName = `release/v${localVersion}`
    assert.calledWithExactly(
      stubs.callApiStub,
      {
        method: 'POST',
        endpoint: 'pr',
        body: {
          head: `refs/heads/${branchName}`,
          base: DEFAULT_ACTION_DATA.context.payload.ref,
          title: `${PR_TITLE_PREFIX} ${branchName}`,
          body:
            '## Optic Release Automation\n' +
            '\n' +
            'This **draft** PR is opened by Github action [optic-release-automation-action](https://github.com/nearform-actions/optic-release-automation-action).\n' +
            '\n' +
            `A new **draft** GitHub release [v${localVersion}]() has been created.\n` +
            '\n' +
            `Release author: @John\n` +
            '\n' +
            '#### If you want to go ahead with the release, please merge this PR. When you merge:\n' +
            '\n' +
            '- The GitHub release will be published\n' +
            '\n' +
            '- No npm package will be published as configured\n' +
            '\n' +
            '\n' +
            '\n' +
            '- No major or minor tags will be updated as configured\n' +
            '\n' +
            '\n' +
            '#### If you close the PR\n' +
            '\n' +
            '- The new draft release will be deleted and nothing will change\n' +
            '\n' +
            '\n' +
            '\n' +
            '<!--\n' +
            `<release-meta>{"id":"foo","version":"v${localVersion}"}</release-meta>\n` +
            '-->\n',
        },
      },
      DEFAULT_ACTION_DATA.inputs
    )
  }
)

t.test(
  'should create the correct release for a version with no major',
  async () => {
    const localVersion = '0.0.5'
    const { openPr, stubs } = await setup()

    stubs.execWithOutputStub.returns(localVersion)

    await openPr({
      ...DEFAULT_ACTION_DATA,
      packageVersion: localVersion,
    })
    const branchName = `release/v${localVersion}`
    assert.calledWithExactly(
      stubs.callApiStub,
      {
        method: 'POST',
        endpoint: 'pr',
        body: {
          head: `refs/heads/${branchName}`,
          base: DEFAULT_ACTION_DATA.context.payload.ref,
          title: `${PR_TITLE_PREFIX} ${branchName}`,
          body:
            '## Optic Release Automation\n' +
            '\n' +
            'This **draft** PR is opened by Github action [optic-release-automation-action](https://github.com/nearform-actions/optic-release-automation-action).\n' +
            '\n' +
            `A new **draft** GitHub release [v${localVersion}]() has been created.\n` +
            '\n' +
            `Release author: @John\n` +
            '\n' +
            '#### If you want to go ahead with the release, please merge this PR. When you merge:\n' +
            '\n' +
            '- The GitHub release will be published\n' +
            '\n' +
            '- No npm package will be published as configured\n' +
            '\n' +
            '\n' +
            '\n' +
            '- No major or minor tags will be updated as configured\n' +
            '\n' +
            '\n' +
            '#### If you close the PR\n' +
            '\n' +
            '- The new draft release will be deleted and nothing will change\n' +
            '\n' +
            '\n' +
            '\n' +
            '<!--\n' +
            `<release-meta>{"id":"foo","version":"v${localVersion}"}</release-meta>\n` +
            '-->\n',
        },
      },
      DEFAULT_ACTION_DATA.inputs
    )
  }
)

t.test('should delete branch in case of pr failure', async t => {
  const localVersion = '0.0.5'
  const { openPr, stubs } = await setup()
  const { context, inputs } = DEFAULT_ACTION_DATA

  stubs.callApiStub.onCall(1).rejects()

  await openPr({ context, inputs, packageVersion: localVersion })

  const branchName = `release/v${localVersion}`
  assert.calledWithExactly(stubs.execWithOutputStub, 'git', [
    'push',
    'origin',
    '--delete',
    branchName,
  ])
  t.pass('branch deleted')
})

t.test('Should call core.setFailed if it fails to create a PR', async t => {
  const branchName = `release/v${TEST_VERSION}`

  const { openPr, stubs } = await setup()
  const { context, inputs, packageVersion } = DEFAULT_ACTION_DATA
  stubs.callApiStub.onCall(1).rejects()

  stubs.execWithOutputStub
    .withArgs('git', ['push', 'origin', '--delete', branchName])
    .rejects()

  await openPr({ context, inputs, packageVersion })

  assert.calledOnce(stubs.coreStub.setFailed)
  t.pass('failed called')
})

t.test(
  'should call attachArtifact if artifact-path input is present',
  async () => {
    const { openPr, stubs } = await setup()
    const data = clone(DEFAULT_ACTION_DATA)
    data.inputs['artifact-path'] = 'dist'
    await openPr(data)

    assert.calledOnce(stubs.attachArtifactStub)
  }
)

t.test('should not open Pr if create release draft fails', async t => {
  const { openPr, stubs } = await setup()
  stubs.callApiStub.throws({ message: 'error message' })

  await t.rejects(
    openPr(DEFAULT_ACTION_DATA),
    'Unable to create draft release: error message'
  )
})

t.test(
  'should generate release notes if the latest release has not been found -> first release',
  async () => {
    const { openPr, stubs } = await setup()
    stubs.releasesFetchLatestReleaseStub =
      stubs.releasesFetchLatestReleaseStub.returns(null)

    await openPr(DEFAULT_ACTION_DATA)

    assert.calledWithExactly(
      stubs.callApiStub,
      {
        method: 'POST',
        endpoint: 'release',
        body: {
          version: `v${TEST_VERSION}`,
          target: TEST_COMMIT_HASH,
          generateReleaseNotes: true,
        },
      },
      DEFAULT_ACTION_DATA.inputs
    )
  }
)

t.test(
  'should automatically generate release notes if an error occurred while generating the specific release notes',
  async () => {
    const { openPr, stubs } = await setup()
    stubs.releasesGenerateReleaseNotesStub =
      stubs.releasesGenerateReleaseNotesStub.throws({
        message: 'Unexpected Error',
      })

    await openPr(DEFAULT_ACTION_DATA)

    assert.calledWithExactly(
      stubs.callApiStub,
      {
        method: 'POST',
        endpoint: 'release',
        body: {
          version: `v${TEST_VERSION}`,
          target: TEST_COMMIT_HASH,
          generateReleaseNotes: true,
        },
      },
      DEFAULT_ACTION_DATA.inputs
    )
  }
)

t.test(
  'should retrieve the specified base-tag release and POST a release with the generated release notes',
  async () => {
    const { openPr, stubs } = await setup()

    const data = clone(DEFAULT_ACTION_DATA)
    data.inputs['base-tag'] = TEST_BASE_TAG_VERSION

    await openPr(data)

    assert.calledWithExactly(
      stubs.callApiStub,
      {
        method: 'POST',
        endpoint: 'release',
        body: {
          version: `v${TEST_VERSION}`,
          target: TEST_COMMIT_HASH,
          generateReleaseNotes: false,
          releaseNotes: TEST_RELEASE_NOTES,
        },
      },
      data.inputs
    )
  }
)
