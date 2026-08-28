/**
 * 中台平台数据 Store
 * 全局统一注入，供所有组件读取配置/功能开关/公告/版本
 */
import { defineStore } from 'pinia'
import { getPlatformData, type MiddleEndData } from '@/util/getPlatformData'

declare global {
  interface Window {
    __PLATFORM_DATA__: MiddleEndData | null
  }
}

export const usePlatformStore = defineStore('platform', {
  state: () => ({
    data: null as MiddleEndData | null,
    loaded: false,
    loading: false,
  }),

  getters: {
    /**
     * 功能开关（中台语义）：
     * - key 存在 = 开
     * - key 缺失 = 关
     * - 中台拉取失败 = 返回 fallback
     */
    featureEnabled: (state) => (key: string, fallback = false): boolean => {
      // 中台数据未就绪或拉取失败
      if (!state.data || state.data.product === 'failed to fetch') {
        return fallback
      }
      return key in (state.data.features ?? {})
    },

    /** 读取配置：config('xxx') → any */
    config: (state) => (key: string): any => {
      return state.data?.config?.[key]
    },

    /** 所有公告 */
    notices: (state): any[] => state.data?.notices ?? [],

    /** 当前版本信息 */
    version: (state) => state.data?.version ?? null,

    /** 运行环境 */
    environment: (state) => state.data?.environment ?? 'prod',

    /** 产品名 */
    product: (state) => state.data?.product ?? '',
  },

  actions: {
    /** 初始化：拉取中台数据，缓存到 store 和 window */
    async init(force = false) {
      if (this.loaded || this.loading) {
        if (this.loaded && !force) return
      }

      this.loading = true
      try {
        this.data = await getPlatformData()
        this.loaded = true
        if (import.meta.client) window.__PLATFORM_DATA__ = this.data
      } finally {
        this.loading = false
      }
    },
  },
})

// 全局便捷访问（非 Vue 环境也能用）
// 语义：key 存在=开，key 缺失=关，拉取失败=fallback
export function getPlatformFeature(key: string, fallback = false): boolean {
  const data = window.__PLATFORM_DATA__
  if (!data || data.product === 'failed to fetch') return fallback
  return key in (data.features ?? {})
}
export function getPlatformConfig(key: string): any {
  return window.__PLATFORM_DATA__?.config?.[key]
}
