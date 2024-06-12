import { execWithOutput } from './execWithOutput.js'

async function revertCommit(baseRef) {
  await execWithOutput('git', ['revert', 'HEAD'])
  await execWithOutput('git', ['push', 'origin', baseRef])
}

const _revertCommit = revertCommit
export { _revertCommit as revertCommit }
