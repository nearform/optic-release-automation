import { afterEach, test, mockImport } from 'tap'
import { stub, restore, assert } from 'sinon'

import { PR_TITLE_PREFIX } from '../src/const.js'

async function buildStubbedAction() {
  const logStub = { logError: stub(), logInfo: stub(), logWarning: stub() }
  const releaseStub = stub()
  const openPrStub = stub()
  const bumperStub = stub()
  const execWithOutputStub = stub()
  const bumperTagStub = stub()
  const bumperLoadPresetStub = stub()
  const coreStub = {
    setFailed: stub(),
    debug: stub(),
    error: stub(),
    info: stub(),
    warning: stub(),
  }
  const { runAction, bumpVersion } = await mockImport('../src/index.js', {
    '../src/log.js': logStub,
    '../src/release.js': releaseStub.resolves(),
    '../src/openPr.js': openPrStub.resolves(),
    '../src/utils/execWithOutput.js': {
      execWithOutput: execWithOutputStub,
    },

    'conventional-recommended-bump': {
      Bumper: function () {
        this.bump = bumperStub
        this.loadPreset = bumperLoadPresetStub
        this.tag = bumperTagStub
      },
    },
    '@actions/core': coreStub,
  })

  return {
    action: runAction,
    bumpVersion,
    stubs: {
      logStub,
      releaseStub,
      openPrStub,
      bumpStub: bumperStub,
      execWithOutputStub,
      coreStub,
      bumperLoadPresetStub,
      bumperTagStub,
    },
  }
}

afterEach(() => {
  restore()
})

const DEFAULT_ACTION_DATA = {
  inputs: {},
  packageVersion: '3.1.1',
  context: {
    eventName: 'pull_request',
    repo: {
      repo: {},
      owner: {},
    },
    payload: {
      action: 'closed',
      pull_request: {
        user: { login: 'optic-release-automation[bot]' },
        title: PR_TITLE_PREFIX,
      },
    },
  },
}

test('should not run if the event is not workflow_dispatch or pull_request', async () => {
  const { action, stubs } = await buildStubbedAction()
  await action({
    ...DEFAULT_ACTION_DATA,
    context: {
      ...DEFAULT_ACTION_DATA.context,
      eventName: 'something_else',
    },
  })

  assert.calledWithExactly(stubs.logStub.logError, 'Unsupported event')
})

test("the release feature should be called if it's a pull request", async () => {
  const { action, stubs } = await buildStubbedAction()
  await action({
    ...DEFAULT_ACTION_DATA,
    context: {
      ...DEFAULT_ACTION_DATA.context,
      eventName: 'pull_request',
    },
  })

  assert.notCalled(stubs.logStub.logError)
  assert.calledOnce(stubs.releaseStub)
})

test("the bump feature should be called if it's a workflow_dispatch", async () => {
  const { action, stubs } = await buildStubbedAction()
  await action({
    ...DEFAULT_ACTION_DATA,
    context: {
      ...DEFAULT_ACTION_DATA.context,
      eventName: 'workflow_dispatch',
    },
  })

  assert.notCalled(stubs.logStub.logError)
  assert.calledOnce(stubs.openPrStub)
})

test('npm should be configured if called with npm-token in inputs', async () => {
  const { action, stubs } = await buildStubbedAction()
  await action({
    ...DEFAULT_ACTION_DATA,
    inputs: {
      'npm-token': 'a-token',
    },
    context: {
      ...DEFAULT_ACTION_DATA.context,
      eventName: 'workflow_dispatch',
    },
  })

  assert.notCalled(stubs.logStub.logError)
  assert.calledOnce(stubs.openPrStub)
})

test('semver-auto: should call getAutoBumpedVersion if semver is auto', async t => {
  const { bumpVersion, stubs } = await buildStubbedAction()

  stubs.bumpStub.resolves({ releaseType: 'major' })
  stubs.execWithOutputStub.onCall(3).resolves('3.0.0')

  const inputs = { semver: 'auto', 'base-tag': 'v1.0.0' }
  const newVersion = await bumpVersion({
    inputs,
  })

  // sinon.assert.calledOnce(stubs.bumpStub)
  assert.callCount(stubs.execWithOutputStub, 4)
  assert.calledWithExactly(stubs.execWithOutputStub, 'npm', [
    'version',
    '--no-git-tag-version',
    '--preid=',
    'major',
  ])
  t.same(newVersion, '3.0.0')
})

test('semver-auto: should not call getAutoBumpedVersion if semver is not auto', async t => {
  const { bumpVersion, stubs } = await buildStubbedAction()

  stubs.execWithOutputStub.onCall(1).resolves('3.1.1')

  const inputs = { semver: 'patch' }
  const newVersion = await bumpVersion({
    inputs,
  })

  assert.notCalled(stubs.bumpStub)
  assert.calledTwice(stubs.execWithOutputStub)
  t.same(newVersion, '3.1.1')
})

test('semver-auto: should bump major if breaking change', async t => {
  const { bumpVersion, stubs } = await buildStubbedAction()

  stubs.bumpStub.resolves({ releaseType: 'major' })
  stubs.execWithOutputStub.onCall(3).resolves('3.0.0')

  const inputs = { semver: 'auto', 'base-tag': 'v1.0.0' }
  const newVersion = await bumpVersion({
    inputs,
  })

  assert.calledOnce(stubs.bumpStub)
  assert.callCount(stubs.execWithOutputStub, 4)
  assert.calledWithExactly(stubs.execWithOutputStub, 'npm', [
    'version',
    '--no-git-tag-version',
    '--preid=',
    'major',
  ])
  t.same(newVersion, '3.0.0')
})

test('semver-auto: should bump minor if its a feat', async t => {
  const { bumpVersion, stubs } = await buildStubbedAction()

  stubs.bumpStub.resolves({ releaseType: 'minor' })
  stubs.execWithOutputStub.onCall(3).resolves('3.0.0')

  const inputs = { semver: 'auto', 'base-tag': 'v1.0.0' }
  const newVersion = await bumpVersion({
    inputs,
  })

  assert.calledOnce(stubs.bumpStub)
  assert.callCount(stubs.execWithOutputStub, 4)
  assert.calledWithExactly(stubs.execWithOutputStub, 'npm', [
    'version',
    '--no-git-tag-version',
    '--preid=',
    'minor',
  ])
  t.same(newVersion, '3.0.0')
})

test('semver-auto: should bump patch if its a fix', async t => {
  const { bumpVersion, stubs } = await buildStubbedAction()

  stubs.bumpStub.resolves({ releaseType: 'patch' })
  stubs.execWithOutputStub.onCall(3).resolves('3.0.0')

  const inputs = { semver: 'auto', 'base-tag': 'v1.0.0' }
  const newVersion = await bumpVersion({
    inputs,
  })

  assert.calledOnce(stubs.bumpStub)
  assert.callCount(stubs.execWithOutputStub, 4)
  assert.calledWithExactly(stubs.execWithOutputStub, 'npm', [
    'version',
    '--no-git-tag-version',
    '--preid=',
    'patch',
  ])
  t.same(newVersion, '3.0.0')
})

test('semver-auto: should use the correct base tag if specified', async t => {
  const { bumpVersion, stubs } = await buildStubbedAction()

  stubs.bumpStub.resolves({ releaseType: 'patch' })
  stubs.execWithOutputStub.onCall(3).resolves('3.0.0')

  const inputs = { semver: 'auto', 'base-tag': 'v1.0.0' }
  const newVersion = await bumpVersion({
    inputs,
  })

  assert.calledOnce(stubs.bumpStub)
  assert.calledWithExactly(stubs.bumperLoadPresetStub, 'conventionalcommits')
  assert.calledWithExactly(stubs.bumperTagStub, 'v1.0.0')
  assert.callCount(stubs.execWithOutputStub, 4)
  assert.calledWithExactly(stubs.execWithOutputStub, 'npm', [
    'version',
    '--no-git-tag-version',
    '--preid=',
    'patch',
  ])
  t.same(newVersion, '3.0.0')
})

test('semver-auto: should get the latest tag if base tag not provided', async t => {
  const { bumpVersion, stubs } = await buildStubbedAction()

  stubs.bumpStub.resolves({ releaseType: 'patch' })
  stubs.execWithOutputStub.onCall(2).resolves('v1.0.0' + '\n' + 'v1.1.1')
  stubs.execWithOutputStub.onCall(4).resolves('3.0.0')

  const inputs = { semver: 'auto' }
  const newVersion = await bumpVersion({
    inputs,
  })

  assert.calledOnce(stubs.bumpStub)
  assert.calledWithExactly(stubs.bumperLoadPresetStub, 'conventionalcommits')
  assert.calledWithExactly(stubs.bumperTagStub, 'v1.0.0')
  assert.callCount(stubs.execWithOutputStub, 5)
  assert.calledWithExactly(stubs.execWithOutputStub, 'npm', [
    'version',
    '--no-git-tag-version',
    '--preid=',
    'patch',
  ])
  t.same(newVersion, '3.0.0')
})

test('semver-auto: should throw if auto bump fails', async t => {
  const { bumpVersion, stubs } = await buildStubbedAction()

  stubs.bumpStub.throws(new Error('bump failed'))
  stubs.execWithOutputStub.onCall(2).resolves('v1.0.0' + '\n' + 'v1.1.1')

  const inputs = { semver: 'auto' }
  try {
    await bumpVersion({
      inputs,
    })
  } catch (error) {
    stubs.coreStub.setFailed.calledOnceWithExactly('bump failed')
    t.pass()
  }
})

test('semver-auto: should default to patch if auto bump fails', async t => {
  const { bumpVersion, stubs } = await buildStubbedAction()

  stubs.bumpStub.resolves({})
  stubs.execWithOutputStub.onCall(2).resolves('v1.0.0' + '\n' + 'v1.1.1')
  stubs.execWithOutputStub.onCall(4).resolves('3.0.0')

  const inputs = { semver: 'auto' }
  const newVersion = await bumpVersion({
    inputs,
  })

  assert.calledOnce(stubs.bumpStub)
  assert.calledWithExactly(stubs.bumperLoadPresetStub, 'conventionalcommits')
  assert.calledWithExactly(stubs.bumperTagStub, 'v1.0.0')
  assert.callCount(stubs.execWithOutputStub, 5)
  assert.calledWithExactly(stubs.execWithOutputStub.getCall(3), 'npm', [
    'version',
    '--no-git-tag-version',
    '--preid=',
    'patch',
  ])
  t.same(newVersion, '3.0.0')
})
