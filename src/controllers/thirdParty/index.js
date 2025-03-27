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
  console.log(payload);
  const response = await axiosPublic.post(
    "/api/v1/auth/login-password",
    payload,
    {
      withCredentials: true,
    }
  );
  const result = await response.data;
  return res.status(200).json(result);
});
