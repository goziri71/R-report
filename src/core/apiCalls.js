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
    if (result.data.success === false) {
      return res.status(401).json({
        error: response.error,
        message: "invalid password or wrong password",
      });
    }
    if (response.data.error === "Password cannot be empty") {
      return res.status(422).json(response.error);
    }

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
