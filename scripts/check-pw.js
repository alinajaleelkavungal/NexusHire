const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const crypto = require('crypto');
const util = require('util');
const scrypt = util.promisify(crypto.scrypt);

async function check() {
  const row = (await p.$queryRawUnsafe('SELECT passwordHash FROM Account WHERE loginId = ?', 'admin'))[0];
  const [saltHex, hashHex] = row.passwordHash.split(':');
  for (const pw of ['admin', 'admin123', 'admin1234', 'password', 'password123', 'admin@123', 'admin2026', '12345678', 'admin12345', 'resumeiq', 'resumeiq123']) {
    const actual = await scrypt(pw, Buffer.from(saltHex, 'hex'), 64);
    if (crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), actual)) {
      console.log('Admin password is:', pw);
      return;
    }
  }
  console.log('Password not in quick list');
}
check().finally(() => p.$disconnect());
