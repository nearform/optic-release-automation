'use strict'

const { execWithOutput } = require('./execWithOutput')
const { getPublishedInfo, getLocalInfo } = require('./packageInfo')
const otpVerification = require('./otpVerification')
const { formatPackageInfo } = require('./packageInfoFormatter')
const { logInfo } = require('../log')

async function allowNpmPublish(version) {
  // We need to check if the package was already published. This can happen if
  // the action was already executed before, but it failed in its last step
  // (GH release).

  const packageInfo = await getPublishedInfo()
  // Package has not been published before
  if (!packageInfo?.name) {
    return true
  }

  // NPM only looks into the remote registry when we pass an explicit
  // package name & version, so we don't have to fear that it reads the
  // info from the "local" package.json file.
  let packageVersionInfo

  try {
    // npm < v8.13.0 returns empty output, newer versions throw a E404
    // We handle both and consider them as package version not existing
    packageVersionInfo = await execWithOutput('npm', [
      'view',
      `${packageInfo.name}@${version}`,
    ])
  } catch (error) {
    if (!error?.message?.match(/code E404/)) {
      throw error
    }
  }

  return !packageVersionInfo
}

async function getOpticOTP(opticToken, opticUrl, formattedPackageInfo) {
  try {
    const otp = await execWithOutput('curl', [
      '-s',
      '-d',
      JSON.stringify(formattedPackageInfo),
      '-H',
      'Content-Type: application/json',
      '-X',
      'POST',
      `${opticUrl}${opticToken}`,
    ])
    return { source: 'optic', otp }
  } catch (error) {
    return { source: 'optic', error }
  }
}

async function getNgrokOTP(formattedPackageInfo, tunnelUrl) {
  try {
    const otp = await otpVerification({
      ...formattedPackageInfo.packageInfo,
      tunnelUrl,
    })
    return { source: 'ngrok', otp }
  } catch (error) {
    return { source: 'ngrok', error }
  }
}

async function getOTPPromises(options) {
  const { opticToken, ngrokToken, opticUrl, formattedPackageInfo, tunnelUrl } =
    options
  const otpPromises = []

  if (opticToken) {
    otpPromises.push(getOpticOTP(opticToken, opticUrl, formattedPackageInfo))
  }

  if (ngrokToken) {
    otpPromises.push(getNgrokOTP(formattedPackageInfo, tunnelUrl))
  }

  return otpPromises
}

async function publishWithOTP(flags, otpResult) {
  if (otpResult.error) {
    throw otpResult.error
  }

  logInfo(`OTP verification successful using ${otpResult.source}`)
  await execWithOutput('npm', ['publish', '--otp', otpResult.otp, ...flags])
}

async function publishToNpm({
  npmToken,
  opticToken,
  ngrokToken,
  opticUrl,
  npmTag,
  version,
  provenance,
  access,
  tunnelUrl,
}) {
  await execWithOutput('npm', [
    'config',
    'set',
    `//registry.npmjs.org/:_authToken=${npmToken}`,
  ])

  const flags = ['--tag', npmTag]

  if (access) {
    flags.push('--access', access)
  }

  if (provenance) {
    flags.push('--provenance')
  }

  if (await allowNpmPublish(version)) {
    await execWithOutput('npm', ['pack', '--dry-run'])
    const packageInfo = await getLocalInfo()
    const formattedPackageInfo = formatPackageInfo(version, packageInfo?.name)

    if (opticToken || ngrokToken) {
      try {
        const options = {
          opticToken,
          ngrokToken,
          opticUrl,
          formattedPackageInfo,
          tunnelUrl,
        }
        const otpPromises = await getOTPPromises(options)
        const result = await Promise.race(otpPromises)
        await publishWithOTP(flags, result)
      } catch (error) {
        throw new Error(`OTP verification failed: ${error.message}`)
      }
    } else {
      await execWithOutput('npm', ['publish', ...flags])
    }
  }
}

exports.publishToNpm = publishToNpm
