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
    console.log("Login Error:", err);
    if (err.response) {
      const { status, data } = err.response;
      if (
        status === 500 &&
        data?.success === false &&
        (!data.error || Object.keys(data.error).length === 0)
      ) {
        return {
          success: false,
          status: 500,
          message: "Internal Server Error",
          error: "Error",
        };
      }

      return {
        success: false,
        status: status,
        message: data?.error || data?.message || "Authentication failed",
        error: data,
      };
    }

    return {
      success: false,
      status: 500,
      message: err.message || "Network error occurred",
      error: err.message,
    };
  }
};

// New: Validate crosslink token and return normalized response
export const validateCrosslinkToken = async ({ token }) => {
  try {
    const response = await axiosPublic.post(
      "/api/v1/auth/login/crosslink/validate",
      { token }
    );

    // Assuming same response shape as existing login
    const result = response.data;

    if (result?.success === false) {
      return {
        success: false,
        status: result?.status || 401,
        message: result?.error || result?.message || "Authentication failed",
        error: result,
      };
    }

    return result;
  } catch (err) {
    if (err.response) {
      const { status, data } = err.response;
      return {
        success: false,
        status: status || 500,
        message: data?.error || data?.message || "Authentication failed",
        error: data || err.message,
      };
    }

    return {
      success: false,
      status: 500,
      message: err.message || "Network error occurred",
      error: err.message,
    };
  }
};
