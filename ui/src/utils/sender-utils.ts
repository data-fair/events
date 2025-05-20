import type { Subscription } from '#api/types'

export const parseSender = (senderStr: string) => {
  if (senderStr === 'none') return senderStr

  const senderParts = senderStr.split(':')
  if (senderParts[0] !== 'user' && senderParts[0] !== 'organization') throw new Error('unsupported sender type ' + senderStr)
  const sender: Subscription['sender'] = {
    type: senderParts[0],
    id: senderParts[1]
  }
  if (senderParts[2]) sender.department = senderParts[2]
  if (senderParts[3]) sender.role = senderParts[3]
  return sender
}

export const serializeSender = (sender: Required<Subscription>['sender']) => {
  let str = `${sender.type}:${sender.id}:${sender.department || ''}`
  if (sender.role) str += `:${sender.role}`
  return str
}
