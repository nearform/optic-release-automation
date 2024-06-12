import t from 'tap'
import { stub } from 'sinon'

import { getLocalInfo, getPublishedInfo } from '../src/utils/packageInfo.js'

const mockPackageInfo = {
  name: 'some-package-name',
  license: 'some-license',
  publishConfig: {
    access: 'restricted',
  },
}

const setupPublished = async ({
  value = JSON.stringify(mockPackageInfo),
  error,
} = {}) => {
  const execWithOutputStub = stub()
  const args = ['npm', ['view', '--json']]

  if (value) {
    execWithOutputStub.withArgs(...args).returns(value)
  }
  if (error) {
    execWithOutputStub.withArgs(...args).throws(error)
  }

  return await t.mockImport('../src/utils/packageInfo.js', {
    '../src/utils/execWithOutput.js': { execWithOutput: execWithOutputStub },
  })
}

const setupLocal = async ({ value = JSON.stringify(mockPackageInfo) } = {}) => {
  const readFileSyncStub = stub()
    .withArgs('./package.json', 'utf8')
    .returns(value)

  return await t.mockImport('../src/utils/packageInfo.js', {
    fs: { readFileSync: readFileSyncStub },
  })
}

t.test('getPublishedInfo does not get any info for this package', async t => {
  // Check it works for real: this package is a Github Action, not published on NPM, so expect null
  const packageInfo = await getPublishedInfo()
  t.notOk(packageInfo)
})

t.test('getPublishedInfo parses any valid JSON it finds', async t => {
  const mocks = await setupPublished()

  const packageInfo = await mocks.getPublishedInfo()
  t.match(packageInfo, mockPackageInfo)
})

t.test(
  'getPublishedInfo continues and returns null if the request 404s',
  async t => {
    const mocks = await setupPublished({
      value: JSON.stringify(mockPackageInfo),
      error: new Error('code E404 - package not found'),
    })

    const packageInfo = await mocks.getPublishedInfo()
    t.match(packageInfo, null)
  }
)

t.test(
  'getPublishedInfo throws if it encounters an internal error',
  async t => {
    const mocks = await setupPublished({
      value: "[{ 'this:' is not ] valid}j.s.o.n()",
    })

    await t.rejects(mocks.getPublishedInfo, /JSON/)
  }
)

t.test(
  'getPublishedInfo continues and returns null if the request returns null',
  async t => {
    const mocks = await setupPublished({
      value: null,
    })

    const packageInfo = await mocks.getPublishedInfo()
    t.match(packageInfo, null)
  }
)

t.test('getPublishedInfo throws if it hits a non-404 error', async t => {
  const mocks = await setupPublished({
    error: new Error('code E418 - unexpected teapot'),
  })

  await t.rejects(mocks.getPublishedInfo, /teapot/)
})

t.test(
  'getLocalInfo gets real name and stable properties of this package',
  async t => {
    const packageInfo = getLocalInfo()
    // Check it works for real using real package.json properties that are stable
    t.equal(packageInfo.name, 'optic-release-automation-action')
    t.equal(packageInfo.license, 'MIT')
  }
)

t.test('getLocalInfo gets data from stringified JSON from file', async t => {
  const mocks = await setupLocal()
  const packageInfo = mocks.getLocalInfo()
  t.match(packageInfo, mockPackageInfo)
})
