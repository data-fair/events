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

// the avatar of '*' (every department) would show an unknown department, the organization says it all;
// subscriptions made before their sender had a name only carry its id, the tooltip would say "undefined"
export const avatarOwner = <T extends { id: string, name?: string, department?: string, departmentName?: string }>(sender: T): T => {
  const owner = { ...sender, name: sender.name || sender.id }
  if (owner.department === '*') {
    delete owner.department
    delete owner.departmentName
  }
  return owner
}
