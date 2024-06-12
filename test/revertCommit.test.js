import { afterEach, mockImport, test } from 'tap'
import { stub, restore, assert } from 'sinon'

const setup = async () => {
  const execWithOutputStub = stub()
  const revertCommitProxy = await mockImport('../src/utils/revertCommit.js', {
    '../src/utils/execWithOutput.js': { execWithOutput: execWithOutputStub },
  })

  return { execWithOutputStub, revertCommitProxy }
}

afterEach(() => {
  restore()
})

test('Revert commit', async t => {
  const { revertCommitProxy, execWithOutputStub } = await setup()
  const baseRef = 'master'
  await revertCommitProxy.revertCommit(baseRef)

  t.ok(execWithOutputStub.callCount === 2)

  assert.calledWithExactly(execWithOutputStub, 'git', ['revert', 'HEAD'])
  assert.calledWithExactly(execWithOutputStub, 'git', [
    'push',
    'origin',
    `${baseRef}`,
  ])
})
