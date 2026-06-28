// 用户数据接口
export interface UserData {
  userName?: string;
  userId?: string | number;
  loggedIn: boolean;
}

// API响应接口
export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data: T;
}

// 函数返回类型
export interface FetchUserResult {
  isSuccess: boolean;
  msg?: string;
}

// 常量定义
export const INVALID_TOKEN_MSG = 'Token missing';
export const INITIAL_USER_STATE: UserData = {
  userName: undefined,
  userId: undefined,
  loggedIn: false,
};