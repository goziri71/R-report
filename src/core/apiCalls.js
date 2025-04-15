import axios from "axios";

const axiosPublic = axios.create({
  baseURL: "https://api.proxy.account.redbiller.com",
  headers: {
    "Content-Type": "application/json",
  },
});

export const loginFromAlpha = async (payload) => {
  try {
    const response = await axiosPublic.post(
      "/api/v1/auth/login-password",
      payload
    );
    if (response.data.success === false) {
      return {
        success: false,
        status: 401,
        message: response.data.error,
      };
    }
    const result = response.data;
    return result;
  } catch (err) {
    console.log(err);
    return {
      status: false,
      message: err.message || "Authentication failed",
      error: err.response?.data || err,
    };
  }
};
