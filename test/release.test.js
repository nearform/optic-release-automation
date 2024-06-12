import t from 'tap'
import { stub, restore, assert } from 'sinon'
import clone from 'lodash.clonedeep'
import { PR_TITLE_PREFIX, APP_NAME } from '../src/const.js'

let deleteReleaseStub = stub().resolves()

let pullsGetStub = stub()
let createCommentStub = stub()
let getReleaseStub = stub().returns({ data: { draft: true } })

const DEFAULT_ACTION_DATA = {
  github: {
    rest: {
      repos: {
        deleteRelease: deleteReleaseStub,
        getRelease: getReleaseStub,
      },
      issues: { createComment: createCommentStub },
      pulls: { get: pullsGetStub },
    },
  },
  inputs: {
    semver: 'patch',
    'app-name': APP_NAME,
  },
  context: {
    eventName: 'pull_request',
    repo: {
      repo: 'repo',
      owner: 'test',
    },
    payload: {
      ref: 'ref',
      action: 'closed',
      pull_request: {
        base: {
          ref: 'base-ref',
        },
        merged: true,
        user: { login: 'optic-release-automation[bot]' },
        title: PR_TITLE_PREFIX,
        body:
          '<!--\n' +
          '<release-meta>{"id":54503465,"version":"v5.1.3","npmTag":"latest","opticUrl":"https://optic-test.run.app/api/generate/"}</release-meta>\n' +
          '-->',
      },
    },
  },
  packageVersion: '1.1.1',
  packageName: 'testPackageName',
}

/**
 * @param {{ npmVersion: string | undefined, env: Record<string, string> | undefined }} [options]
 */
async function setup({
  npmVersion,
  env,
  isPublished = true,
  isScoped = true,
} = {}) {
  if (env) {
    // Add any test-specific environment variables. They get cleaned up by tap.afterEach(sinon.restore).
    Object.entries(env).forEach(([key, value]) => {
      stub(process, 'env').value({ [key]: value })
    })
  }

  const logStub = { logError: stub(), logInfo: stub(), logWarning: stub() }

  const coreStub = {
    setFailed: stub(),
    debug: stub(),
    error: stub(),
    info: stub(),
    warning: stub(),
  }
  deleteReleaseStub.resetHistory()
  deleteReleaseStub.resolves()

  const execWithOutputStub = stub()
  execWithOutputStub
    .withArgs('curl', [
      '-s',
      'https://optic-test.run.app/api/generate/optic-token',
    ])
    .returns('otp123')

  const tagVersionStub = stub()
  const revertCommitStub = stub()
  const publishToNpmStub = stub()
  const notifyIssuesStub = stub()

  const packageName = isScoped ? '@some/package-name' : 'some-package-name'

  const provenanceProxy = {
    ...(await t.mockImport('../src/utils/provenance.js', {
      '../src/utils/packageInfo.js': {
        getLocalInfo: () => ({ name: packageName }),
        getPublishedInfo: async () =>
          isPublished ? { name: packageName } : null,
      },
    })),
    getNpmVersion: () => npmVersion || '',
  }

  const callApiStub = {
    callApi: stub().resolves({
      data: { body: 'test_body', html_url: 'test_url' },
    }),
  }

  const mockStubs = {
    '../src/log.js': logStub,
    '../src/utils/execWithOutput.js': { execWithOutput: execWithOutputStub },
    '../src/utils/tagVersion.js': {
      tagVersionInGit: tagVersionStub,
    },
    '../src/utils/revertCommit.js': {
      revertCommit: revertCommitStub,
    },
    '../src/utils/publishToNpm.js': {
      publishToNpm: publishToNpmStub,
    },
    '../src/utils/notifyIssues.js': {
      notifyIssues: notifyIssuesStub,
    },
    '../src/utils/provenance.js': provenanceProxy,
    '@actions/core': coreStub,
    '../src/utils/callApi.js': callApiStub,
  }

  const release = await t.mockImport('../src/release.js', mockStubs)

  return {
    release: release.default,
    stubs: {
      tagVersionStub,
      revertCommitStub,
      publishToNpmStub,
      notifyIssuesStub,
      execWithOutputStub,
      callApiStub,
      logStub,
      coreStub,
    },
  }
}

t.afterEach(() => {
  restore()
})

t.test('Should delete the release if the pr is not merged', async () => {
  const { release } = await setup()
  const data = clone(DEFAULT_ACTION_DATA)
  data.context.payload.pull_request.merged = false
  await release(data)

  assert.calledOnceWithExactly(deleteReleaseStub, {
    owner: DEFAULT_ACTION_DATA.context.repo.owner,
    repo: DEFAULT_ACTION_DATA.context.repo.repo,
    release_id: 54503465,
  })
})

t.test(
  'Should delete the release even if deleting the branch failed and should not fail',
  async () => {
    const { release, stubs } = await setup()
    const data = clone(DEFAULT_ACTION_DATA)
    data.context.payload.pull_request.merged = false
    stubs.execWithOutputStub.rejects(
      new Error('Something went wrong in the branch')
    )

    await release(data)

    assert.notCalled(stubs.coreStub.setFailed)
    assert.calledOnceWithExactly(deleteReleaseStub, {
      owner: DEFAULT_ACTION_DATA.context.repo.owner,
      repo: DEFAULT_ACTION_DATA.context.repo.repo,
      release_id: 54503465,
    })
  }
)

t.test('Should log an error if deleting the release fails', async () => {
  const { release, stubs } = await setup()
  const data = clone(DEFAULT_ACTION_DATA)
  data.context.payload.pull_request.merged = false
  deleteReleaseStub.rejects(new Error('Something went wrong in the release'))

  await release(data)

  assert.calledOnceWithExactly(
    stubs.coreStub.setFailed,
    `Something went wrong while deleting the release. \n Errors: Something went wrong in the release`
  )
})

t.test(
  'Should log and exit if both the release and the branch fail',
  async () => {
    const { release, stubs } = await setup()
    const data = clone(DEFAULT_ACTION_DATA)
    data.context.payload.pull_request.merged = false
    stubs.execWithOutputStub.rejects(
      new Error('Something went wrong in the branch')
    )
    deleteReleaseStub.rejects(new Error('Something went wrong in the release'))

    await release(data)

    assert.calledOnceWithExactly(
      stubs.coreStub.setFailed,
      `Something went wrong while deleting the release. \n Errors: Something went wrong in the release`
    )
    assert.notCalled(stubs.publishToNpmStub)
  }
)

t.test('Should publish to npm without optic', async () => {
  const { release, stubs } = await setup()
  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
    },
  })

  assert.calledWithMatch(stubs.publishToNpmStub, {
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
  })
})

t.test(
  'Should publish with provenance if flag set and conditions met',
  async t => {
    const { release, stubs } = await setup({
      npmVersion: '9.5.0', // valid
      env: { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.com' }, // valid
    })
    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        provenance: 'true',
      },
    })

    assert.notCalled(stubs.coreStub.setFailed)
    t.pass('not failed')

    assert.calledWithMatch(stubs.publishToNpmStub, {
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      provenance: true,
    })
    t.pass('publish called')
  }
)

t.test('Aborts publish with provenance if NPM version too old', async () => {
  const { release, stubs } = await setup({
    npmVersion: '9.4.0', // too old (is before 9.5.0)
    env: { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.com' }, // valid
  })

  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      provenance: 'true',
    },
  })

  assert.calledWithMatch(
    stubs.coreStub.setFailed,
    'Provenance requires NPM >=9.5.0, but this action is using v9.4.0'
  )
})

t.test('Aborts publish with provenance if missing permission', async () => {
  const { release, stubs } = await setup({
    npmVersion: '9.5.0', // valid, but before missing var is correctly handled on NPM's side (9.6.1)
    // missing ACTIONS_ID_TOKEN_REQUEST_URL which is set from `id-token: write` permission.
  })

  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      provenance: 'true',
    },
  })

  assert.calledWithMatch(
    stubs.coreStub.setFailed,
    'Provenance generation in GitHub Actions requires "write" access to the "id-token" permission'
  )
})

t.test('Should publish with --access public if flag set', async t => {
  const { release, stubs } = await setup()
  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      access: 'public',
    },
  })

  assert.notCalled(stubs.coreStub.setFailed)
  t.pass('did not set failed')

  assert.calledWithMatch(stubs.publishToNpmStub, {
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    access: 'public',
  })
  t.pass('called publishToNpm')
})

t.test('Should publish with --access restricted if flag set', async t => {
  const { release, stubs } = await setup()
  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      access: 'restricted',
    },
  })

  assert.notCalled(stubs.coreStub.setFailed)
  t.pass('did not set failed')

  assert.calledWithMatch(stubs.publishToNpmStub, {
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    access: 'restricted',
  })
  t.pass('called publishToNpm')
})

t.test('Should disallow unsupported --access flag', async () => {
  const { release, stubs } = await setup()

  const invalidString =
    'public; node -e "throw new Error(`arbitrary command executed`)"'

  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      access: invalidString,
    },
  })

  assert.calledWithMatch(
    stubs.coreStub.setFailed,
    `Invalid "access" option provided ("${invalidString}"), should be one of "public", "restricted"`
  )
})

t.test(
  'Should publish with --access public and provenance if unscoped and unpublished',
  async t => {
    const { release, stubs } = await setup({
      isScoped: false,
      isPublished: false,
      npmVersion: '9.5.0', // valid
      env: { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.com' }, // valid
    })
    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        provenance: true,
      },
    })

    assert.notCalled(stubs.coreStub.setFailed)
    t.pass('did not set failed')

    assert.calledWithMatch(stubs.publishToNpmStub, {
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      access: 'public',
      provenance: true,
    })
    t.pass('called publishToNpm')
  }
)

t.test(
  'Should not override access restricted with provenance while unscoped and unpublished',
  async t => {
    const { release, stubs } = await setup({
      isScoped: false,
      isPublished: false,
      npmVersion: '9.5.0', // valid
      env: { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.com' }, // valid
    })

    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        provenance: true,
        access: 'restricted',
      },
    })

    assert.notCalled(stubs.coreStub.setFailed)
    t.pass('did not set failed')

    assert.calledWithMatch(stubs.publishToNpmStub, {
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      access: 'restricted',
      provenance: true,
    })
    t.pass('called publishToNpm')
  }
)

t.test(
  'Should publish with provenance and not add access when scoped and unpublished',
  async t => {
    const { release, stubs } = await setup({
      isScoped: true,
      isPublished: false,
      npmVersion: '9.5.0', // valid
      env: { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.com' }, // valid
    })
    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        provenance: true,
      },
    })

    assert.notCalled(stubs.coreStub.setFailed)
    t.pass('did not set failed')

    assert.calledWithMatch(stubs.publishToNpmStub, {
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      provenance: true,
    })
    t.pass('called publishToNpm')
  }
)

t.test(
  'Should publish with provenance and not add access when unscoped and published',
  async t => {
    const { release, stubs } = await setup({
      isScoped: false,
      isPublished: true,
      npmVersion: '9.5.0', // valid
      env: { ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.com' }, // valid
    })
    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        provenance: true,
      },
    })

    assert.notCalled(stubs.coreStub.setFailed)
    t.pass('did not set failed')

    assert.calledWithMatch(stubs.publishToNpmStub, {
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      provenance: true,
    })
    t.pass('called publishToNpm')
  }
)

t.test('Should not publish to npm if there is no npm token', async () => {
  const { release, stubs } = await setup()
  stubs.callApiStub.callApi.throws()

  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'optic-token': 'optic-token',
      'sync-semver-tags': 'true',
    },
  })

  assert.notCalled(stubs.publishToNpmStub)
})

t.test('Should publish to npm with optic', async () => {
  const { release, stubs } = await setup()
  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      'optic-token': 'optic-token',
    },
  })

  assert.calledWithMatch(stubs.publishToNpmStub, {
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
  })
})

t.test('Should tag versions', async () => {
  const { release, stubs } = await setup()
  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      'optic-token': 'optic-token',
      'sync-semver-tags': 'true',
    },
  })

  assert.calledWithExactly(stubs.tagVersionStub, 'v5')
  assert.calledWithExactly(stubs.tagVersionStub, 'v5.1')
  assert.calledWithExactly(stubs.tagVersionStub, 'v5.1.3')
})

t.test('Should call the release method', async () => {
  const { release, stubs } = await setup()
  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      'optic-token': 'optic-token',
      'sync-semver-tags': 'true',
    },
  })

  assert.calledWithExactly(
    stubs.callApiStub.callApi,
    {
      endpoint: 'release',
      method: 'PATCH',
      body: {
        version: 'v5.1.3',
        releaseId: 54503465,
        isPreRelease: false,
      },
    },
    {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      'optic-token': 'optic-token',
      'sync-semver-tags': 'true',
    }
  )
})

t.test(
  'Should call the release method with the prerelease flag if the release is a prerelease',
  async () => {
    const { release, stubs } = await setup()

    const version = 'v5.1.3-next.1'
    const data = clone(DEFAULT_ACTION_DATA)
    data.context.payload.pull_request.body =
      '<!--\n' +
      `<release-meta>{"id":54503465,"version":"${version}","npmTag":"latest","opticUrl":"https://optic-test.run.app/api/generate/"}</release-meta>\n` +
      '-->'

    await release({
      ...data,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        'optic-token': 'optic-token',
        'sync-semver-tags': 'true',
      },
    })

    assert.notCalled(stubs.tagVersionStub)

    assert.calledWithExactly(
      stubs.callApiStub.callApi,
      {
        endpoint: 'release',
        method: 'PATCH',
        body: {
          version,
          releaseId: 54503465,
          isPreRelease: true,
        },
      },
      {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        'optic-token': 'optic-token',
        'sync-semver-tags': 'true',
      }
    )
  }
)

t.test(
  "Should NOT call the release method if the pr wasn't merged",
  async () => {
    const { release, stubs } = await setup()
    const data = clone(DEFAULT_ACTION_DATA)
    data.context.payload.pull_request.merged = false
    data.inputs = {
      ...data.inputs,
      'npm-token': 'a-token',
      'optic-token': 'optic-token',
      'sync-semver-tags': 'true',
    }
    await release(data)

    assert.notCalled(stubs.callApiStub.callApi)
  }
)

t.test("Should NOT use npm if the pr wasn't merged", async () => {
  const { release, stubs } = await setup()
  const data = clone(DEFAULT_ACTION_DATA)
  data.context.payload.pull_request.merged = false
  data.inputs = {
    ...data.inputs,
    'npm-token': 'a-token',
    'optic-token': 'optic-token',
    'sync-semver-tags': 'true',
  }
  await release(data)
  assert.notCalled(stubs.publishToNpmStub)
})

t.test("Should NOT tag version in git if the pr wasn't merged", async () => {
  const { release, stubs } = await setup()
  const data = clone(DEFAULT_ACTION_DATA)
  data.context.payload.pull_request.merged = false
  data.inputs = {
    ...data.inputs,
    'npm-token': 'a-token',
    'optic-token': 'optic-token',
    'sync-semver-tags': 'true',
  }
  await release(data)
  assert.notCalled(stubs.tagVersionStub)
})

t.test(
  'Should not do anything if the user is not optic-release-automation[bot]',
  async () => {
    const { release, stubs } = await setup()
    const data = clone(DEFAULT_ACTION_DATA)
    data.context.payload.pull_request.user.login = 'not_the_correct_one'
    await release(data)

    assert.notCalled(stubs.callApiStub.callApi)
    assert.notCalled(stubs.execWithOutputStub)
  }
)

t.test('Should fail if the release metadata is incorrect', async () => {
  const { release, stubs } = await setup()
  const data = clone(DEFAULT_ACTION_DATA)
  data.context.payload.pull_request.body = 'this data is not correct'
  await release(data)

  assert.calledOnce(stubs.logStub.logError)
  assert.notCalled(stubs.callApiStub.callApi)
  assert.notCalled(stubs.execWithOutputStub)
})

t.test(
  'Should call core.setFailed if the tagging the version in git fails',
  async () => {
    const { release, stubs } = await setup()
    stubs.tagVersionStub.throws()

    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        'optic-token': 'optic-token',
        'sync-semver-tags': 'true',
      },
    })

    assert.calledOnce(stubs.coreStub.setFailed)
  }
)

t.test('Should call core.setFailed if the release fails', async () => {
  const { release, stubs } = await setup()
  stubs.callApiStub.callApi.throws()

  await release({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'app-name': APP_NAME,
      'npm-token': 'a-token',
      'optic-token': 'optic-token',
      'sync-semver-tags': 'true',
      'revert-commit-after-failure': 'true',
    },
  })

  assert.calledWithExactly(stubs.revertCommitStub, 'base-ref')
  assert.calledOnce(stubs.coreStub.setFailed)
})

t.test(
  'Should call core.setFailed but not revert the commit when publish to npm fails',
  async () => {
    const { release, stubs } = await setup()
    stubs.publishToNpmStub.throws()

    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        'optic-token': 'optic-token',
        'sync-semver-tags': 'true',
      },
    })

    assert.notCalled(stubs.revertCommitStub)
    assert.calledOnce(stubs.coreStub.setFailed)
  }
)

t.test(
  'Should call core.setFailed and revert the commit when publish to npm fails',
  async () => {
    const { release, stubs } = await setup()
    stubs.publishToNpmStub.throws()

    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        'optic-token': 'optic-token',
        'sync-semver-tags': 'true',
        'revert-commit-after-failure': 'true',
      },
    })

    assert.calledWithExactly(stubs.revertCommitStub, 'base-ref')
    assert.calledOnce(stubs.coreStub.setFailed)
  }
)

t.test('Should tag the major, minor & patch correctly for 0', async () => {
  const { release, stubs } = await setup()
  stubs.callApiStub.callApi.throws()

  const data = clone(DEFAULT_ACTION_DATA)
  data.inputs = {
    ...data.inputs,
    'npm-token': 'a-token',
    'optic-token': 'optic-token',
    'sync-semver-tags': 'true',
  }
  data.context.payload.pull_request.body =
    '<!--\n' +
    '<release-meta>{"id":54503465,"version":"v0.0.1","npmTag":"latest","opticUrl":"https://optic-zf3votdk5a-ew.a.run.app/api/generate/"}</release-meta>\n' +
    '-->'

  await release(data)

  assert.calledWithExactly(stubs.tagVersionStub, 'v0')
  assert.calledWithExactly(stubs.tagVersionStub, 'v0.0')
  assert.calledWithExactly(stubs.tagVersionStub, 'v0.0.1')
})

t.test('Should tag the major, minor & patch correctly', async () => {
  const { release, stubs } = await setup()
  stubs.callApiStub.callApi.throws()

  const data = clone(DEFAULT_ACTION_DATA)
  data.inputs = {
    ...data.inputs,
    'npm-token': 'a-token',
    'optic-token': 'optic-token',
    'sync-semver-tags': 'true',
  }
  data.context.payload.pull_request.body =
    '<!--\n' +
    '<release-meta>{"id":54503465,"version":"v5.0.0","npmTag":"latest","opticUrl":"https://optic-zf3votdk5a-ew.a.run.app/api/generate/"}</release-meta>\n' +
    '-->'

  await release(data)

  assert.calledWithExactly(stubs.tagVersionStub, 'v5')
  assert.calledWithExactly(stubs.tagVersionStub, 'v5.0')
  assert.calledWithExactly(stubs.tagVersionStub, 'v5.0.0')
})

t.test(
  'Should delete the release branch ALWAYS when the PR is closed',
  async () => {
    const { release, stubs } = await setup()

    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        'optic-token': 'optic-token',
        'sync-semver-tags': 'true',
      },
    })

    // We check that it's actually the first command line command to be executed
    assert.calledWithExactly(stubs.execWithOutputStub.getCall(0), 'git', [
      'push',
      'origin',
      '--delete',
      'release/v5.1.3',
    ])
  }
)

t.test(
  'Should NOT delete the release branch if the PR is not closed',
  async () => {
    const { release, stubs } = await setup()

    const data = clone(DEFAULT_ACTION_DATA)
    data.inputs = {
      ...data.inputs,
      'npm-token': 'a-token',
      'optic-token': 'optic-token',
      'sync-semver-tags': 'true',
    }
    data.context.payload.action = 'something_else' // Not closed

    await release(data)

    assert.neverCalledWith(stubs.execWithOutputStub, 'git', [
      'push',
      'origin',
      '--delete',
      'release/v5.1.3',
    ])
  }
)

t.test(
  'Should call notifyIssues function correctly when feature is enabled',
  async () => {
    const { release, stubs } = await setup()
    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        'notify-linked-issues': 'true',
      },
    })

    assert.calledWith(
      stubs.notifyIssuesStub,
      DEFAULT_ACTION_DATA.github,
      true,
      'test',
      'repo',
      { body: 'test_body', html_url: 'test_url' }
    )
  }
)

t.test(
  'Should not call notifyIssues function when feature is disabled',
  async () => {
    const { release, stubs } = await setup()
    await release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        'notify-linked-issues': 'false',
      },
    })

    assert.notCalled(stubs.notifyIssuesStub)
  }
)

t.test('Should not reject when notifyIssues fails', async t => {
  const { release, stubs } = await setup()

  stubs.notifyIssuesStub.rejects()

  await t.resolves(
    release({
      ...DEFAULT_ACTION_DATA,
      inputs: {
        'app-name': APP_NAME,
        'npm-token': 'a-token',
        'notify-linked-issues': 'true',
      },
    })
  )
})

t.test('Should fail when getting draft release fails', async () => {
  const { release, stubs } = await setup()

  await release({
    ...DEFAULT_ACTION_DATA,
    github: {
      ...DEFAULT_ACTION_DATA.github,
      rest: {
        ...DEFAULT_ACTION_DATA.github.rest,
        repos: {
          ...DEFAULT_ACTION_DATA.github.rest,
          getRelease: stub().rejects(),
        },
      },
    },
  })

  assert.called(stubs.coreStub.setFailed)
})

t.test('Should fail when release is not found', async () => {
  const { release, stubs } = await setup()

  await release({
    ...DEFAULT_ACTION_DATA,
    github: {
      ...DEFAULT_ACTION_DATA.github,
      rest: {
        ...DEFAULT_ACTION_DATA.github.rest,
        repos: {
          ...DEFAULT_ACTION_DATA.github.rest,
          getRelease: stub().returns({ data: undefined }),
        },
      },
    },
  })

  assert.calledWith(
    stubs.coreStub.setFailed,
    `Couldn't find draft release to publish. Aborting.`
  )
})

t.test('Should not fail when release is not a draft', async () => {
  const { release, stubs } = await setup()

  await release({
    ...DEFAULT_ACTION_DATA,
    github: {
      ...DEFAULT_ACTION_DATA.github,
      rest: {
        ...DEFAULT_ACTION_DATA.github.rest,
        repos: {
          ...DEFAULT_ACTION_DATA.github.rest,
          getRelease: stub().returns({ data: { draft: false } }),
        },
      },
    },
  })

  assert.notCalled(stubs.coreStub.setFailed)
})
