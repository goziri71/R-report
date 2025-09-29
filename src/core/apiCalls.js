import axios from "axios";

const axiosPublic = axios.create({
  baseURL: "https://api.proxy.account.redbiller.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// New: Validate crosslink token and return normalized response
export const validateCrosslinkToken = async ({ token }) => {
  console.log("validateCrosslinkToken");
  try {
    const response = await axiosPublic.post(
      "/api/v1/auth/login/crosslink/validate",
      { token }
    );

    // Assuming same response shape as existing login
    const result = response.data;

    console.log(result);

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
