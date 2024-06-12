import { parse } from 'semver'
import _truncate from 'lodash.truncate'
import markdownIt from 'markdown-it'

const md = markdownIt()

const PR_BODY_TRUNCATE_SIZE = 30000

export function getPrNumbersFromReleaseNotes(releaseNotes) {
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

export function getPRBody(
  template,
  { newVersion, draftRelease, inputs, author, artifact }
) {
  const tagsToBeUpdated = []
  const { major, minor } = parse(newVersion)

  if (major !== 0) tagsToBeUpdated.push(`v${major}`)
  if (minor !== 0) tagsToBeUpdated.push(`v${major}.${minor}`)

  // Should strictly contain only non-sensitive data
  const releaseMeta = {
    id: draftRelease.id,
    version: newVersion,
    npmTag: inputs['npm-tag'],
    opticUrl: inputs['optic-url'],
  }

  const draftReleaseBody = draftRelease?.body || ''
  if (draftReleaseBody.length > PR_BODY_TRUNCATE_SIZE) {
    const omissionText =
      '> Some of these release notes have been truncated to respect Pull Request body size limits'
    draftRelease.body = _truncate(draftReleaseBody, {
      length: PR_BODY_TRUNCATE_SIZE,
      omission: omissionText,
    })
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

  return prBody
}
