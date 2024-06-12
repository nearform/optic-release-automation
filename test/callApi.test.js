import { afterEach, mockImport, test } from 'tap'
import { stub, restore, assert } from 'sinon'

const setup = async status => {
  const logStub = { logError: stub(), logInfo: stub(), logWarning: stub() }
  const fetchStub = stub()
  const callApiProxy = await mockImport('../src/utils/callApi.js', {
    '../src/log.js': logStub,
    'node-fetch': fetchStub.resolves({
      status,
      get json() {
        return () => {}
      },
    }),
  })
  return { logStub, callApiProxy, fetchStub }
}

afterEach(() => {
  restore()
})

test('Call api warns if code is not 200', async () => {
  const { logStub, callApiProxy } = await setup(401)
  await callApiProxy.callApi(
    {
      endpoint: 'release',
      method: 'PATCH',
      body: {},
    },
    {
      'api-url': 'whatever',
    }
  )
  assert.calledOnce(logStub.logWarning)
})

test('Call api does not warn if code is  200', async () => {
  const { logStub, callApiProxy } = await setup(200)
  await callApiProxy.callApi(
    {
      endpoint: 'release',
      method: 'PATCH',
      body: {},
    },
    { 'api-url': 'whatever' }
  )
  assert.notCalled(logStub.logWarning)
})

test('Call api does not append slash to api url if present', async () => {
  const { fetchStub, callApiProxy } = await setup(200)
  await callApiProxy.callApi(
    {
      endpoint: 'release',
      method: 'PATCH',
      body: {},
    },
    { 'api-url': 'whatever/' }
  )
  assert.calledWith(fetchStub, 'whatever/release')
})

test('Call api appends slash to api url if not present', async () => {
  const { fetchStub, callApiProxy } = await setup(200)
  await callApiProxy.callApi(
    {
      endpoint: 'release',
      method: 'PATCH',
      body: {},
    },
    { 'api-url': 'whatever' }
  )
  assert.calledWith(fetchStub, 'whatever/release')
})
