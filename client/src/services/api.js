import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true
});

let isRefreshing = false;
let refreshSubscribers = [];

const flushSubscribers = (error = null) => {
  refreshSubscribers.forEach((callback) => callback(error));
  refreshSubscribers = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const requestUrl = String(originalRequest.url || "");
    const isAuthEndpoint = requestUrl.startsWith("/auth/");

    if (status !== 401 || originalRequest._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshSubscribers.push((refreshError) => {
          if (refreshError) {
            reject(refreshError);
            return;
          }
          originalRequest._retry = true;
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await api.post("/auth/refresh");
      flushSubscribers();
      return api(originalRequest);
    } catch (refreshError) {
      flushSubscribers(refreshError);
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
