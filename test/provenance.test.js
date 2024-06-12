import t from 'tap'
import { satisfies } from 'semver'
import { restore, stub } from 'sinon'
import {
  getProvenanceOptions,
  checkIsSupported,
  checkPermissions,
  getNpmVersion,
} from '../src/utils/provenance.js'

const MINIMUM_VERSION = '9.5.0'

t.afterEach(() => {
  restore()
})

t.test('getNpmVersion can get a real NPM version number', async t => {
  const npmVersion = await getNpmVersion()

  t.type(npmVersion, 'string')

  // We don't care which version of NPM tests are run on, just that it gets any valid version
  t.ok(satisfies(npmVersion, '>0.0.1'))
})

t.test('checkIsSupported passes on minimum NPM version', async t => {
  t.doesNotThrow(() => checkIsSupported(MINIMUM_VERSION))
})

t.test('checkIsSupported passes on major version after minimum', async t => {
  t.doesNotThrow(() => checkIsSupported('10.0.0'))
})

t.test('checkIsSupported fails on minor version before minimum', async t => {
  t.throws(
    () => checkIsSupported('9.4.0'),
    `Provenance requires NPM ${MINIMUM_VERSION}`
  )
})

t.test('checkIsSupported fails on major version before minimum', async t => {
  t.throws(
    () => checkIsSupported('8.0.0'),
    `Provenance requires NPM ${MINIMUM_VERSION}`
  )
})

t.test('checkPermissions always passes on NPM 9.6.1', async t => {
  t.doesNotThrow(() => checkIsSupported('9.6.1'))
})

t.test('checkPermissions always passes on next major NPM version', async t => {
  t.doesNotThrow(() => checkIsSupported('10.0.0'))
})

t.test('checkPermissions fails on minimum version without env', async t => {
  t.throws(
    () => checkPermissions(MINIMUM_VERSION),
    'Provenance generation in GitHub Actions requires "write" access to the "id-token" permission'
  )
})

t.test('checkPermissions passes on minimum version with env', async t => {
  stub(process, 'env').value({
    ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.com',
  })

  t.doesNotThrow(() => checkIsSupported(MINIMUM_VERSION))
})

const setupAccessAdjustment = async ({ local, published }) => {
  const { getAccessAdjustment } = await t.mockImport(
    '../src/utils/provenance.js',
    {
      '../src/utils/packageInfo.js': {
        getPublishedInfo: async () => published,
        getLocalInfo: () => local,
      },
    }
  )
  return getAccessAdjustment
}
const unscopedPackageName = 'unscoped-fake-package'
const scopedPackageName = '@scoped/fake-package'

t.test(
  'getAccessAdjustment returns { access: public } if unscoped, unpublished and no access option',
  async t => {
    const getAccessAdjustment = await setupAccessAdjustment({
      local: { name: unscopedPackageName },
      published: null,
    })
    t.match(await getAccessAdjustment(), { access: 'public' })
  }
)

t.test(
  'getAccessAdjustment does nothing if passed defined access option',
  async t => {
    const getAccessAdjustment = await setupAccessAdjustment({
      local: { name: unscopedPackageName },
      published: null,
    })
    t.notOk(await getAccessAdjustment({ access: 'public' }))
  }
)

t.test(
  'getAccessAdjustment does nothing if package.json defines access',
  async t => {
    const getAccessAdjustment = await setupAccessAdjustment({
      local: {
        name: unscopedPackageName,
        publishConfig: { access: 'public ' },
      },
      published: null,
    })
    t.notOk(await getAccessAdjustment())
  }
)

t.test(
  'getAccessAdjustment does nothing if package.json name is scoped',
  async t => {
    const getAccessAdjustment = await setupAccessAdjustment({
      local: { name: scopedPackageName },
      published: null,
    })
    t.notOk(await getAccessAdjustment())
  }
)

t.test('getAccessAdjustment does nothing if package is on npm', async t => {
  const getAccessAdjustment = await setupAccessAdjustment({
    local: { name: unscopedPackageName },
    published: { name: unscopedPackageName },
  })
  t.notOk(await getAccessAdjustment())
})

t.test('getProvenanceOptions fails fast if NPM version unavailable', async t =>
  t.rejects(getProvenanceOptions, 'Current npm version not provided')
)
