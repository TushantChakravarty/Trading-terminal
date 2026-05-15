import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

export const config = {
  port:      parseInt(process.env.PORT || "3001"),
  nodeEnv:   process.env.NODE_ENV || "development",
  mongoUri:  process.env.MONGODB_URI || "mongodb://localhost:27017/trading-terminal",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  kite: {
    apiKey:      process.env.KITE_API_KEY || "",
    apiSecret:   process.env.KITE_API_SECRET || "",
    redirectUrl: process.env.KITE_REDIRECT_URL || "http://localhost:3001/api/auth/callback",
  },
  app: {
    username: process.env.APP_USERNAME || "",
    password: process.env.APP_PASSWORD || "",
  },
  newsApiKey: process.env.NEWS_API_KEY || "",
  hfApiKey:   process.env.HF_API_KEY   || "",
  hfModel:    process.env.HF_MODEL     || "tiiuae/falcon-7b-instruct",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel:  process.env.GROQ_MODEL   || "llama-3.3-70b-versatile",
};
