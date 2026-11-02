import { PrismaClient } from '@prisma/client'
import { createClient } from '@libsql/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const prismaClientSingleton = () => {
  const clean = (val?: string) => (val ? val.trim().replace(/^["']|["']$/g, '').replace(/[\r\n\t]/g, '') : '')
  const rawDbUrl = clean(process.env.DATABASE_URL)
  const tursoUrl = clean(process.env.TURSO_DATABASE_URL) || (rawDbUrl.startsWith('libsql') ? rawDbUrl : '')
  const tursoAuthToken = clean(process.env.TURSO_AUTH_TOKEN) || clean(process.env.DATABASE_AUTH_TOKEN) || clean(process.env.TURSO_TOKEN)

  if (tursoUrl && tursoAuthToken) {
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  // Warn if in production without Turso credentials
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    console.error('[Prisma] WARNING: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are missing in production. Falling back to local SQLite.');
  }

  // Fallback to local SQLite file for development
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma
