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
    // 把浏览器的真实来源告诉后端。通行密钥要靠它决定 rpId，
    // 而 Host 头经过任何一层代理都会失真（开发代理会变成 127.0.0.1:7000）。
    config.headers['X-Client-Origin'] = window.location.origin;
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
      // 但如果本地根本没有 token（登录/二步验证/代登录这些流程中途），
      // 说明这是「凭证不对」而不是「登录过期」——此时跳转只会把人踢回登录页，
      // 并且会盖掉后端真正想说的话。
      const hasToken =
        typeof window !== 'undefined' && !!localStorage.getItem('token');
      if (response.data.code === 401 && hasToken) {
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
      // 把后端的整包数据挂在错误上：调用方要判断 needReauth / 票据是否失效，
      // 只给一个字符串就只能拿文案去 includes，迟早被改文案改坏。
      const err: any = new Error(errorMsg);
      err.code = response.data.code;
      err.data = response.data;
      err.needReauth = !!response.data.needReauth;
      throw err;
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
    const err: any = new Error(error.response?.data?.msg || '网络错误');
    err.code = error.response?.data?.code;
    err.data = error.response?.data;
    err.needReauth = !!error.response?.data?.needReauth;
    return Promise.reject(err);
  }
);

export default api;