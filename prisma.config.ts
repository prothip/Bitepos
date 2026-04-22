import { defineConfig } from 'prisma/config'
import path from 'path'

export default defineConfig({
  datasource: {
    url: 'file:./dev.db',
  },
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: 'prisma/migrations',
  },
})