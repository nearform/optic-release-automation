import { test } from 'tap'
import transformCommitMessage from '../src/utils/commitMessage.js'

test('Handles normal commit messages', async t => {
  t.equal(
    'Release v5.1.0',
    transformCommitMessage('Release {version}', 'v5.1.0')
  )
})

test('Handles customized messages', async t => {
  t.equal(
    '[v5.1.0] Released! Some long text goes here!',
    transformCommitMessage(
      '[{version}] Released! Some long text goes here!',
      'v5.1.0'
    )
  )
})

test('Handles messages with quotes', async t => {
  t.equal(
    '[v5.1.0] \\"Quotes\\"',
    transformCommitMessage('[{version}] "Quotes"', 'v5.1.0')
  )
})
