import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { computed, ref } from "vue";
import api from "@/util/api";
import { ElMessage as message } from "element-plus";
import { userService } from "../services/user.service";
import {
  INVALID_TOKEN_MSG,
  type UserData,
  type FetchUserResult,
} from "../types/user";

export const useUserStore = defineStore("user", () => {
  // 使用useStorage替代useSessionStorage，支持持久化登录状态
  const user = useStorage<UserData>("user_data", {
    loggedIn: false,
    userName: "",
    userId: "",
    delegate: false,
  });

  // 检查认证状态
  const checkAuthentication = (): string | null => {
    const token = localStorage.getItem("token");
    if (!token) {
      message.warning("未登录");
      return null;
    }
    return token;
  };

  // 能力位：前端只用它来隐藏「没有意义的功能入口」，真正的校验始终在后端
  const caps = ref<string[]>([]);
  const capKind = ref<"owner" | "grantee" | "subaccount" | "delegate">("owner");
  const isOwner = ref(true);
  const isSubAccount = computed(() => capKind.value === "subaccount");

  const fetchCapabilities = async () => {
    try {
      const res: any = await api.get("/v1/user/capabilities");
      const d = res?.data || res;
      caps.value = Array.isArray(d?.caps) ? d.caps : [];
      capKind.value = d?.kind || "owner";
      isOwner.value = d?.isOwner !== false;
    } catch {
      // 接口不存在或失败时按「主账号」处理，宁可多显示也不要让人用不了
      caps.value = [];
      capKind.value = "owner";
      isOwner.value = true;
    }
  };

  /**
   * 有没有某个能力。
   *
   * 主账号只要没收到别人的委托就是全权，直接放行 —— 否则每个主账号
   * 都要在这里被枚举一遍能力位，多一处漏写就少一个入口。
   */
  const hasCap = (cap: string): boolean => {
    if (isOwner.value) return true;
    return caps.value.includes(cap);
  };

  // 获取用户数据（主函数）
  const fetchUserData = async (): Promise<FetchUserResult> => {
    try {
      // 并行执行所有API调用
      const [authData] = await Promise.all([
        userService.getAuth(),
      ]);

      // 批量更新用户数据
      user.value = {
        ...authData,
        loggedIn: true,
      };

      await fetchCapabilities();

      return { isSuccess: true };
    } catch (error: any) {
      console.error("获取用户数据失败:", error);

      // 如果是token无效，清空登录状态
      if (error.message === INVALID_TOKEN_MSG) {
        logout();
      }

      return {
        isSuccess: false,
        msg: error.message || "获取用户数据失败",
      };
    }
  };

  // 登出函数
  const logout = (): void => {
    user.value = {
      loggedIn: false,
      userName: "",
      userId: "",
      delegate: false,
    };
    caps.value = [];
    capKind.value = "owner";
    isOwner.value = true;
    localStorage.removeItem("token");
  };

  // 计算属性
  const isLoggedIn = computed(() => user.value.loggedIn);
  const userName = computed(() => user.value.userName);
  const userId = computed(() => user.value.userId);
  const isDelegate = computed(() => !!user.value.delegate);

  return {
    // 状态 - 保持向后兼容
    user_data: user,

    // 计算属性
    isLoggedIn,
    userName,
    userId,
    isDelegate,
    caps,
    capKind,
    isOwner,
    isSubAccount,

    // 方法
    fetchUserData,
    fetchCapabilities,
    hasCap,
    logout,
    checkAuthentication,
  };
});
