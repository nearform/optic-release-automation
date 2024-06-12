import { afterEach, mockImport, test } from 'tap'
import { stub, restore, assert, match } from 'sinon'
import { redactConfidentialArguments } from '../src/utils/execWithOutput.js'

const setup = async () => {
  const execStubInner = stub()
  return {
    execStub: execStubInner,
    execWithOutputModule: await mockImport('../src/utils/execWithOutput.js', {
      '@actions/exec': {
        exec: execStubInner,
      },
    }),
  }
}
const { execStub, execWithOutputModule } = await setup()

afterEach(() => {
  restore()
})

test('resolves with output of the exec command if exit code is 0', async t => {
  const output = 'output'

  execStub.callsFake((_, __, options) => {
    options.listeners.stdout(Buffer.from(output, 'utf8'))

    return Promise.resolve(0)
  })

  await t.resolves(execWithOutputModule.execWithOutput('ls', ['-al']), output)
  assert.calledWithExactly(execStub, 'ls', ['-al'], match({}))
})

test('Throws with output of the exec command if exit code is not 0', async t => {
  const output = 'output'

  execStub.callsFake((_, __, options) => {
    options.listeners.stderr(Buffer.from(output, 'utf8'))
    return Promise.reject(new Error())
  })

  await t.rejects(
    () => execWithOutputModule.execWithOutput('ls', ['-al']),
    'Error: ls -al returned code 1  \nSTDOUT:  \nSTDERR: ${output}'
  )

  assert.calledWithExactly(execStub, 'ls', ['-al'], match({}))
})

test('provides cwd to exec function', async () => {
  const cwd = './'

  execStub.resolves(0)
  await execWithOutputModule.execWithOutput('command', [], { cwd })
  assert.calledWithExactly(execStub, 'command', [], match({ cwd }))
})

test('rejects if exit code is not 0', async t => {
  const errorOutput = 'error output'

  execStub.callsFake((_, __, options) => {
    options.listeners.stderr(Buffer.from(errorOutput, 'utf8'))

    return Promise.resolve(1)
  })

  await t.rejects(execWithOutputModule.execWithOutput('command'))
  assert.calledWithExactly(execStub, 'command', [], match({}))
})

test('passes env vars excluding `INPUT_*` env vars', async t => {
  const INPUT_NPM_TOKEN = 'some-secret-value'
  const INPUT_OPTIC_TOKEN = 'another-secret-value'
  const ACTIONS_ID_TOKEN_REQUEST_URL = 'https://example.com'
  const GITHUB_EVENT_NAME = 'someEvent'

  stub(process, 'env').value({
    ...process.env,
    INPUT_NPM_TOKEN,
    INPUT_OPTIC_TOKEN,
    ACTIONS_ID_TOKEN_REQUEST_URL,
    GITHUB_EVENT_NAME,
  })

  // Redo setup so it gets the new env vars
  const withEnv = await setup()

  withEnv.execStub.resolves(0)
  withEnv.execWithOutputModule.execWithOutput('command', [])

  const envInExec = withEnv.execStub.firstCall.lastArg.env

  // Check custom env vars are preserved
  t.has(envInExec, { ACTIONS_ID_TOKEN_REQUEST_URL })
  t.has(envInExec, { GITHUB_EVENT_NAME })

  // Check INPUT_* env vars are removed
  t.notHas(envInExec, { INPUT_NPM_TOKEN })
  t.notHas(envInExec, { INPUT_OPTIC_TOKEN })

  // Check "real" env vars are preserved.
  // Its value will vary by test runner, so just check it is present.
  t.hasProp(envInExec, 'NODE')
})

test('Invalid arguments inputs should not fail', async t => {
  const redactedBlankArray = redactConfidentialArguments([])
  const redactedUndefinedArray = redactConfidentialArguments(undefined)
  const redactedNullArray = redactConfidentialArguments(null)

  t.equal(Array.isArray(redactedBlankArray), true)
  t.equal(Array.isArray(redactedUndefinedArray), true)
  t.equal(Array.isArray(redactedNullArray), true)

  t.equal(redactedBlankArray.length, 0)
  t.equal(redactedUndefinedArray.length, 0)
  t.equal(redactedNullArray.length, 0)
})

test('Valid arguments inputs should pass', async t => {
  const args = ['publish', '--tag', 'latest', '--access', 'public']

  const otp = '1827Sdys7'

  const arrayWithOTP = [...args.slice(0, 2), '--otp', otp, ...args.slice(2)]
  const arrayWithOTPInStart = ['--otp', otp, ...args]
  const arrayWithOTPAtEnd = [...args, '--otp', otp]

  const redactedArray1 = redactConfidentialArguments(arrayWithOTP)
  const redactedArray2 = redactConfidentialArguments(arrayWithOTPInStart)
  const redactedArray3 = redactConfidentialArguments(arrayWithOTPAtEnd)
  const redactedArray4 = redactConfidentialArguments(args)

  t.equal(
    Array.isArray(redactedArray1),
    true,
    'Failed - [Array with OTP] - Output Not An Array'
  )
  t.equal(
    redactedArray1.length,
    arrayWithOTP.length - 2,
    'Failed - [Array with OTP] - Output Array Length not matching>>'
  )
  t.equal(
    redactedArray1.includes('--otp'),
    false,
    'Failed - [Array with OTP] - OTP Keyword is found in Output Array'
  )
  t.equal(
    redactedArray1.includes(otp),
    false,
    'Failed - [Array with OTP] - OTP Value is found in Output Array'
  )

  t.equal(
    Array.isArray(redactedArray2),
    true,
    'Failed - [Array with OTP in start] - Output Not An Array'
  )
  t.equal(
    redactedArray2.length,
    arrayWithOTPInStart.length - 2,
    'Failed - [Array with OTP in start] - Output Array Length not matching'
  )
  t.equal(
    redactedArray2.includes('--otp'),
    false,
    'Failed - [Array with OTP in start] - OTP Keyword is found in Output Array'
  )
  t.equal(
    redactedArray2.includes(otp),
    false,
    'Failed - [Array with OTP in start] - OTP Value is found in Output Array'
  )

  t.equal(
    Array.isArray(redactedArray3),
    true,
    'Failed - [Array with OTP in end] - Output Not An Array'
  )
  t.equal(
    redactedArray3.length,
    arrayWithOTPAtEnd.length - 2,
    'Failed - [Array with OTP in end] - Output Array Length not matching'
  )
  t.equal(
    redactedArray3.includes('--otp'),
    false,
    'Failed - [Array with OTP in end] - OTP Keyword is found in Output Array'
  )
  t.equal(
    redactedArray3.includes(otp),
    false,
    'Failed - [Array with OTP in end] - OTP Value is found in Output Array'
  )

  t.equal(
    Array.isArray(redactedArray4),
    true,
    'Failed - [Array with no OTP] - Output Not An Array'
  )
  t.equal(
    redactedArray4.length,
    args.length,
    'Failed - [Array with no OTP] - Output Array Length not matching'
  )
})

test('Otp should be redacted from args in case of an error', async t => {
  const args = ['publish', '--tag', 'latest', '--access', 'public']

  const otp = '872333'

  const arrayWithOTP = [...args.slice(0, 2), '--otp', otp, ...args.slice(2)]
  const arrayWithOTPInStart = ['--otp', otp, ...args]
  const arrayWithOTPAtEnd = [...args, '--otp', otp]

  const errorObject1 = await t.rejects(
    execWithOutputModule.execWithOutput('ls', arrayWithOTP)
  )
  const errorObject2 = await t.rejects(
    execWithOutputModule.execWithOutput('ls', arrayWithOTPInStart)
  )
  const errorObject3 = await t.rejects(
    execWithOutputModule.execWithOutput('ls', arrayWithOTPAtEnd)
  )
  const errorObject4 = await t.rejects(
    execWithOutputModule.execWithOutput('ls', args)
  )

  t.equal(
    errorObject1.message.indexOf('--otp'),
    -1,
    'Failed - [Array with OTP] - OTP Keyword is found in Error Output'
  )
  t.equal(
    errorObject1.message.indexOf(otp),
    -1,
    'Failed - [Array with OTP] - OTP Value is found in Error Output'
  )

  t.equal(
    errorObject2.message.indexOf('--otp'),
    -1,
    'Failed - [Array with OTP in start] - OTP Keyword is found in Error Output'
  )
  t.equal(
    errorObject2.message.indexOf(otp),
    -1,
    'Failed - [Array with OTP in start] - OTP Value is found in Error Output'
  )

  t.equal(
    errorObject3.message.indexOf('--otp'),
    -1,
    'Failed - [Array with OTP in end] - OTP Keyword is found in Error Output'
  )
  t.equal(
    errorObject3.message.indexOf(otp),
    -1,
    'Failed - [Array with OTP in end] - OTP Value is found in Error Output'
  )

  t.equal(
    errorObject4.message.indexOf('--tag') > -1,
    true,
    'Failed - [Array without OTP] - Expected Keyword is not found in Error Output'
  )
  t.equal(
    errorObject4.message.indexOf('latest') > -1,
    true,
    'Failed - [Array without OTP] - Expected Value is not found in Error Output'
  )
})
