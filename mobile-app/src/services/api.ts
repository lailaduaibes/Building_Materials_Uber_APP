import axios from "axios";
import { Platform } from "react-native";

// Backend API URLs (your backend runs on port 3000)  
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? "https://yourdomain.com/api/v1"
  : __DEV__ && Platform.OS === 'android' 
    ? "http://10.0.2.2:3000/api/v1"  // Android emulator
    : __DEV__ && Platform.OS === 'ios'
      ? "http://localhost:3000/api/v1"  // iOS simulator  
      : "http://192.168.1.108:3000/api/v1"; // Physical device

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  // In a real React Native app, you'd use AsyncStorage:
  // const token = await AsyncStorage.getItem("authToken");
  // For now, we'll add token manually when testing
  const token = ""; // Replace with actual token when testing
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      console.log("Unauthorized - redirecting to login");
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post("/auth/login", { email, password });
    return response.data;
  },
  
  register: async (userData: any) => {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },
};

export const ordersAPI = {
  createOrder: async (orderData: any) => {
    const response = await apiClient.post("/orders", orderData);
    return response.data;
  },
  
  getOrders: async (params?: any) => {
    const response = await apiClient.get("/orders", { params });
    return response.data;
  },
  
  getOrderById: async (id: string) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },
  
  updateOrder: async (id: string, updateData: any) => {
    const response = await apiClient.put(`/orders/${id}`, updateData);
    return response.data;
  },
};

export const vehiclesAPI = {
  getVehicles: async () => {
    const response = await apiClient.get("/vehicles");
    return response.data;
  },
  
  getVehicleById: async (id: string) => {
    const response = await apiClient.get(`/vehicles/${id}`);
    return response.data;
  },
};

export const driversAPI = {
  getDrivers: async () => {
    const response = await apiClient.get("/drivers");
    return response.data;
  },
  
  getDriverById: async (id: string) => {
    const response = await apiClient.get(`/drivers/${id}`);
    return response.data;
  },
};

export default apiClient;
