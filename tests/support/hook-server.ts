import { createServer, type RequestListener } from 'node:http'
import type { AddressInfo } from 'node:net'

// webhook targets on a port picked by the OS: worktrees running their tests at the same time
// would otherwise receive each other's deliveries on a shared fixed port
export const startHookServer = async (listener: RequestListener) => {
  const server = createServer(listener)
  await new Promise<void>(resolve => server.listen(0, resolve))
  return { url: `http://localhost:${(server.address() as AddressInfo).port}/hook`, close: () => server.close() }
}

// nothing listens on port 1 and no test can bind it (privileged): a delivery there fails at once
export const closedPortUrl = 'http://localhost:1'
