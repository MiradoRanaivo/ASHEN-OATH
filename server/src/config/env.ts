import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  DB_HOST: z.string().min(1).default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_USER: z.string().min(1).default("naval"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/).default("ashen_oath"),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid API environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("The API environment configuration is invalid.");
}

export const env = parsed.data;
