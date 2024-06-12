import t from 'tap'

const setup = async ({ isDirectory }) => {
  const archiverModule = await t.mockImport('../src/utils/archiver.js', {
    'fs/promises': {
      lstat: async () => ({
        isDirectory: () => isDirectory,
      }),
    },
    'adm-zip': function Mocked() {
      this.addLocalFolderPromise = async function () {
        return null
      }
      this.addLocalFile = function () {
        return null
      }
      this.writeZipPromise = async function () {
        return null
      }
    },
  })

  return { archiverModule }
}

t.test('throws an error if path not found', async t => {
  const archiverModule = await t.mockImport('../src/utils/archiver.js', {
    'fs/promises': {
      lstat: async () => ({
        isDirectory: () => {
          throw Error()
        },
      }),
    },
  })

  await t.rejects(archiverModule.archiveItem('path', 'out.zip'))
})

t.test('does not throw any errors if directory', async t => {
  const { archiverModule } = await setup({ isDirectory: true })

  await t.resolves(archiverModule.archiveItem('path', 'out.zip'))
})

t.test('throws if writing to zip file fails', async t => {
  const archiverModule = await t.mockImport('../src/utils/archiver.js', {
    'fs/promises': {
      lstat: async () => ({
        isDirectory: () => true,
      }),
    },
    'adm-zip': function Mocked() {
      this.addLocalFolderPromise = async function () {
        return null
      }
      this.addLocalFile = function () {
        return null
      }
      this.writeZipPromise = async function () {
        return Promise.reject()
      }
    },
  })

  await t.rejects(archiverModule.archiveItem('path', 'out.zip'))
})

t.test('resolves if a path is not a directory', async t => {
  const archiverModule = await t.mockImport('../src/utils/archiver.js', {
    'fs/promises': {
      lstat: async () => ({
        isDirectory: () => false,
      }),
    },
    'adm-zip': function Mocked() {
      this.addLocalFolderPromise = async function () {
        return Promise.reject()
      }
      this.addLocalFile = function () {
        return undefined
      }
      this.writeZipPromise = async function () {
        return null
      }
    },
  })

  await t.resolves(archiverModule.archiveItem('path', 'out.zip'))
})

t.test('does not throw any errors if file', async t => {
  const { archiverModule } = await setup({ isDirectory: false })

  await t.resolves(archiverModule.archiveItem('file.js', 'out.zip'))
})
