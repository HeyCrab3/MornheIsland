export default defineNuxtRouteMiddleware((to, from) => {
    if (to.meta.title) useHead({ title: to.meta.title + " | MornheIsland" })
    else useHead({ title: "MornheIsland" })
})
  