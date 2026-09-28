import { createDemoApi } from '@/demo/demo-api'
import { createHttpApi } from './http-api'
import { runtimeConfiguration } from './runtime-configuration'

export const dashboardApi = runtimeConfiguration.isDemoMode ? createDemoApi() : createHttpApi(runtimeConfiguration.apiBaseUrl)
