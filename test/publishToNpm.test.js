'use strict'

const tap = require('tap')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const setup = ({
  packageName = 'fakeTestPkg',
  published = true,
  mockPackageInfo,
  otpFlow = 'optic',
} = {}) => {
  const execWithOutputStub = sinon.stub()

  // npm behavior < v8.13.0
  execWithOutputStub
    .withArgs('npm', ['view', `${packageName}@v5.1.3`])
    .returns('')

  const getLocalInfo = () => ({ name: packageName })
  const getPublishedInfo = async () =>
    published ? { name: packageName } : null

  // Conditional setup based on otpFlow
  let proxyConfig = {
    './packageInfo': mockPackageInfo
      ? mockPackageInfo({ execWithOutputStub, getLocalInfo, getPublishedInfo })
      : {
          getLocalInfo,
          getPublishedInfo,
        },
  }
  if (otpFlow === 'optic') {
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
    proxyConfig['./execWithOutput'] = { execWithOutput: execWithOutputStub }
  } else if (otpFlow === 'ngrok') {
    // Setup for ngrok flow
    const otpVerification = sinon.stub().resolves('ngrok123')
    proxyConfig = {
      ...proxyConfig,
      './execWithOutput': { execWithOutput: execWithOutputStub },
      './otpVerification': otpVerification,
    }
  }

  const publishToNpmProxy = proxyquire('../src/utils/publishToNpm', proxyConfig)

  return {
    execWithOutputStub,
    publishToNpmProxy,
    otpVerificationStub: proxyConfig['./otpVerification'],
  }
}

tap.afterEach(() => {
  sinon.restore()
})

tap.test('Should publish to npm with optic', async t => {
  const { publishToNpmProxy, execWithOutputStub } = setup()
  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    opticToken: 'optic-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    version: 'v5.1.3',
  })

  sinon.assert.calledWithExactly(execWithOutputStub.getCall(0), 'npm', [
    'config',
    'set',
    '//registry.npmjs.org/:_authToken=a-token',
  ])
  t.pass('npm config')

  sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
    'pack',
    '--dry-run',
  ])
  t.pass('npm pack called')

  sinon.assert.calledWithExactly(execWithOutputStub, 'curl', [
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

  sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--otp',
    'otp123',
    '--tag',
    'latest',
  ])
  t.pass('npm publish called')
})

tap.test(
  "Should publish to npm when package hasn't been published before",
  async t => {
    const { publishToNpmProxy, execWithOutputStub } = setup({
      published: false,
    })

    await publishToNpmProxy.publishToNpm({
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      version: 'v5.1.3',
    })

    sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
      'pack',
      '--dry-run',
    ])
    t.pass('npm pack called')

    sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
      'publish',
      '--tag',
      'latest',
    ])
    t.pass('npm publish called')
  }
)

tap.test('Should publish to npm without optic', async t => {
  const { publishToNpmProxy, execWithOutputStub } = setup()
  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    version: 'v5.1.3',
  })

  sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
    'pack',
    '--dry-run',
  ])
  t.pass('npm pack called')

  sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--tag',
    'latest',
  ])
  t.pass('npm publish called')
})

tap.test(
  'Should skip npm package publication when it was already published',
  async t => {
    const { publishToNpmProxy, execWithOutputStub } = setup()

    execWithOutputStub
      .withArgs('npm', ['view', 'fakeTestPkg@v5.1.3'])
      .returns('fake package data that says it was published')

    await publishToNpmProxy.publishToNpm({
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      version: 'v5.1.3',
    })

    sinon.assert.neverCalledWith(execWithOutputStub, 'npm', [
      'publish',
      '--otp',
      'otp123',
      '--tag',
      'latest',
    ])
    t.pass('publish never called with otp')

    sinon.assert.neverCalledWith(execWithOutputStub, 'npm', [
      'publish',
      '--tag',
      'latest',
    ])
    t.pass('publish never called')
  }
)

tap.test('Should stop action if package info retrieval fails', async t => {
  t.plan(3)
  const { publishToNpmProxy, execWithOutputStub } = setup({
    // Use original getPublishedInfo logic with execWithOutputStub injected into it
    mockPackageInfo: ({ getLocalInfo, execWithOutputStub }) => ({
      getLocalInfo,
      getPublishedInfo: proxyquire('../src/utils/packageInfo', {
        './execWithOutput': { execWithOutput: execWithOutputStub },
      }).getPublishedInfo,
    }),
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

  sinon.assert.neverCalledWith(execWithOutputStub, 'npm', [
    'publish',
    '--otp',
    'otp123',
    '--tag',
    'latest',
  ])
  t.pass('package is not published with otp code')

  sinon.assert.neverCalledWith(execWithOutputStub, 'npm', [
    'publish',
    '--tag',
    'latest',
  ])
  t.pass('package is not published without otp code')
})

tap.test(
  'Should stop action if package version info retrieval fails',
  async t => {
    t.plan(3)
    const { publishToNpmProxy, execWithOutputStub } = setup()

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

    sinon.assert.neverCalledWith(execWithOutputStub, 'npm', [
      'publish',
      '--otp',
      'otp123',
      '--tag',
      'latest',
    ])
    t.pass('package is not published with otp code')

    sinon.assert.neverCalledWith(execWithOutputStub, 'npm', [
      'publish',
      '--tag',
      'latest',
    ])
    t.pass('package is not published without otp code')
  }
)

tap.test(
  'Should continue action if package info returns not found',
  async t => {
    const { publishToNpmProxy, execWithOutputStub } = setup({
      // Use original getPublishedInfo logic with execWithOutputStub injected into it
      mockPackageInfo: ({ getLocalInfo, execWithOutputStub }) => ({
        getLocalInfo,
        getPublishedInfo: proxyquire('../src/utils/packageInfo', {
          './execWithOutput': { execWithOutput: execWithOutputStub },
        }).getPublishedInfo,
      }),
    })

    execWithOutputStub
      .withArgs('npm', ['view', '--json'])
      .throws(new Error('code E404'))

    execWithOutputStub
      .withArgs('npm', ['view', 'fakeTestPkg@v5.1.3'])
      .returns('')

    await publishToNpmProxy.publishToNpm({
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      version: 'v5.1.3',
    })

    sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
      'pack',
      '--dry-run',
    ])
    t.pass('npm pack called')

    sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
      'publish',
      '--tag',
      'latest',
    ])
    t.pass('npm publish called')
  }
)

tap.test(
  'Should continue action if package version info returns not found',
  async t => {
    const { publishToNpmProxy, execWithOutputStub } = setup()

    execWithOutputStub
      .withArgs('npm', ['view', 'fakeTestPkg@v5.1.3'])
      .throws(new Error('code E404'))

    await publishToNpmProxy.publishToNpm({
      npmToken: 'a-token',
      opticUrl: 'https://optic-test.run.app/api/generate/',
      npmTag: 'latest',
      version: 'v5.1.3',
    })

    sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
      'pack',
      '--dry-run',
    ])
    t.pass('npm pack called')

    sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
      'publish',
      '--tag',
      'latest',
    ])
    t.pass('npm publish called')
  }
)

tap.test('Adds --provenance flag when provenance option provided', async () => {
  const { publishToNpmProxy, execWithOutputStub } = setup()
  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    version: 'v5.1.3',
    provenance: true,
  })

  sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--tag',
    'latest',
    '--provenance',
  ])
})

tap.test('Adds --access flag if provided as an input', async () => {
  const { publishToNpmProxy, execWithOutputStub } = setup()
  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    opticUrl: 'https://optic-test.run.app/api/generate/',
    npmTag: 'latest',
    version: 'v5.1.3',
    access: 'public',
  })

  sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--tag',
    'latest',
    '--access',
    'public',
  ])
})

tap.test('Should publish using ngrok for OTP verification', async t => {
  const { publishToNpmProxy, execWithOutputStub, otpVerificationStub } = setup({
    otpFlow: 'ngrok',
  })

  await publishToNpmProxy.publishToNpm({
    npmToken: 'a-token',
    ngrokToken: 'ngrok-token',
    tunnelUrl: 'https://example.ngrok.io',
    npmTag: 'latest',
    version: 'v5.1.3',
  })

  sinon.assert.calledWithExactly(otpVerificationStub, {
    version: 'v5.1.3',
    name: 'fakeTestPkg',
    tunnelUrl: 'https://example.ngrok.io',
  })

  sinon.assert.calledWithExactly(execWithOutputStub, 'npm', [
    'publish',
    '--otp',
    'ngrok123',
    '--tag',
    'latest',
  ])
  t.pass('npm publish called with ngrok OTP')
})

tap.test('Should fail gracefully when ngrok services fail', async t => {
  t.plan(1)
  const { publishToNpmProxy, otpVerificationStub } = setup({
    mockPackageInfo: ({ getLocalInfo, execWithOutputStub }) => ({
      getLocalInfo,
      getPublishedInfo: proxyquire('../src/utils/packageInfo', {
        './execWithOutput': { execWithOutput: execWithOutputStub },
      }).getPublishedInfo,
    }),
    otpFlow: 'ngrok',
  })

  // Mock failed otpVerification
  otpVerificationStub.throws(new Error('Ngrok failed'))

  try {
    await publishToNpmProxy.publishToNpm({
      npmToken: 'a-token',
      ngrokToken: 'ngrok-token',
      tunnelUrl: 'https://example.ngrok.io',
      npmTag: 'latest',
      version: 'v5.1.3',
    })
  } catch (error) {
    t.equal(error.message, 'OTP verification failed: Ngrok failed')
  }
})

tap.test(
  'Should fail gracefully when fail to receive otp from optic',
  async t => {
    t.plan(1)
    const { publishToNpmProxy, execWithOutputStub } = setup({
      otpFlow: 'optic',
    })

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
      .throws(new Error('Optic failed'))
    try {
      await publishToNpmProxy.publishToNpm({
        npmToken: 'a-token',
        opticToken: 'optic-token',
        opticUrl: 'https://optic-test.run.app/api/generate/',
        npmTag: 'latest',
        version: 'v5.1.3',
      })
    } catch (error) {
      t.equal(error.message, 'OTP verification failed: Optic failed')
    }
  }
)
