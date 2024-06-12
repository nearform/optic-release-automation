import { StringDecoder } from 'node:string_decoder'

import { exec } from '@actions/exec'
import { REDACTION_META_INFO_FOR_CONFIDENTIAL_ARGS } from '../const.js'

/**
 *
 * @param {string[]} args
 * @returns string[] Redacted Array or Blank Array if null/undefined
 */
export function redactConfidentialArguments(args) {
  return (args ?? []).filter((_, index) => {
    const currentArg = args[index]?.toString().trim().toLocaleUpperCase()
    const previousArg = args[index - 1]?.toString().trim().toLocaleUpperCase()

    return !(
      REDACTION_META_INFO_FOR_CONFIDENTIAL_ARGS[currentArg]?.redactCurrentArg ||
      REDACTION_META_INFO_FOR_CONFIDENTIAL_ARGS[previousArg]?.redactNextArg
    )
  })
}

/**
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {{cwd?: string}} options
 * @returns Promise<string>
 */
export async function execWithOutput(
  cmd,
  args,
  { cwd, silent = false, env = getFilteredEnv(), ...options } = {}
) {
  let output = ''
  let errorOutput = ''

  const stdoutDecoder = new StringDecoder('utf8')
  const stderrDecoder = new StringDecoder('utf8')

  options.silent = silent
  options.env = env

  /* istanbul ignore else */
  if (cwd !== '') {
    options.cwd = cwd
  }

  options.listeners = {
    /**
     *
     * @param {Buffer} data
     */
    stdout: data => {
      output += stdoutDecoder.write(data)
    },
    /**
     *
     * @param {Buffer} data
     */
    stderr: data => {
      errorOutput += stderrDecoder.write(data)
    },
  }

  let code = 0
  try {
    code = await exec(cmd, args, options)
  } catch {
    //the actual error does not matter, because it does not contain any relevant information. The actual exec output is collected bellow in output and errorOutput
    code = 1
  }

  output += stdoutDecoder.end()
  errorOutput += stderrDecoder.end()

  if (code === 0) {
    return output.trim()
  }

  throw new Error(
    `${cmd} ${redactConfidentialArguments(args).join(
      ' '
    )} returned code ${code} \nSTDOUT: ${output}\nSTDERR: ${errorOutput}`
  )
}

/**
 * By default, `@actions/exec` 1.x's exec method copies all env vars to the child process,
 * This includes `INPUT_*` vars that are specific to this action. This can leak repo secrets,
 * such as the user's NPM_TOKEN and OPTIC_TOKEN. It's recommended to filter these.
 * This may become the default behaviour in a future `@actions/exec` major release.
 * @see https://github.com/actions/toolkit/issues/309
 *
 * @returns {Record<string, any>}
 */
function getFilteredEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('INPUT_'))
  )
}
