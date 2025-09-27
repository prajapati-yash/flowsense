export interface FlowUser {
  loggedIn: boolean
  addr: string
  cid?: string
  expiresAt?: number
  f_type: string
  f_vsn: string
  services?: FlowService[]
}

export interface FlowService {
  f_type: string
  f_vsn: string
  type: string
  uid: string
  endpoint?: string
  method?: string
  params?: Record<string, unknown>
}

export interface FlowTransaction {
  status: number
  statusCode: number
  statusString: string
  transactionId: string
  blockId: string
  events: FlowEvent[]
}

export interface FlowEvent {
  type: string
  transactionId: string
  transactionIndex: number
  eventIndex: number
  data: unknown
}

export interface WalletConnectionState {
  isConnected: boolean
  isLoading: boolean
  user?: FlowUser
  error?: string
}