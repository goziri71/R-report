import axios from "axios";
import { TryCatchFunction } from "../../utils/tryCatch/index.js";

const axiosPublic = axios.create({
  baseURL: "https://api.proxy.account.redbiller.com",
  headers: {
    "Content-Type": "application/json",
  },
});

export const ThirdPartyendpoint = TryCatchFunction(async (req, res) => {
  const payload = req.body;
  const response = await axiosPublic.post(
    "/api/v1/auth/login-password",
    payload,
    {
      withCredentials: true,
    }
  );
  const result = await response.data;

  if (response.success === false) {
    return res.status(401).json({ error: response.error });
  }
  if (response.error === "Password cannot be empty") {
    return res.status(422).json({ error: response.error });
  }
  return res.status(result.status).json(result.data);
});
