import format from 'string-format'

const transformCommitMessage = (template, version) => {
  return format(template.replace(/"/g, '\\"'), { version })
}

export default transformCommitMessage
