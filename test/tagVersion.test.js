import { afterEach, mockImport, test } from 'tap'
import { stub, restore, assert } from 'sinon'

const setup = async () => {
  const execWithOutputStub = stub()
  const tagVersionProxy = await mockImport('../src/utils/tagVersion.js', {
    '../src/utils/execWithOutput.js': { execWithOutput: execWithOutputStub },
  })

  return { execWithOutputStub, tagVersionProxy }
}

afterEach(() => {
  restore()
})

test('Tag version in git', async t => {
  const { tagVersionProxy, execWithOutputStub } = await setup()
  const version = 'v3.0.0'
  await tagVersionProxy.tagVersionInGit(version)

  t.ok(execWithOutputStub.callCount === 2)

  assert.calledWithExactly(execWithOutputStub, 'git', [
    'tag',
    '-f',
    `${version}`,
  ])
  assert.calledWithExactly(execWithOutputStub, 'git', [
    'push',
    'origin',
    '-f',
    `v3.0.0`,
  ])
})
