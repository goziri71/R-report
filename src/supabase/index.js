import dotenv from "dotenv";
dotenv.config();
const supaBaseKey = process.env.SUPABASEKEY;
const storageUrl = process.env.STORAGEURL;

import { StorageClient } from "@supabase/storage-js";
const STORAGE_URL = storageUrl;
const SERVICE_KEY = supaBaseKey;

const storageClient = new StorageClient(STORAGE_URL, {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
});

export default storageClient;
