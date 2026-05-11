import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: 'https://s4b.saveful.app/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async config => {
  const token = await SecureStore.getItemAsync('accessToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Clear token on unauthorized (session expired)
      await SecureStore.deleteItemAsync('accessToken');
      
      // We can't use the hook here, but we can emit an event or handled globally
      // By clearing the token, the next session check or app restart will trigger logout
      // For immediate redirection, it's better to handle this via an observer or similar if possible
      // but clearing token ensures they won't stay logged in on refresh.
    }
    return Promise.reject(error);
  }
);

export default api;