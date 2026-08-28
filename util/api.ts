import axios from 'axios';
import { ElMessage as message } from 'element-plus';
import { INVALID_TOKEN_MSG } from '../types/user';

const api = axios.create({
  baseURL: process.env.API_BASE_URL || '/api',
  timeout: 10000,
});

// 请求拦截器：自动附加token
api.interceptors.request.use((config) => {
  // 仅在客户端环境中访问localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 响应拦截器：统一错误处理
api.interceptors.response.use(
  (response) => {
    // 统一处理响应数据格式
    if (response.data.code !== 0) {
      // 会话过期 / 未授权：后端当前以 HTTP 200 + code:401 返回，
      // 必须在这里（而非 error 分支）统一清 token 并跳登录。
      if (response.data.code === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        // 抛出 INVALID_TOKEN_MSG，让 store 的 logout() 兜底
        throw new Error(INVALID_TOKEN_MSG);
      }
      const errorMsg = response.data.msg;
      if (errorMsg !== INVALID_TOKEN_MSG) {
        message.error(errorMsg);
      } else {
        message.warning('未登录');
      }
      throw new Error(errorMsg);
    }
    return response.data.data;
  },
  (error) => {
    // 统一错误处理
    if (error.response?.status === 401) {
      // token过期处理，仅在客户端环境中执行
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    message.error(error.response?.data?.msg || '网络错误');
    return Promise.reject(error);
  }
);

export default api;