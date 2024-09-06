import type { Notification } from '#shared/types/index.ts'

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
