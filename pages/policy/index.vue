<template>
  <ResourceList collection="policy" :label="$t('composables.useciresource.policy')" />
</template>
<script setup lang="ts">
definePageMeta({ title: "策略库", protected: true });
</script>
