import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_UPLOAD_DIR: z.string().default("./uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  EMAIL_PROVIDER: z.enum(["mock", "smtp", "sendgrid", "ses", "graph"]).default("mock"),
  EMAIL_FROM: z.string().default("HelpDesk Pro <helpdesk@example.com>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SENDGRID_API_KEY: z.string().optional(),
  SES_REGION: z.string().optional(),
  SES_ACCESS_KEY_ID: z.string().optional(),
  SES_SECRET_ACCESS_KEY: z.string().optional(),
  GRAPH_TENANT_ID: z.string().optional(),
  GRAPH_CLIENT_ID: z.string().optional(),
  GRAPH_CLIENT_SECRET: z.string().optional(),
  GRAPH_SENDER_UPN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check your .env file against .env.example.");
}

export const env = parsed.data;
