exports.parseSender = (senderStr) => {
  if (senderStr === 'none') return senderStr

  const senderParts = senderStr.split(':')
  const sender = {
    type: senderParts[0],
    id: senderParts[1]
  }
  if (senderParts[2]) sender.department = senderParts[2]
  if (senderParts[3]) sender.role = senderParts[3]
  return sender
}

exports.serializeSender = (sender, includeRole) => {
  let str = `${sender.type}:${sender.id}:${sender.department || ''}`
  if (includeRole && sender.role) str += `:${sender.role}`
  return str
}
