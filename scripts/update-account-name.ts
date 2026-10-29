/**
 * Update the display name of an account without changing its password.
 *
 *   npm run update-name -- <loginId> "<New Display Name>"
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

async function main() {
  const [loginId, newName] = process.argv.slice(2)
  const targetLoginId = (loginId || 'admin').trim()
  const targetName = (newName || 'Admin').trim()

  const prisma = (await import('../lib/prisma')).default
  const rows = await prisma.$executeRawUnsafe(
    `UPDATE Account SET name = ? WHERE loginId = ? COLLATE NOCASE`,
    targetName,
    targetLoginId
  )
  console.log(`Updated account "${targetLoginId}" display name to "${targetName}" (rows updated: ${rows})`)
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
