'use strict'

const tap = require('tap')
const { formatPackageInfo } = require('../src/utils/packageInfoFormatter')

tap.test(
  'formatPackageInfo should return a formatted package info object',
  async t => {
    const version = '1.0.0'
    const packageName = 'test-package'
    const expected = {
      packageInfo: {
        version: '1.0.0',
        name: 'test-package',
      },
    }

    const result = formatPackageInfo(version, packageName)
    t.same(result, expected)
  }
)

tap.test(
  'formatPackageInfo should handle empty version and packageName',
  async t => {
    const expected = {
      packageInfo: {
        version: '',
        name: '',
      },
    }

    const result = formatPackageInfo()
    t.same(result, expected)
  }
)

tap.test(
  'formatPackageInfo should handle undefined version and packageName',
  async t => {
    const expected = {
      packageInfo: {
        version: '',
        name: '',
      },
    }

    const result = formatPackageInfo(undefined, undefined)
    t.same(result, expected)
  }
)

tap.test(
  'formatPackageInfo should handle null version and packageName',
  async t => {
    const expected = {
      packageInfo: {
        version: '',
        name: '',
      },
    }

    const result = formatPackageInfo(null, null)
    t.same(result, expected)
  }
)
