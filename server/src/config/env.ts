import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().url().default("postgresql://postgres:postgres@localhost:5432/ashen_oath"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid API environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("The API environment configuration is invalid.");
}

export const env = parsed.data;
