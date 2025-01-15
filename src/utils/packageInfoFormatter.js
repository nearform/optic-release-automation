'use strict'

const formatPackageInfo = (version, packageName) => {
  return {
    packageInfo: {
      version: version || '',
      name: packageName || '',
    },
  }
}

module.exports = {
  formatPackageInfo,
}
