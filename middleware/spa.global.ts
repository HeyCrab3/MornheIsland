export default defineNuxtRouteMiddleware((to, from) => {
  if (to.path.includes('spa')) {
    setPageLayout(false)
  }
})
  