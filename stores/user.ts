import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { computed } from "vue";
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
    userId: ""
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
    };
    localStorage.removeItem("token");
  };

  // 计算属性
  const isLoggedIn = computed(() => user.value.loggedIn);
  const userName = computed(() => user.value.userName);
  const userId = computed(() => user.value.userId);

  return {
    // 状态 - 保持向后兼容
    user_data: user,

    // 计算属性
    isLoggedIn,
    userName,
    userId,

    // 方法
    fetchUserData,
    logout,
    checkAuthentication,
  };
});
