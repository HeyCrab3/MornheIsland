import api from '../util/api';
import type { UserData } from '../types/user';

export const userService = {
  // 获取用户认证信息
  getAuth: () => api.get<UserData>('/v1/user/auth'),
};