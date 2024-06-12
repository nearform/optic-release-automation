import { execWithOutput } from './execWithOutput.js'

export async function tagVersionInGit(version) {
  await execWithOutput('git', ['tag', '-f', version])
  await execWithOutput('git', ['push', 'origin', `-f`, version])
}
