'use strict'

const tap = require('tap')

tap.test('throws an error if path not found', async t => {
  const archiverModule = tap.mock('../src/utils/archiver.js', {
    'fs/promises': {
      lstat: async () => ({
        isDirectory: () => {
          throw Error()
        },
      }),
    },
  })

  t.rejects(archiverModule.archiveItem('path', 'out.zip'))
})

tap.test('does not throw any errors', async t => {
  const archiverModule = tap.mock('../src/utils/archiver.js', {
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
        return null
      }
    },
  })

  t.resolves(archiverModule.archiveItem('path', 'out.zip'))
})
