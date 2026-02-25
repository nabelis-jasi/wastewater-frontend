import axios from "axios";

// Use a Vite environment variable for the API endpoint when available.
// When both apps are deployed to Render you can set VITE_API_URL to the
// backend URL, otherwise the hard‑coded Render address is used by default.
// During local development you still get localhost:8000 if no env var is set.
const BASE_URL = import.meta.env.VITE_API_URL || "https://wastewater-backend.onrender.com";

export const loginUser = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const response = await axios.post(`${BASE_URL}/token`, formData);
  return response.data; // { access_token, token_type }
};

export const getManholes = async (token) => {
  const response = await axios.get(`${BASE_URL}/manholes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getPipes = async (token) => {
  const response = await axios.get(`${BASE_URL}/pipes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateManhole = async (token, asset_id, data) => {
  const response = await axios.put(`${BASE_URL}/manholes/${asset_id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getFavorites = async (token, user_id) => {
  const response = await axios.get(`${BASE_URL}/favorites/${user_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const addFavorite = async (token, user_id, asset_type, asset_id) => {
  const response = await axios.post(
    `${BASE_URL}/favorites`,
    { user_id, asset_type, asset_id },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
};

export const dashboardStats = async (token) => {
  const response = await axios.get(`${BASE_URL}/dashboard/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};