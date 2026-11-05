import { PrismaClient, Role, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai seeding database IT Service Management...');

  // 1. Bersihkan data (opsional untuk fresh seed)
  await (prisma as any).inventoryItem?.deleteMany();
  await prisma.aIMessage.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.serviceOrderStatusHistory.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash default password
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // 3. Buat Akun Admin Default
  const admin = await prisma.user.create({
    data: {
      name: 'Super Admin IT',
      email: 'admin@itservice.com',
      password: hashedPassword,
      phone: '081234567890',
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin berhasil dibuat: ${admin.email}`);

  // 4. Buat Akun Customer Demo
  const [customer1, customer2, customer3, customer4, customer5] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Budi Santoso',
        email: 'customer@itservice.com',
        password: hashedPassword,
        phone: '089876543210',
        role: Role.CUSTOMER,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Siti Rahmadani',
        email: 'siti.rahma@gmail.com',
        password: hashedPassword,
        phone: '081298765432',
        role: Role.CUSTOMER,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Andi Wijaya',
        email: 'andi.wijaya@techcorp.id',
        password: hashedPassword,
        phone: '085612345678',
        role: Role.CUSTOMER,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Denny Pratama',
        email: 'denny.pratama@outlook.com',
        password: hashedPassword,
        phone: '087811223344',
        role: Role.CUSTOMER,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Maya Putri',
        email: 'maya.putri@gmail.com',
        password: hashedPassword,
        phone: '0895358051975',
        role: Role.CUSTOMER,
      },
    }),
  ]);
  console.log(`✅ 5 Akun Customer berhasil dibuat.`);

  // 5. Buat 8 Layanan Service Standar Lengkap
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: 'Service Laptop',
        description: 'Perbaikan komprehensif untuk semua merk laptop (Asus, Lenovo, Dell, HP, Acer, MacBook). Menangani layar pecah, engsel patah, keyboard rusak, baterai drop, hingga mati total.',
        price: 150000,
        estimatedDuration: '1 - 3 Hari Kerja',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Service PC',
        description: 'Diagnostik dan perbaikan PC desktop kantor & gaming. Mengatasi blue screen (BSOD), restart sendiri, no display, power supply drop, dan overhead temperatur.',
        price: 120000,
        estimatedDuration: '1 - 2 Hari Kerja',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Install Ulang',
        description: 'Instalasi bersih sistem operasi Windows 11/10 Original, Linux, atau macOS. Termasuk full update driver resmi, aktivasi keamanan, dan instalasi software produktivitas standar.',
        price: 100000,
        estimatedDuration: '2 - 4 Jam',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Upgrade RAM/SSD',
        description: 'Meningkatkan performa komputer & laptop hingga 10x lebih responsif dengan instalasi storage SSD NVMe/SATA dan penambahan kapasitas memori RAM dual-channel.',
        price: 150000,
        estimatedDuration: '1 - 2 Jam',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Pembersihan Virus',
        description: 'Deep scanning dan pembersihan malware, ransomware, spyware, adware, serta pemulihan file sistem yang terklocked tanpa kehilangan data penting Anda.',
        price: 90000,
        estimatedDuration: '2 - 5 Jam',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Perbaikan Hardware',
        description: 'Pengerjaan mikroskopis chip-level motherboard, perbaikan IC Power, penggantian charging port USB-C, reballing chipset GPU, dan rekondisi sirkuit elektronik.',
        price: 450000,
        estimatedDuration: '3 - 5 Hari Kerja',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Jaringan & WiFi',
        description: 'Pemasangan & troubleshooting jaringan kantor/rumah, setting router Mikrotik, Access Point Wi-Fi Mesh tanpa dead-zone, crimping kabel LAN Cat6, dan konfigurasi VPN/Firewall.',
        price: 250000,
        estimatedDuration: '1 Hari Kerja',
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: 'IT Support',
        description: 'Layanan konsultasi, maintenance preventif berkala, backup database terotomasi, konfigurasi server/NAS, dan kontrak SLA dukungan teknis IT untuk perkantoran & UMKM.',
        price: 350000,
        estimatedDuration: 'Fleksibel / Sesuai SLA',
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ Berhasil membuat ${services.length} layanan service standar.`);

  // 6. Buat Contoh Tiket Service Orders untuk Pelanggan
  const order1 = await prisma.serviceOrder.create({
    data: {
      ticketNumber: 'ITSM-202608-0001',
      customerId: customer1.id,
      serviceId: services[0].id,
      deviceType: 'Laptop',
      deviceBrand: 'Asus ROG Zephyrus G14',
      problemDescription: 'Laptop cepat panas saat rendering video, suhu mencapai 95 derajat Celsius dan kipas berbunyi berisik.',
      address: 'Jl. Merdeka No. 45, Jakarta Selatan',
      estimatedPrice: 150000,
      finalPrice: 150000,
      status: OrderStatus.IN_PROGRESS,
      statusHistory: {
        create: [
          { status: OrderStatus.CREATED, note: 'Order dibuat oleh customer melalui portal online.' },
          { status: OrderStatus.DEVICE_RECEIVED, note: 'Perangkat diterima di workshop oleh Teknisi Utama.' },
          { status: OrderStatus.CHECKING, note: 'Pemeriksaan suhu awal dan kondisi fan heatsink.' },
          { status: OrderStatus.IN_PROGRESS, note: 'Sedang dilakukan pembersihan heatsink dan pergantian thermal pasta Noctua.' },
        ],
      },
    },
  });

  const order2 = await prisma.serviceOrder.create({
    data: {
      ticketNumber: 'ITSM-202608-0002',
      customerId: customer2.id,
      serviceId: services[3].id,
      deviceType: 'Laptop',
      deviceBrand: 'Lenovo ThinkPad T480',
      problemDescription: 'Upgrade storage SSD NVMe 512GB dan clone seluruh sistem operasi Windows beserta file kantor.',
      address: 'Sudirman Central Business District, Jakarta',
      estimatedPrice: 150000,
      finalPrice: 700000,
      status: OrderStatus.COMPLETED,
      statusHistory: {
        create: [
          { status: OrderStatus.CREATED, note: 'Order konsultasi upgrade SSD.' },
          { status: OrderStatus.DEVICE_RECEIVED, note: 'Laptop ThinkPad diterima unit lengkap.' },
          { status: OrderStatus.IN_PROGRESS, note: 'Instalasi Kingston NV2 512GB NVMe dan migrasi OS selesai.' },
          { status: OrderStatus.COMPLETED, note: 'Pekerjaan tuntas dengan garansi 90 hari.' },
        ],
      },
    },
  });

  const order3 = await prisma.serviceOrder.create({
    data: {
      ticketNumber: 'ITSM-202608-0003',
      customerId: customer3.id,
      serviceId: services[5].id,
      deviceType: 'MacBook',
      deviceBrand: 'MacBook Pro M1 2020',
      problemDescription: 'MacBook tidak mau charging setelah tersiram tetesan kopi di port USB-C sebelah kiri.',
      address: 'Jl. Gatot Subroto Kav. 22, Jakarta',
      estimatedPrice: 450000,
      finalPrice: 650000,
      status: OrderStatus.CHECKING,
      statusHistory: {
        create: [
          { status: OrderStatus.CREATED, note: 'Pendaftaran tiket darurat via portal.' },
          { status: OrderStatus.DEVICE_RECEIVED, note: 'Unit MacBook diterima teknisi hardware.' },
          { status: OrderStatus.CHECKING, note: 'Pemeriksaan jalur VBUS dan IC Power charging port.' },
        ],
      },
    },
  });

  const order4 = await prisma.serviceOrder.create({
    data: {
      ticketNumber: 'ITSM-202608-0004',
      customerId: customer4.id,
      serviceId: services[1].id,
      deviceType: 'PC Desktop',
      deviceBrand: 'Custom Gaming Rig i7-13700K / RTX 4070',
      problemDescription: 'Sering bluescreen WHEA_UNCORRECTABLE_ERROR saat bermain game berat.',
      address: 'Kelapa Gading, Jakarta Utara',
      estimatedPrice: 120000,
      finalPrice: 120000,
      status: OrderStatus.DELIVERED,
      statusHistory: {
        create: [
          { status: OrderStatus.CREATED, note: 'Tiket servis PC dibuat.' },
          { status: OrderStatus.DEVICE_RECEIVED, note: 'Unit PC dikirim ke workshop.' },
          { status: OrderStatus.COMPLETED, note: 'Update BIOS motherboard dan tuning voltase RAM stabil.' },
          { status: OrderStatus.DELIVERED, note: 'Perangkat telah diserahkan kembali kepada pelanggan.' },
        ],
      },
    },
  });

  console.log(`✅ Berhasil membuat 4 contoh Service Order lintas pelanggan.`);

  // 7. Buat Data Stok Inventaris & Sparepart
  const inventoryItems = await Promise.all([
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-SSD-NV2-512',
        name: 'SSD NVMe Kingston NV2 512GB PCIe 4.0',
        category: 'Storage (SSD/HDD)',
        brand: 'Kingston',
        compatibility: 'Universal M.2 NVMe 2280 PCIe Gen 4x4 / Gen 3x4',
        stock: 14,
        minStock: 5,
        unit: 'Unit',
        purchasePrice: 430000,
        sellingPrice: 550000,
        location: 'Rak A-01',
        condition: 'NEW',
        notes: 'Garansi resmi distributor 3 tahun. Sangat laris untuk upgrade laptop/PC.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-SSD-870-1TB',
        name: 'SSD SATA 2.5" Samsung 870 EVO 1TB',
        category: 'Storage (SSD/HDD)',
        brand: 'Samsung',
        compatibility: 'Universal Laptop & PC SATA III 2.5 Inch',
        stock: 6,
        minStock: 4,
        unit: 'Unit',
        purchasePrice: 1100000,
        sellingPrice: 1350000,
        location: 'Rak A-02',
        condition: 'NEW',
        notes: 'Performa transfer data tinggi hingga 560MB/s.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-RAM-DDR4-8GB',
        name: 'RAM SODIMM Kingston Fury 8GB DDR4 3200MHz',
        category: 'RAM / Memori',
        brand: 'Kingston',
        compatibility: 'Laptop Intel Gen 8-12 & AMD Ryzen 3000-5000',
        stock: 3,
        minStock: 5,
        unit: 'Keping',
        purchasePrice: 270000,
        sellingPrice: 360000,
        location: 'Rak B-01',
        condition: 'NEW',
        notes: 'Stok menipis, perlu restock minggu depan.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-RAM-DDR4-16GB',
        name: 'RAM Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200MHz',
        category: 'RAM / Memori',
        brand: 'Corsair',
        compatibility: 'PC Desktop Desktop Gaming & Office Motherboard',
        stock: 8,
        minStock: 3,
        unit: 'Kit',
        purchasePrice: 580000,
        sellingPrice: 750000,
        location: 'Rak B-02',
        condition: 'NEW',
        notes: 'Dual channel kit dengan heatsink aluminium hitam.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-RAM-DDR5-16GB',
        name: 'RAM SODIMM Crucial 16GB DDR5 4800MHz',
        category: 'RAM / Memori',
        brand: 'Crucial',
        compatibility: 'Laptop Intel Gen 12+ & AMD Ryzen 6000+',
        stock: 2,
        minStock: 4,
        unit: 'Keping',
        purchasePrice: 650000,
        sellingPrice: 850000,
        location: 'Rak B-03',
        condition: 'NEW',
        notes: 'Komponen fast-moving untuk laptop gaming modern.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-THP-NOCTUA',
        name: 'Thermal Paste Noctua NT-H1 3.5g Tube',
        category: 'Thermal Paste & Cooling',
        brand: 'Noctua',
        compatibility: 'Universal CPU & GPU Desktop / Laptop',
        stock: 18,
        minStock: 6,
        unit: 'Tube',
        purchasePrice: 95000,
        sellingPrice: 145000,
        location: 'Etalase C-01',
        condition: 'NEW',
        notes: 'Pasta pendingin standar workshop untuk servis repaste.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-THP-ARCTIC',
        name: 'Thermal Paste Arctic MX-4 4g with Spatula',
        category: 'Thermal Paste & Cooling',
        brand: 'Arctic',
        compatibility: 'Universal Processor & VGA Graphics',
        stock: 0,
        minStock: 5,
        unit: 'Tube',
        purchasePrice: 80000,
        sellingPrice: 125000,
        location: 'Etalase C-02',
        condition: 'NEW',
        notes: 'Stok habis total! Sudah dipesan dari supplier.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-FAN-ROG-G14',
        name: 'Cooling Fan Asus ROG Zephyrus G14 Dual Set',
        category: 'Thermal Paste & Cooling',
        brand: 'Asus OEM',
        compatibility: 'Asus ROG Zephyrus G14 GA401 Series',
        stock: 4,
        minStock: 3,
        unit: 'Pasang',
        purchasePrice: 180000,
        sellingPrice: 280000,
        location: 'Rak C-03',
        condition: 'NEW',
        notes: 'Include fan CPU dan fan GPU 12V 1A.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-LCD-14-144',
        name: 'LCD Panel 14.0" FHD IPS 144Hz 30-Pin Slim',
        category: 'Layar & LCD Panel',
        brand: 'BOE / LG',
        compatibility: 'Laptop Slim 14 Inch Non-Touch 30-Pin EDP',
        stock: 5,
        minStock: 2,
        unit: 'Panel',
        purchasePrice: 680000,
        sellingPrice: 950000,
        location: 'Rak D-01 (Fragile)',
        condition: 'NEW',
        notes: 'Layar bening tanpa dead pixel grade A+.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-LCD-156-FHD',
        name: 'LCD Panel 15.6" FHD IPS 60Hz 30-Pin Slim',
        category: 'Layar & LCD Panel',
        brand: 'Innolux',
        compatibility: 'Laptop Standard 15.6 Inch Non-Touch',
        stock: 1,
        minStock: 3,
        unit: 'Panel',
        purchasePrice: 550000,
        sellingPrice: 780000,
        location: 'Rak D-02 (Fragile)',
        condition: 'NEW',
        notes: 'Tersisa 1 unit, batas kritis.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-IC-BQ24780S',
        name: 'IC Power Management Battery Charger BQ24780S',
        category: 'Motherboard & IC Chips',
        brand: 'Texas Instruments',
        compatibility: 'Motherboard Laptop Asus, Acer, Lenovo, HP',
        stock: 25,
        minStock: 10,
        unit: 'Pcs',
        purchasePrice: 35000,
        sellingPrice: 85000,
        location: 'Laci Komponen E-01',
        condition: 'NEW',
        notes: 'Komponen mikro untuk perbaikan laptop mati total / tidak mau charging.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-KB-TUF-F15',
        name: 'Keyboard Asus TUF Gaming FX506 / F15 RGB',
        category: 'Keyboard & Trackpad',
        brand: 'Asus OEM',
        compatibility: 'Asus TUF FX506, FA506, F15, A15 Series',
        stock: 3,
        minStock: 2,
        unit: 'Unit',
        purchasePrice: 190000,
        sellingPrice: 320000,
        location: 'Rak E-02',
        condition: 'NEW',
        notes: 'Layout US backlight RGB original.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-BAT-DELL-XPS',
        name: 'Baterai Laptop Dell XPS 13 9360 60Wh PW23Y',
        category: 'Power Supply & Baterai',
        brand: 'Dell OEM',
        compatibility: 'Dell XPS 13 9360, 9350 Series',
        stock: 2,
        minStock: 3,
        unit: 'Unit',
        purchasePrice: 420000,
        sellingPrice: 620000,
        location: 'Rak F-01',
        condition: 'NEW',
        notes: 'Grade original kapasitas penuh 60Wh.',
        isActive: true,
      },
    }),
    (prisma as any).inventoryItem.create({
      data: {
        sku: 'PRT-RJ45-CAT6',
        name: 'Konektor RJ45 Cat6 Gold Plated UTP (Isi 50 pcs)',
        category: 'Jaringan & Aksesoris',
        brand: 'Belden',
        compatibility: 'Kabel LAN UTP Cat6 / Cat5e',
        stock: 12,
        minStock: 4,
        unit: 'Box',
        purchasePrice: 65000,
        sellingPrice: 95000,
        location: 'Rak G-01',
        condition: 'NEW',
        notes: 'Untuk instalasi jaringan LAN kantor & server.',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Berhasil membuat ${inventoryItems.length} item inventaris & suku cadang sparepart.`);
  console.log('🎉 Seeding database selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
