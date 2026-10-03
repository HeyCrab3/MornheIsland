// https://nuxt.com/docs/api/configuration/nuxt-config
import { execSync } from "child_process";
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: [
    "/assets/styles/fonts.css",
    "/assets/styles/cui-common.scss",
    "/assets/styles/tailwind.css",
    "/assets/styles/tokens.scss",
  ],
  devServer: {
    port: 6003,
  },
  runtimeConfig: {
    public: {
      COMMIT_REF:
        process.env.COMMIT_REF ||
        execSync("git rev-parse HEAD").toString().trim() ||
        "未知",
      RUNTIME: process.env.NODE_ENV || "production",
      VERSION: "0.2.0",
      COMMIT_DATE:
        process.env.COMMIT_DATE ||
        execSync("git show -s --format=%ci").toString().trim() ||
        "未知",
    },
  },

  nitro: {
    prerender: {
      failOnError: false,
    },
  },
  elementPlus: {
    importStyle: "scss",
    defaultLocale: "zh-CN"
  },
  routeRules: {
    "/spa/**": { ssr: false },
    "/callback": { ssr: false },
  },

  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:7000/",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/assets/styles/element/index.scss" as *;',
          silenceDeprecations: ["legacy-js-api", "global-builtin"],
        },
      },
    },
    plugins: [tailwindcss()],
  },
  app: {
    head: {
      title: "MornheIsland",
      link: [
        {
          rel: "icon",
          href: "https://coss.crabapi.cn/crabmtr/mmexport1782563887148.gif",
        },
      ],
      // @ts-ignore
      style: ["html, body, #__nuxt { height: 100%; margin: 0 }"],
    },
  },
  gtag: {
    id: "G-JCN9611G2C",
    enabled: process.env.NODE_ENV === 'production',
  },
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "MornheIsland · 莫宁岛",
      short_name: "MornheIsland",
      description: "ClassIsland 集控服务",
      theme_color: "#A6C2F7",
      display: "standalone",
      icons: [
        {
          src: "https://coss.crabapi.cn/crabmtr/mmexport1782563887148.gif",
          sizes: "192x192 512x512",
          type: "image/gif",
        },
      ],
    },
    workbox: {
      // 本应用是 SSR（nitro node-server），没有可以作为外壳的 index.html：
      // 绝不能让 SW 接管导航请求。
      //
      // 原来这里写的 navigateFallback: "/" 会被 vite-plugin-pwa 加进预缓存清单、
      // 并注册一条 NavigationRoute，把所有导航（含 /callback）都回退到缓存的首页。
      // 结果就是登录回调拿不到真实路由——用户点了登录却回不来。
      // 生成的 sw.js 里确实有 NavigationRoute / createHandlerBoundToURL，可复现。
      //
      // 必须显式写 undefined：vite-plugin-pwa 的默认值是 "index.html"，
      // 而它是用 Object.assign 合并的（值为 undefined 的键同样会覆盖默认值），
      // 写 null 会被 workbox 的 schema 拒掉，所以用 undefined。
      navigateFallback: undefined,
      // 同理不预缓存 html，避免旧页面被长期缓存
      globPatterns: ["**/*.{js,css,png,svg,ico,gif,woff2}"],
    },
    devOptions: {
      enabled: false,
    },
  },
  shadcn: {
    prefix: "",
    componentDir: "./components/ui",
  },
  modules: [
    "@pinia/nuxt",
    "@element-plus/nuxt",
    "@nuxt/content",
    "nuxt-gtag",
    "@vite-pwa/nuxt",
    "nuxt-echarts",
    "@nuxt/content",
    "shadcn-nuxt",
  ],
});