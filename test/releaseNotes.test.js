import { test } from 'tap'
import _template from 'lodash.template'
import { readFileSync } from 'fs'
import { join } from 'path'

import {
  getPrNumbersFromReleaseNotes,
  getPRBody,
} from '../src/utils/releaseNotes.js'

test('Should return the correct PR numbers', async t => {
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

  t.same(result, expected)
})

test('Should return truncated PR body', async t => {
  const tpl = readFileSync(join(import.meta.dirname, '../src/pr.tpl'), 'utf8')

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

  t.ok(longPrBody.length > 60000)

  const truncatedPrBody = getPRBody(_template(tpl), {
    newVersion: '1.0.0',
    draftRelease: { id: 1, body: longPrBody },
    inputs: [],
    author: 'test',
    artifact: null,
  })
  t.ok(truncatedPrBody.length < 65536)
  t.ok(
    truncatedPrBody.includes(
      `<release-meta>{"id":1,"version":"1.0.0"}</release-meta>`
    )
  )
})
