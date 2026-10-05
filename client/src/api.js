import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
});

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios.post(`${import.meta.env.VITE_API_URL}/api/auth/refresh`, {}, { withCredentials: true })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dg_token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const hadAccessToken = Boolean(localStorage.getItem("dg_token"));
    if (error.response?.status === 401 && hadAccessToken && !original._retried && !String(original.url || "").includes("/auth/refresh")) {
      original._retried = true;
      try {
        const response = await refreshAccessToken();
        localStorage.setItem("dg_token", response.data.token);
        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${response.data.token}` };
        return api(original);
      } catch { /* fall through to sign-out */ }
    }
    if (error.response?.status === 401) {
      localStorage.removeItem("dg_token");
      if (!window.location.pathname.includes("login")) window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
export { refreshAccessToken };
