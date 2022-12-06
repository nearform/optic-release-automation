'use strict'

const semver = require('semver')
const _truncate = require('lodash.truncate')

const md = require('markdown-it')()

const MAX_PR_BODY_SIZE_LIMITATION = 65536
const PR_BODY_TRUNCATE_SIZE = 60000

function getPrNumbersFromReleaseNotes(releaseNotes) {
  const parsedReleaseNotes = md.parse(releaseNotes, {})
  const prTokens = parsedReleaseNotes.filter(token => token.type === 'inline')

  const allPrNumbers = prTokens
    .map(token => {
      const urlMatch = token.content.match(/\bhttps?:\/\/\S+/gi)

      if (!urlMatch) {
        return
      }

      const lastUrlPart = urlMatch[0].split('/').pop()

      // Filter out the full change log numbers such as v1.0.1...v1.0.2
      const prNumberMatch = lastUrlPart.match(/^\d+$/)

      if (!prNumberMatch) {
        return
      }

      return prNumberMatch[0]
    })
    .filter(prNumber => Boolean(prNumber))

  return [...new Set(allPrNumbers)]
}

exports.getPRBody = (
  template,
  { newVersion, draftRelease, inputs, author, artifact }
) => {
  const tagsToBeUpdated = []
  const { major, minor } = semver.parse(newVersion)

  if (major !== 0) tagsToBeUpdated.push(`v${major}`)
  if (minor !== 0) tagsToBeUpdated.push(`v${major}.${minor}`)

  // Should strictly contain only non-sensitive data
  const releaseMeta = {
    id: draftRelease.id,
    version: newVersion,
    npmTag: inputs['npm-tag'],
    opticUrl: inputs['optic-url'],
  }

  const prBody = template({
    releaseMeta,
    draftRelease,
    tagsToUpdate: tagsToBeUpdated.join(', '),
    npmPublish: !!inputs['npm-token'],
    artifact,
    syncTags: /true/i.test(inputs['sync-semver-tags']),
    author,
  })

  let truncatedPrBody = prBody
  if (prBody.length > MAX_PR_BODY_SIZE_LIMITATION) {
    const omissionText =
      '. *Note: Part of the release notes have been omitted from this message, as the content exceeds the size limit*'
    truncatedPrBody = _truncate(prBody, {
      length: PR_BODY_TRUNCATE_SIZE,
      omission: omissionText,
    })
  }

  const releaseTpl = `
<!--
<release-meta>${JSON.stringify(releaseMeta)}</release-meta>
-->
`

  return truncatedPrBody + releaseTpl
}

exports.getPrNumbersFromReleaseNotes = getPrNumbersFromReleaseNotes
