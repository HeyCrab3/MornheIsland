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
      VERSION: "0.0.1-alpha.1",
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
  modules: ["@pinia/nuxt", "@element-plus/nuxt"],
});
