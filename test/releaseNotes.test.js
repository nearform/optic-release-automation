'use strict'

const tap = require('tap')
const _template = require('lodash.template')

const {
  getPrNumbersFromReleaseNotes,
  getPRBody,
} = require('../src/utils/releaseNotes')

tap.test('Should return the correct PR numbers', async () => {
  const testReleaseNotes = `
    ## Whats Changed\n +
    * chore 15 by @people in https://github.com/owner/repo/pull/13\n
    * chore 18 by @people in https://github.com/owner/repo/pull/15\n
    * chore 19 by @people in https://github.com/owner/repo/pull/16\n
    * chore 21 by @people in https://github.com/owner/repo/pull/18\n
    * fix 26 by @people in https://github.com/owner/repo/pull/42\n
    * feature 30 by @people in https://github.com/owner/repo/pull/50\n
    * fix 27 by @people in https://github.com/owner/repo/pull/52\n
    * fix 32 by @people in https://github.com/owner/repo/pull/53\n
    \n
    \n
    ## New Contributors\n
    * @people made their first contribution in https://github.com/owner/repo/pull/13\n
    * @people made their first contribution in https://github.com/owner/repo/pull/16\n
    * @people made their first contribution in https://github.com/owner/repo/pull/42\n
    * @people made their first contribution in https://github.com/owner/repo/pull/53\n
    \n
    \n
    ## New documentation\n
    * Link: https://somewhere.com/on/the/internet
    \n
    \n
    **Full Changelog**: https://github.com/owner/repo/compare/v1.0.20...v1.1.0
`

  const result = getPrNumbersFromReleaseNotes(testReleaseNotes)
  const expected = ['13', '15', '16', '18', '42', '50', '52', '53']

  tap.same(result, expected)
})

tap.test('Should return truncated PR body', async () => {
  const testReleaseNotes = `
    ## Whats Changed\n +
    * chore 15 by @people in https://github.com/owner/repo/pull/13\n
    * chore 18 by @people in https://github.com/owner/repo/pull/15\n
    * chore 19 by @people in https://github.com/owner/repo/pull/16\n
    * chore 21 by @people in https://github.com/owner/repo/pull/18\n
    * fix 26 by @people in https://github.com/owner/repo/pull/42\n
    * feature 30 by @people in https://github.com/owner/repo/pull/50\n
    * fix 27 by @people in https://github.com/owner/repo/pull/52\n
    * fix 32 by @people in https://github.com/owner/repo/pull/53\n
    \n
    \n
    ## New Contributors\n
    * @people made their first contribution in https://github.com/owner/repo/pull/13\n
    * @people made their first contribution in https://github.com/owner/repo/pull/16\n
    * @people made their first contribution in https://github.com/owner/repo/pull/42\n
    * @people made their first contribution in https://github.com/owner/repo/pull/53\n
    \n
    \n
    ## New documentation\n
    * Link: https://somewhere.com/on/the/internet
    \n
    \n
    **Full Changelog**: https://github.com/owner/repo/compare/v1.0.20...v1.1.0
`

  let longPrBody = testReleaseNotes
  for (let i = 0; i < 70; i++) {
    longPrBody = longPrBody + testReleaseNotes
  }

  tap.ok(longPrBody.length > 65536)
  const truncatedPrBody = getPRBody(_template(longPrBody), {
    newVersion: '1.0.0',
    draftRelease: '',
    inputs: [],
    author: 'test',
    artifact: null,
  })
  tap.ok(truncatedPrBody.length < 65536)
  tap.ok(
    truncatedPrBody.includes(`<release-meta>{"version":"1.0.0"}</release-meta>`)
  )
})
