import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional(),
  CLIENT_DIST_PATH: z.string().optional(),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Missing required environment variables:');
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}
