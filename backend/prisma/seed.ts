import { PrismaClient, UserRole, UserStatus, FacilityStatus, StorageType, ChamberStatus, CommodityCategory, LotStatus, PricingModel, InvoiceStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── 1. Create Admin User ──────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: {},
    create: {
      fullName: 'Platform Admin',
      email: 'admin@coldstorage.in',
      phone: '9999999999',
      phoneVerified: true,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: adminPassword,
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      preferredLang: 'en',
    },
  });
  console.log(`✅ Admin: ${admin.fullName} (${admin.phone})`);

  // ── 2. Create Facility Owner ──────────────────────
  const ownerPassword = await bcrypt.hash('owner123', 12);
  const owner = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      fullName: 'Rajesh Kumar Agrawal',
      email: 'rajesh@pkcold.in',
      phone: '9876543210',
      phoneVerified: true,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      passwordHash: ownerPassword,
      city: 'Agra',
      state: 'Uttar Pradesh',
      pincode: '282001',
      preferredLang: 'hi',
    },
  });
  console.log(`✅ Owner: ${owner.fullName} (${owner.phone})`);

  // ── 3. Create Facility ────────────────────────────
  const facility = await prisma.facility.upsert({
    where: { registrationNumber: 'UP-AGR-CS-2020-001' },
    update: {},
    create: {
      name: 'PK Cold Storage Pvt. Ltd.',
      registrationNumber: 'UP-AGR-CS-2020-001',
      addressLine1: 'NH-2, Fatehabad Road',
      addressLine2: 'Near Khandari Mandi',
      city: 'Agra',
      district: 'Agra',
      state: 'Uttar Pradesh',
      pincode: '282006',
      latitude: 27.1767,
      longitude: 78.0081,
      totalCapacityMt: 11000,
      storageType: StorageType.BAG,
      status: FacilityStatus.ACTIVE,
      operatingSince: new Date('2020-03-15'),
      ownerId: owner.id,
      contactPhone: '9876543210',
      contactEmail: 'info@pkcold.in',
      verifiedAt: new Date(),
      verifiedBy: admin.id,
      verificationNotes: 'All documents verified. FSSAI and fire safety certificates valid.',
    },
  });
  console.log(`✅ Facility: ${facility.name} (${facility.totalCapacityMt} MT)`);

  // ── 4. Create Staff Members ───────────────────────
  const staffPassword = await bcrypt.hash('staff123', 12);
  const staff = await prisma.user.upsert({
    where: { phone: '9876500001' },
    update: {},
    create: {
      fullName: 'Suresh Yadav',
      phone: '9876500001',
      phoneVerified: true,
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      passwordHash: staffPassword,
      facilityId: facility.id,
      city: 'Agra',
      state: 'Uttar Pradesh',
      preferredLang: 'hi',
    },
  });
  console.log(`✅ Staff: ${staff.fullName} (${staff.phone})`);

  // ── 5. Create Chambers ────────────────────────────
  const chamberData = [
    { chamberNumber: 'C-01', name: 'Cold Room Alpha', capacityMt: 2500, commodityCategory: CommodityCategory.POTATO, targetTempMin: 2, targetTempMax: 4, targetHumidityMin: 85, targetHumidityMax: 95 },
    { chamberNumber: 'C-02', name: 'Cold Room Beta', capacityMt: 2500, commodityCategory: CommodityCategory.POTATO, targetTempMin: 2, targetTempMax: 4, targetHumidityMin: 85, targetHumidityMax: 95 },
    { chamberNumber: 'C-03', name: 'Cold Room Gamma', capacityMt: 3000, commodityCategory: CommodityCategory.ONION, targetTempMin: 0, targetTempMax: 2, targetHumidityMin: 65, targetHumidityMax: 70 },
    { chamberNumber: 'C-04', name: 'Multi-Purpose Delta', capacityMt: 3000, commodityCategory: CommodityCategory.VEGETABLES, targetTempMin: 1, targetTempMax: 5, targetHumidityMin: 80, targetHumidityMax: 90 },
  ];

  const chambers = [];
  for (const cd of chamberData) {
    const chamber = await prisma.chamber.upsert({
      where: { facilityId_chamberNumber: { facilityId: facility.id, chamberNumber: cd.chamberNumber } },
      update: {},
      create: {
        facilityId: facility.id,
        ...cd,
        status: ChamberStatus.OPERATIONAL,
        storageType: StorageType.BAG,
      },
    });
    chambers.push(chamber);
  }
  console.log(`✅ Chambers: ${chambers.length} created`);

  // ── 6. Create Farmer Users ────────────────────────
  const farmerPassword = await bcrypt.hash('farmer123', 12);
  const farmerData = [
    { fullName: 'Ram Prasad Verma', phone: '9800000001', city: 'Agra', state: 'Uttar Pradesh' },
    { fullName: 'Lakshmi Devi', phone: '9800000002', city: 'Mathura', state: 'Uttar Pradesh' },
    { fullName: 'Govind Singh Patel', phone: '9800000003', city: 'Firozabad', state: 'Uttar Pradesh' },
  ];

  const farmers = [];
  for (const fd of farmerData) {
    const farmer = await prisma.user.upsert({
      where: { phone: fd.phone },
      update: {},
      create: {
        ...fd,
        phoneVerified: true,
        role: UserRole.FARMER,
        status: UserStatus.ACTIVE,
        passwordHash: farmerPassword,
        preferredLang: 'hi',
      },
    });
    farmers.push(farmer);
  }
  console.log(`✅ Farmers: ${farmers.length} created`);

  // ── 7. Create Pricing ─────────────────────────────
  const pricingData = [
    { commodityCategory: CommodityCategory.POTATO, rateAmount: 12.50, pricingModel: PricingModel.PER_DAY_PER_MT },
    { commodityCategory: CommodityCategory.ONION, rateAmount: 15.00, pricingModel: PricingModel.PER_DAY_PER_MT },
    { commodityCategory: CommodityCategory.VEGETABLES, rateAmount: 18.00, pricingModel: PricingModel.PER_DAY_PER_MT },
  ];

  for (const pd of pricingData) {
    await prisma.facilityPricing.create({
      data: {
        facilityId: facility.id,
        ...pd,
        effectiveFrom: new Date('2024-01-01'),
        status: 'ACTIVE',
        adminApproved: true,
        createdById: owner.id,
      },
    });
  }
  console.log(`✅ Pricing: ${pricingData.length} rates configured`);

  // ── 8. Create Inventory Lots ──────────────────────
  const lotData = [
    {
      lotNumber: 'LOT-PKCOLD-2024-00001',
      receiptNumber: 'RCT-PKCOLD-2024-00001',
      chamberId: chambers[0].id,
      depositorId: farmers[0].id,
      commodityCategory: CommodityCategory.POTATO,
      commodityName: 'Kufri Jyoti',
      intakeWeightKg: 50000,
      bagCount: 500,
      qualityGrade: 'A',
      status: LotStatus.STORED,
    },
    {
      lotNumber: 'LOT-PKCOLD-2024-00002',
      receiptNumber: 'RCT-PKCOLD-2024-00002',
      chamberId: chambers[0].id,
      depositorId: farmers[1].id,
      commodityCategory: CommodityCategory.POTATO,
      commodityName: 'Kufri Bahar',
      intakeWeightKg: 30000,
      bagCount: 300,
      qualityGrade: 'B',
      status: LotStatus.STORED,
    },
    {
      lotNumber: 'LOT-PKCOLD-2024-00003',
      receiptNumber: 'RCT-PKCOLD-2024-00003',
      chamberId: chambers[2].id,
      depositorId: farmers[2].id,
      commodityCategory: CommodityCategory.ONION,
      commodityName: 'Nasik Red',
      intakeWeightKg: 25000,
      bagCount: 250,
      qualityGrade: 'A',
      status: LotStatus.STORED,
    },
  ];

  for (const ld of lotData) {
    await prisma.inventoryLot.upsert({
      where: { lotNumber: ld.lotNumber },
      update: {},
      create: {
        ...ld,
        facilityId: facility.id,
        currentWeightKg: ld.intakeWeightKg,
        intakeDate: new Date('2024-06-01'),
        appliedRate: ld.commodityCategory === CommodityCategory.POTATO ? 12.50 : 15.00,
        pricingModel: PricingModel.PER_DAY_PER_MT,
        createdById: staff.id,
      },
    });

    // Create intake transaction
    await prisma.inventoryTransaction.create({
      data: {
        lotId: (await prisma.inventoryLot.findUnique({ where: { lotNumber: ld.lotNumber } }))!.id,
        transactionType: 'INTAKE',
        weightKg: ld.intakeWeightKg,
        bagCount: ld.bagCount,
        notes: `Initial intake of ${ld.commodityName}`,
        performedById: staff.id,
      },
    });
  }

  // Update chamber occupancy
  await prisma.chamber.update({
    where: { id: chambers[0].id },
    data: { occupiedMt: 80 }, // 50 + 30 MT
  });
  await prisma.chamber.update({
    where: { id: chambers[2].id },
    data: { occupiedMt: 25 },
  });

  console.log(`✅ Lots: ${lotData.length} created with transactions`);

  // ── 9. Create a Second Facility (different state) ──
  const owner2Password = await bcrypt.hash('owner123', 12);
  const owner2 = await prisma.user.upsert({
    where: { phone: '9876543211' },
    update: {},
    create: {
      fullName: 'Anil Mehta',
      email: 'anil@shreecoldstorage.in',
      phone: '9876543211',
      phoneVerified: true,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      passwordHash: owner2Password,
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
    },
  });

  await prisma.facility.upsert({
    where: { registrationNumber: 'MP-IDR-CS-2022-001' },
    update: {},
    create: {
      name: 'Shree Cold Storage',
      registrationNumber: 'MP-IDR-CS-2022-001',
      addressLine1: 'Dhar Road, Malharganj',
      city: 'Indore',
      district: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452002',
      latitude: 22.7196,
      longitude: 75.8577,
      totalCapacityMt: 5000,
      storageType: StorageType.HYBRID,
      status: FacilityStatus.PENDING_REVIEW,
      ownerId: owner2.id,
      contactPhone: '9876543211',
    },
  });
  console.log(`✅ Second facility (pending review) created`);

  console.log('\n✨ Database seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('  Admin:  9999999999 / admin123');
  console.log('  Owner:  9876543210 / owner123');
  console.log('  Staff:  9876500001 / staff123');
  console.log('  Farmer: 9800000001 / farmer123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
