export interface HostedResponse {
  status: number
  location: string | null
  body: string
}

export type SmokeMode = 'local' | 'cloud'

export interface SmokeCheck {
  name: string
  host: string
  path: string
  expectedStatus: number
  bodyIncludes?: string
  locationStartsWith?: string
}

export interface SmokeResult {
  name: string
  failure: string | null
}
