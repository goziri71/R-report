import axios from "axios";

const axiosPublic = axios.create({
  baseURL: "https://api.proxy.account.redbiller.com",
  headers: {
    "Content-Type": "application/json",
  },
});

export const loginFromAlpha = async (payload) => {
  const response = await axiosPublic.post(
    "/api/v1/auth/login-password",
    payload,
    {
      withCredentials: true,
    }
  );
  const result = await response.data;
  return result;
};
