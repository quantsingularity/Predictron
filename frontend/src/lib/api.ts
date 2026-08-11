import axios from "axios";

/// withCredentials sends the httpOnly session cookie automatically.
/// No token is ever read or stored in frontend code.
export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL as string,
  withCredentials: true,
});
