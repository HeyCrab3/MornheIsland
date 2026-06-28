<template>
  <ResourceEditor collection="subjects" label="科目">
    <template #default="{ doc, save }">
      <SubjectsEditor v-if="doc" :model-value="doc.data" @save="save" />
    </template>
  </ResourceEditor>
</template>
<script setup lang="ts">
definePageMeta({ title: "编辑科目", protected: true });
</script>
