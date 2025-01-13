'use strict'

const { execWithOutput } = require('./execWithOutput')
const { getPublishedInfo, getLocalInfo } = require('./packageInfo')

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

async function publishToNpm({
  npmToken,
  opticToken,
  opticUrl,
  npmTag,
  version,
  provenance,
  access,
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

    let otp

    if (opticToken || ngrokApiKey) {
      if (opticToken) {
        const packageInfo = await getLocalInfo()
        
        // push notification via optic mobile app
        otp = await execWithOutput('curl', [
          '-s',
          '-d',
          JSON.stringify({ packageInfo: { version, name: packageInfo?.name } }),
          '-H',
          'Content-Type: application/json',
          '-X',
          'POST',
          `${opticUrl}${opticToken}`,
        ])
      } else if (ngrokApiKey) {
        // 1. run a fastify app which exposes a simple web UI with a text input to get the OTP
        // 2. expose the app via ngrok
        // 3. print the url to the app on the workflow execution output
        // 4. wait for some time or a timeout
        // 5. if we get the token from the user, continue with the execution, otherwise timeout
        const app = fastify()

        app.get('/', () => {
          // serve static page with text input which, when submitted, POSTs the OTP to /otp url
        })

        let otpPromiseResolve
        const otpPromise = new Promise(resolve => { otpPromiseResolve = resolve })

        app.post('/otp', async req => {
          const otp = req.body.otp

          otpPromiseResolve(otp)
        })

        app.listen({ host: ..., port: ...})

        // expose the fastify app via nkgrok and get the ngrok app url, see https://github.com/ngrok/ngrok-javascript
        const ngrokUrl = ...
        
        console.log("Please visit this url to provide the OTP:", ngrokUrl)

        // timeout mechanism here
        otp = await otpPromiseResolve

        // tear down fastify application here (optional, once the action finishes executing it will tear down automatically)
      }
      
      await execWithOutput('npm', ['publish', '--otp', otp, ...flags])
    } else {
      await execWithOutput('npm', ['publish', ...flags])
    }
  }
}

exports.publishToNpm = publishToNpm
