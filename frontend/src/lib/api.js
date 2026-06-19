import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("verdant_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("verdant_token");
      localStorage.removeItem("verdant_user");
    }
    return Promise.reject(err);
  }
);

export const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Neurology",
  "General Practice",
  "Orthopedics",
];
