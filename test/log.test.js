import t from 'tap'
import { stub, restore, assert } from 'sinon'
import core from '@actions/core'

const setup = async () => {
  const coreStub = stub(core)
  const logger = await t.mockImport('../src/log.js', {
    '@actions/core': coreStub,
  })

  return { coreStub, logger }
}

t.afterEach(() => {
  restore()
})

t.test('calling log with an array will stringify it', async () => {
  const { logger, coreStub } = await setup()
  logger.logDebug([1, 2, 3])
  assert.calledWithExactly(coreStub.debug, '1,2,3')
})

t.test('logDebug calls @actions/core/debug', async () => {
  const { logger, coreStub } = await setup()
  logger.logDebug('Debug')
  assert.calledOnce(coreStub.debug)
  assert.notCalled(coreStub.error)
})

t.test('logError calls @actions/core/error', async () => {
  const { logger, coreStub } = await setup()
  logger.logError(new Error('not a string'))
  assert.calledOnce(coreStub.error)
  assert.notCalled(coreStub.debug)
})

t.test('logInfo calls @actions/core/info', async () => {
  const { logger, coreStub } = await setup()
  logger.logInfo('Debug')

  assert.calledOnce(coreStub.info)
  assert.notCalled(coreStub.debug)
})

t.test('logWarning calls @actions/core/warning', async () => {
  const { logger, coreStub } = await setup()
  logger.logWarning('warning')

  assert.calledOnce(coreStub.warning)
  assert.notCalled(coreStub.debug)
})
