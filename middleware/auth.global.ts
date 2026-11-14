/**
 * 全局 auth 中间件。
 * 页面在 definePageMeta 中设置 protected: true 后，
 * 未登录 / 会话过期的用户会被重定向到 /login。
 *
 * ⚠ 跳登录时必须**带上原目标**：
 * 邀请链接 `/schools/join/<token>`、扫码页、以及任何深链都是一次性的，
 * 不带目标的话用户登录完只会落到首页 —— 实测反馈的
 * "邀请链接打不开、直接跳回主页" 就是这个原因。
 */

// session 内已校验过 token 有效性的标记（避免每次导航都打后端）
let verified = false;
let verifying: Promise<boolean> | null = null;

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.protected !== true) return;

  // 仅在客户端检查 token
  if (typeof window === "undefined") return;

  const toLogin = () => navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);

  const token = localStorage.getItem("token");
  if (!token) {
    return toLogin();
  }

  // token 存在但可能已过期：向后端校验一次有效性
  if (verified) return;

  if (!verifying) {
    verifying = $fetch("/api/v1/user/auth", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res: any) => {
        // 后端当前把「未授权」以 HTTP 200 + code:401 返回
        if (!res || res.code !== 0) {
          localStorage.removeItem("token");
          return false;
        }
        verified = true;
        return true;
      })
      .catch(() => {
        localStorage.removeItem("token");
        return false;
      })
      .finally(() => {
        verifying = null;
      });
  }

  const ok = await verifying;
  if (!ok) {
    return toLogin();
  }
});
