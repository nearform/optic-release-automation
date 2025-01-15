'use strict'

const tap = require('tap')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const setup = () => {
  const logInfoStub = sinon.stub()
  const logErrorStub = sinon.stub()
  const readFileSyncStub = sinon.stub()

  // Mock Fastify instance
  const mockApp = {
    get: sinon.stub(),
    post: sinon.stub(),
    register: sinon.stub(),
    listen: sinon.stub().resolves(),
    close: sinon.stub().resolves(),
  }

  const fastifyStub = sinon.stub().returns(mockApp)

  readFileSyncStub
    .withArgs(
      sinon.match(path => path.endsWith('/src/utils/assets/otp.html')),
      'utf8'
    )
    .returns('<html>{{package-name}} {{package-version}}</html>')

  const otpVerificationProxy = proxyquire('../src/utils/otpVerification', {
    fastify: fastifyStub,
    fs: { readFileSync: readFileSyncStub },
    '../log': {
      logInfo: logInfoStub,
      logError: logErrorStub,
    },
  })

  return {
    logInfoStub,
    logErrorStub,
    readFileSyncStub,
    mockApp,
    otpVerificationProxy,
  }
}

tap.afterEach(() => {
  sinon.restore()
})

tap.test('Should successfully verify OTP', async t => {
  const { otpVerificationProxy, mockApp } = setup()

  // Capture the OTP callback
  let otpCallback
  mockApp.post.withArgs('/otp').callsFake((path, handler) => {
    otpCallback = handler
  })

  // Start OTP verification process
  const otpPromise = otpVerificationProxy({
    name: 'test-package',
    version: 'v1.0.0',
    tunnelUrl: 'http://localhost:3000',
  })

  // Simulate OTP submission
  await otpCallback(
    {
      body: { otp: '123456' },
    },
    {
      send: sinon.stub(),
    }
  )

  const otp = await otpPromise
  t.equal(otp, '123456', 'should return submitted OTP')
})

tap.test('Should timeout after 5 minutes', async t => {
  const { otpVerificationProxy, logErrorStub } = setup()

  // Use fake timers
  const clock = sinon.useFakeTimers()

  // Start OTP verification process
  const otpPromise = otpVerificationProxy({
    name: 'test-package',
    version: 'v1.0.0',
    tunnelUrl: 'http://localhost:3000',
  })

  // Advance clock by 5 minutes + 1ms
  clock.tick(300001)

  try {
    await otpPromise
    t.fail('should have thrown timeout error')
  } catch (err) {
    t.equal(err.message, 'No OTP received or submission timed out.')
    t.ok(logErrorStub.calledWith('OTP submission timed out.'))
  } finally {
    clock.restore()
  }
})

tap.test('Should handle HTML template rendering', async t => {
  const { otpVerificationProxy, mockApp } = setup()

  let renderedHtml
  let otpHandler

  // Store the OTP handler when registered
  mockApp.post.withArgs('/otp').callsFake((path, handler) => {
    otpHandler = handler
  })

  mockApp.get.withArgs('/').callsFake((path, handler) => {
    handler(
      {},
      {
        type: () => ({
          send: html => {
            renderedHtml = html
          },
        }),
      }
    )
  })

  // Start OTP verification process in background
  const otpPromise = otpVerificationProxy({
    name: 'test-package',
    version: 'v1.0.0',
    tunnelUrl: 'http://localhost:3000',
  })

  // Submit OTP immediately after handlers are set up
  setImmediate(() => {
    if (otpHandler) {
      otpHandler({ body: { otp: '123456' } }, { send: sinon.stub() })
    }
  })

  await otpPromise

  t.match(renderedHtml, /test-package/, 'should include package name')
  t.match(renderedHtml, /v1.0.0/, 'should include package version')
})

tap.test(
  'Should handle the failur case when fastify app or html fails to load',
  async t => {
    const { otpVerificationProxy, mockApp } = setup()

    let otpHandler

    // Store the OTP handler when registered
    mockApp.post.withArgs('/otp').callsFake((path, handler) => {
      otpHandler = handler
    })
    const sendSpy = sinon.spy()
    const codeSpy = sinon.stub().returns({ send: sendSpy })
    mockApp.get.withArgs('/').callsFake((path, handler) => {
      handler(
        {},
        {
          type: () => ({
            send: () => {
              throw new Error('Mock send error')
            },
          }),
          code: codeSpy,
        }
      )
    })

    // Start OTP verification process in background
    const otpPromise = otpVerificationProxy({
      name: 'test-package',
      version: 'v1.0.0',
      tunnelUrl: 'http://localhost:3000',
    })

    // Submit OTP immediately after handlers are set up
    setImmediate(() => {
      if (otpHandler) {
        otpHandler({ body: { otp: '123456' } }, { send: sinon.stub() })
      }
    })

    await otpPromise

    t.ok(codeSpy.calledWith(500), 'should set 500 status code')
    t.ok(
      sendSpy.calledWith('Error loading HTML page'),
      'should send error message'
    )

    // Or if using tap assertions:
    t.equal(
      codeSpy.firstCall.args[0],
      500,
      'should set correct error status code'
    )
    t.equal(
      sendSpy.firstCall.args[0],
      'Error loading HTML page',
      'should send correct error message'
    )
  }
)
