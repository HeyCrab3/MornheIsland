// plugins/fingerprint.client.ts
import { defineNuxtPlugin } from "#app";
import { FingerprintPlugin } from "@fingerprint/vue";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(FingerprintPlugin, {
    apiKey: "dfTW4rd7DNiDI8rKCeSw",
    region: "ap",
    cache: {
      storage: "sessionStorage", // or 'localStorage' or 'agent'
      duration: "optimize-cost", // or 'aggressive' or a number in seconds
    },
  });
});
