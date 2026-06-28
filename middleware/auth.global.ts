/**
 * 全局 auth 中间件。
 * 页面在 definePageMeta 中设置 protected: true 后，
 * 未登录用户会被重定向到 /login。
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.protected !== true) return;

  // 仅在客户端检查 token
  if (typeof window === "undefined") return;

  const token = localStorage.getItem("token");
  if (!token) {
    return navigateTo("/login");
  }
});
