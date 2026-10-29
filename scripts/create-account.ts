/**
 * Create an account, or reset its password if the login ID already exists.
 *
 *   npm run account -- <loginId> "<Display Name>" <ADMIN|BRANCH> <password>
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

async function main() {
  const [loginId, name, role, password] = process.argv.slice(2)
  if (!loginId || !name || !password || (role !== 'ADMIN' && role !== 'BRANCH')) {
    console.error('Usage: npm run account -- <loginId> "<Display Name>" <ADMIN|BRANCH> <password>')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters')
    process.exit(1)
  }

  const { createAccount, findAccountByLoginId, setAccountPassword } = await import('../lib/auth')
  const existing = await findAccountByLoginId(loginId)
  if (existing) {
    const prisma = (await import('../lib/prisma')).default
    await prisma.$executeRawUnsafe(`UPDATE Account SET name = ? WHERE id = ?`, name.trim(), existing.id)
    await setAccountPassword(existing.id, password)
    console.log(`Updated account "${existing.loginId}" (name: "${name.trim()}", role: ${existing.role})`)
  } else {
    await createAccount({ loginId, name, role, password })
    console.log(`Created ${role} account "${loginId}" (${name})`)
  }
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
