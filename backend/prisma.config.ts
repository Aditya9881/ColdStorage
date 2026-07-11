import path from 'node:path';
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.resolve(__dirname, 'prisma/schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    async resolve() {
      return {
        url: process.env.DATABASE_URL!,
      };
    },
  },
});
