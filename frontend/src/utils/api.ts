import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Single axios instance used by all API calls.
// withCredentials=true is required so the browser sends the httpOnly JWT cookie.
const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

export default api;
