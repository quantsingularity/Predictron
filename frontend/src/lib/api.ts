import axios from "axios";

/// withCredentials means the browser attaches the httpOnly session cookie
/// to every request to the backend automatically, and stores whatever
/// Set-Cookie the backend sends back (on login) or clears (on logout).
/// There is no token anywhere in this file, or anywhere in frontend code —
/// the session lives entirely in a cookie that JavaScript cannot read.
export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL as string,
  withCredentials: true,
});
