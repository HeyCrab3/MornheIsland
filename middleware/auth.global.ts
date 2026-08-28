/**
 * 全局 auth 中间件。
 * 页面在 definePageMeta 中设置 protected: true 后，
 * 未登录 / 会话过期的用户会被重定向到 /login。
 */

// session 内已校验过 token 有效性的标记（避免每次导航都打后端）
let verified = false;
let verifying: Promise<boolean> | null = null;

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.protected !== true) return;

  // 仅在客户端检查 token
  if (typeof window === "undefined") return;

  const token = localStorage.getItem("token");
  if (!token) {
    return navigateTo("/login");
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
    return navigateTo("/login");
  }
});
