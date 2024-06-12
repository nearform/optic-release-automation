import { lstat } from 'node:fs/promises'
import AdmZip from 'adm-zip'

export const archiveItem = async (path, out) => {
  const itemIsDirectory = await isDirectory(path)

  const zip = new AdmZip()
  try {
    if (itemIsDirectory) {
      await zip.addLocalFolderPromise(path)
    } else {
      zip.addLocalFile(path)
    }

    await zip.writeZipPromise(out)
  } catch (err) {
    throw new Error(
      'An error occurred while zipping the build folder: ' + err.message
    )
  }
}

const isDirectory = async path => {
  try {
    const stat = await lstat(path)
    return stat.isDirectory()
  } catch (err) {
    throw new Error(
      'An error occurred while checking if file or directory: ' + err.message
    )
  }
}
