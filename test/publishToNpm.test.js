import t from 'tap'
import { stub, restore, assert } from 'sinon'

const setup = async ({
  packageName = 'fakeTestPkg',
  published = true,
  mockPackageInfo,
} = {}) => {
  const execWithOutputStub = stub()
  execWithOutputStub
    .withArgs('curl', [
      '-s',
      '-d',
      JSON.stringify({
        packageInfo: { version: 'v5.1.3', name: 'fakeTestPkg' },
      }),
      '-H',
      'Content-Type: application/json',
      '-X',
      'POST',
      'https://optic-test.run.app/api/generate/optic-token',
    ])
    .returns('otp123')

  // npm behavior < v8.13.0
  execWithOutputStub
    .withArgs('npm', ['view', `${packageName}@v5.1.3`])
    .returns('')

  const getLocalInfo = () => ({ name: packageName })
  const getPublishedInfo = async () =>
    published ? { name: packageName } : null

  const publishToNpmProxy = await t.mockImport('../src/utils/publishToNpm.js', {
    '../src/utils/execWithOutput.js': { execWithOutput: execWithOutputStub },
    '../src/utils/packageInfo.js': mockPackageInfo
      ? await mockPackageInfo({
          execWithOutputStub,
          getLocalInfo,
          getPublishedInfo,
        })
      : {
          getLocalInfo,
          getPublishedInfo,
        },
  })

  return { execWithOutputStub, publishToNpmProxy }
}

t.afterEach(() => {
  restore()
})

t.test('Should publish to npm with optic', async t => {
  const { publishToNpmProxy, execWithOutputStub } = await setup()
  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    opticToken: 'optic-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    version: 'v5.1.3',
  })

  assert.calledWithExactly(execWithOutputStub.getCall(0), 'npm', [
    'config',
    'set',
    '//registry.npmjs.org/:_authToken=a-token',
  ])
  t.pass('npm config')

  assert.calledWithExactly(execWithOutputStub, 'npm', ['pack', '--dry-run'])
  t.pass('npm pack called')

  assert.calledWithExactly(execWithOutputStub, 'curl', [
    '-s',
    '-d',
    JSON.stringify({ packageInfo: { version: 'v5.1.3', name: 'fakeTestPkg' } }),
    '-H',
    'Content-Type: application/json',
    '-X',
    'POST',
    'https://optic-test.run.app/api/generate/optic-token',
  ])
  t.pass('curl called')

  assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--otp',
    'otp123',
    '--tag',
    'latest',
  ])
  t.pass('npm publish called')
})

t.test(
  "Should publish to npm when package hasn't been published before",
  async t => {
    const { publishToNpmProxy, execWithOutputStub } = await setup({
      published: false,
    })

    await publishToNpmProxy.publishToNpm({
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      version: 'v5.1.3',
    })

    assert.calledWithExactly(execWithOutputStub, 'npm', ['pack', '--dry-run'])
    t.pass('npm pack called')

    assert.calledWithExactly(execWithOutputStub, 'npm', [
      'publish',
      '--tag',
      'latest',
    ])
    t.pass('npm publish called')
  }
)

t.test('Should publish to npm without optic', async t => {
  const { publishToNpmProxy, execWithOutputStub } = await setup()
  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    version: 'v5.1.3',
  })

  assert.calledWithExactly(execWithOutputStub, 'npm', ['pack', '--dry-run'])
  t.pass('npm pack called')

  assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--tag',
    'latest',
  ])
  t.pass('npm publish called')
})

t.test(
  'Should skip npm package publication when it was already published',
  async t => {
    const { publishToNpmProxy, execWithOutputStub } = await setup()

    execWithOutputStub
      .withArgs('npm', ['view', 'fakeTestPkg@v5.1.3'])
      .returns('fake package data that says it was published')

    await publishToNpmProxy.publishToNpm({
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      version: 'v5.1.3',
    })

    assert.neverCalledWith(execWithOutputStub, 'npm', [
      'publish',
      '--otp',
      'otp123',
      '--tag',
      'latest',
    ])
    t.pass('publish never called with otp')

    assert.neverCalledWith(execWithOutputStub, 'npm', [
      'publish',
      '--tag',
      'latest',
    ])
    t.pass('publish never called')
  }
)

t.test('Should stop action if package info retrieval fails', async t => {
  t.plan(3)
  const { publishToNpmProxy, execWithOutputStub } = await setup({
    // Use original getPublishedInfo logic with execWithOutputStub injected into it
    mockPackageInfo: async ({ getLocalInfo, execWithOutputStub }) => {
      const { getPublishedInfo } = await t.mockImport(
        '../src/utils/packageInfo.js',
        {
          '../src/utils/execWithOutput.js': {
            execWithOutput: execWithOutputStub,
          },
        }
      )

      return {
        getLocalInfo,
        getPublishedInfo,
      }
    },
  })
  execWithOutputStub
    .withArgs('npm', ['view', '--json'])
    .throws(new Error('Network Error'))

  try {
    await publishToNpmProxy.publishToNpm({
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      version: 'v5.1.3',
    })
  } catch (e) {
    t.equal(e.message, 'Network Error')
  }

  assert.neverCalledWith(execWithOutputStub, 'npm', [
    'publish',
    '--otp',
    'otp123',
    '--tag',
    'latest',
  ])
  t.pass('package is not published with otp code')

  assert.neverCalledWith(execWithOutputStub, 'npm', [
    'publish',
    '--tag',
    'latest',
  ])
  t.pass('package is not published without otp code')
})

t.test(
  'Should stop action if package version info retrieval fails',
  async t => {
    t.plan(3)
    const { publishToNpmProxy, execWithOutputStub } = await setup()

    execWithOutputStub
      .withArgs('npm', ['view', 'fakeTestPkg@v5.1.3'])
      .throws(new Error('Network Error'))

    try {
      await publishToNpmProxy.publishToNpm({
        npmToken: 'a-token',
        opticUrl: 'https://optic-test.run.app/api/generate/',
        npmTag: 'latest',
        version: 'v5.1.3',
      })
    } catch (e) {
      t.equal(e.message, 'Network Error')
    }

    assert.neverCalledWith(execWithOutputStub, 'npm', [
      'publish',
      '--otp',
      'otp123',
      '--tag',
      'latest',
    ])
    t.pass('package is not published with otp code')

    assert.neverCalledWith(execWithOutputStub, 'npm', [
      'publish',
      '--tag',
      'latest',
    ])
    t.pass('package is not published without otp code')
  }
)

t.test('Should continue action if package info returns not found', async t => {
  const { publishToNpmProxy, execWithOutputStub } = await setup({
    // Use original getPublishedInfo logic with execWithOutputStub injected into it
    mockPackageInfo: async ({ getLocalInfo, execWithOutputStub }) => {
      const { getPublishedInfo } = await t.mockImport(
        '../src/utils/packageInfo.js',
        {
          '../src/utils/execWithOutput.js': {
            execWithOutput: execWithOutputStub,
          },
        }
      )

      return {
        getLocalInfo,
        getPublishedInfo,
      }
    },
  })

  execWithOutputStub
    .withArgs('npm', ['view', '--json'])
    .throws(new Error('code E404'))

  execWithOutputStub.withArgs('npm', ['view', 'fakeTestPkg@v5.1.3']).returns('')

  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    version: 'v5.1.3',
  })

  assert.calledWithExactly(execWithOutputStub, 'npm', ['pack', '--dry-run'])
  t.pass('npm pack called')

  assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--tag',
    'latest',
  ])
  t.pass('npm publish called')
})

t.test(
  'Should continue action if package version info returns not found',
  async t => {
    const { publishToNpmProxy, execWithOutputStub } = await setup()

    execWithOutputStub
      .withArgs('npm', ['view', 'fakeTestPkg@v5.1.3'])
      .throws(new Error('code E404'))

    await publishToNpmProxy.publishToNpm({
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      version: 'v5.1.3',
    })

    assert.calledWithExactly(execWithOutputStub, 'npm', ['pack', '--dry-run'])
    t.pass('npm pack called')

    assert.calledWithExactly(execWithOutputStub, 'npm', [
      'publish',
      '--tag',
      'latest',
    ])
    t.pass('npm publish called')
  }
)

t.test('Adds --provenance flag when provenance option provided', async () => {
  const { publishToNpmProxy, execWithOutputStub } = await setup()
  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    version: 'v5.1.3',
    provenance: true,
  })

  assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--tag',
    'latest',
    '--provenance',
  ])
})

t.test('Adds --access flag if provided as an input', async () => {
  const { publishToNpmProxy, execWithOutputStub } = await setup()
  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    version: 'v5.1.3',
    access: 'public',
  })

  assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--tag',
    'latest',
    '--access',
    'public',
  ])
})
