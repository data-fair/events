import type { Notification } from '#types'

export type PrivateAccess = {
  type: 'user' | 'organization'
  id: string
  name: string
}

export type Access = {
  public: boolean;
  privateAccess: PrivateAccess[]
}

export type Pointer = {
  recipient: Notification['recipient'],
  date: string
}
