const SITE_NAME = "MornheIsland 莫宁岛"
const DEFAULT_TITLE = `${SITE_NAME} - ClassIsland / Class Widgets 2 集控平台｜电子课表集控 · 插件分发 · 终端管理 · 班级管理`

export default defineNuxtRouteMiddleware((to, from) => {
    useHead({
        title: to.meta.title
            ? `${to.meta.title} | ${SITE_NAME}`
            : DEFAULT_TITLE,
    })
})
  