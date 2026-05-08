import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

export const config = {
  port:     parseInt(process.env.PORT || "3001"),
  nodeEnv:  process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/trading-terminal",
  kite: {
    apiKey:      process.env.KITE_API_KEY || "",
    apiSecret:   process.env.KITE_API_SECRET || "",
    redirectUrl: process.env.KITE_REDIRECT_URL || "http://localhost:3001/api/auth/callback",
  },
  app: {
    username: process.env.APP_USERNAME || "",
    password: process.env.APP_PASSWORD || "",
  },
};
