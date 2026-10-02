<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

/**
 * 桌面端居中 Dialog、移动端底部 Drawer，两者都是模态层（reka-ui / vaul）。
 *
 * 模态层会把 document.body 设成 pointer-events:none，只给自己的内容恢复 auto；
 * 因此**不要在这里放会把浮层 teleport 到 body 的组件**（el-select / el-date-picker /
 * el-cascader / el-autocomplete 等）：浮层会继承 none，表现为“能展开但点不中选项”，
 * 而且浮层没有 data-dismissable-layer 祖先，还会被判为“点击外部”而直接关掉抽屉。
 * 需要选择时请用文档流内的控件（如 el-radio-group / el-checkbox 列表）。
 */
defineProps<{ title: string }>();
const open = defineModel<boolean>("open", { default: false });

// 桌面端用居中 Dialog，移动端用底部 Drawer
const isDesktop = useMediaQuery("(min-width: 768px)");
</script>

<template>
  <Dialog v-if="isDesktop" v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
      <div class="max-h-[60vh] overflow-y-auto">
        <slot />
      </div>
      <div v-if="$slots.footer" class="flex justify-end gap-2">
        <slot name="footer" />
      </div>
    </DialogContent>
  </Dialog>

  <Drawer v-else v-model:open="open">
    <DrawerContent class="max-h-[80vh]">
      <DrawerHeader>
        <DrawerTitle>{{ title }}</DrawerTitle>
      </DrawerHeader>
      <div class="px-4 pb-4 overflow-y-auto">
        <slot />
      </div>
      <div v-if="$slots.footer" class="px-4 pb-4 flex justify-end gap-2">
        <slot name="footer" />
      </div>
    </DrawerContent>
  </Drawer>
</template>
