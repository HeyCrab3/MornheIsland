/**
 * 在无组件实例的上下文里翻译文案。
 * store、工具函数、定时器里拿不到 useI18n()，只能走 nuxtApp。
 */
export function translate(key: string): string {
  try {
    const app = useNuxtApp();
    const t = (app as any).$i18n?.t;
    if (typeof t === 'function') return t(key);
  } catch {
    // 没有 Nuxt 上下文时退回中文原文
  }
  return FALLBACK[key] ?? key;
}

const FALLBACK: Record<string, string> = {
  'api.notLoggedIn': '未登录',
  'api.networkError': '网络错误',
  'stores.user.fetchUserFailed': '获取用户数据失败',
  'stores.user.fetchUserFailedWithColon': '获取用户数据失败：',
  'util.getplatformdata.missingBusinessSku': '缺少业务 SKU',
};
