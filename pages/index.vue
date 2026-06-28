<template>
  <div>
    <h1 class="text-2xl font-semibold mb-1">仪表盘</h1>
    <p class="text-sm text-gray-500 mb-6">在这里查看当前账号下关联的资源情况。</p>

    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>班级总数</template>
          <p class="text-3xl font-bold" style="color: var(--mi-brand)">{{ stats.classCount }}</p>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>已连接设备</template>
          <p class="text-3xl font-bold" style="color: var(--mi-accent)">{{ stats.deviceCount }}</p>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>已下发课表</template>
          <p class="text-3xl font-bold" style="color: var(--mi-brand-deep)">{{ stats.classplanCount }}</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ title: "仪表盘", protected: true });

const stats = reactive({
  classCount: 0,
  deviceCount: 0,
  classplanCount: 0,
});

onMounted(async () => {
  try {
    const [classesRes, devicesRes] = await Promise.all([
      $fetch("/api/v1/console/ci/class/list", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
      $fetch("/api/v1/console/ci/devices", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
    ]);

    const classes: any[] = (classesRes as any)?.data || [];
    const devices: any[] = (devicesRes as any)?.data || [];

    stats.classCount = classes.length;
    stats.deviceCount = devices.length;
    stats.classplanCount = classes.filter((c: any) => c.classplanId).length;
  } catch {
    // 静默失败，仪表盘不弹错误
  }
});
</script>
