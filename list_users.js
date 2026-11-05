const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { orders: true, conversations: true }
      }
    },
    orderBy: { role: 'desc' }
  });
  
  console.log('=== DAFTAR AKUN USER ===');
  console.log('Total:', users.length, 'akun\n');
  
  users.forEach((u, i) => {
    console.log((i+1) + '. [' + u.role + '] ' + u.name);
    console.log('    Email: ' + u.email);
    console.log('    ID: ' + u.id);
    console.log('    Dibuat: ' + u.createdAt.toLocaleString('id-ID'));
    console.log('    Pesanan: ' + u._count.orders + ' | Percakapan AI: ' + u._count.conversations);
    console.log('');
  });
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });