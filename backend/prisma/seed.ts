/**
 * ColdStorage — Master Seed Script
 *
 * Creates a complete, realistic demo dataset:
 * - 1 Super Admin
 * - 3 Facility Owners with 3 facilities across 3 states
 * - 3 Staff members
 * - 5 Farmers with inventory lots
 * - 2 Buyers
 * - Marketplace listings with active orders
 * - Facility reviews
 * - Sample notifications
 *
 * Run: npm run db:seed
 */
import { PrismaClient, UserRole, UserStatus, FacilityStatus, StorageType, ChamberStatus, CommodityCategory, LotStatus, PricingModel, QualityGrade, ListingStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import 'dotenv/config';

const dbUrl = process.env.DATABASE_URL || '';
const needsSsl = dbUrl.includes('render.com') || dbUrl.includes('sslmode=require');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = 'test1234';

async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

function generateLotNumber(facilityCode: string, index: number): string {
  return `LOT-${facilityCode}-${new Date().getFullYear()}-${String(index).padStart(5, '0')}`;
}

function generateReceiptNumber(facilityCode: string, index: number): string {
  return `RCT-${facilityCode}-${new Date().getFullYear()}-${String(index).padStart(5, '0')}`;
}

async function main() {
  console.log('🌱 ColdStorage — Master Seed\n');
  console.log('━'.repeat(50));

  const pw = await hashPassword(DEFAULT_PASSWORD);

  // ════════════════════════════════════════════════
  // 1. ADMIN
  // ════════════════════════════════════════════════
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
      passwordHash: pw,
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
  });
  console.log(`✅ Admin: ${admin.fullName} (${admin.phone})`);

  // ════════════════════════════════════════════════
  // 2. FACILITY OWNERS
  // ════════════════════════════════════════════════
  const owners = [];
  const ownerData = [
    { fullName: 'Rajesh Kumar Agrawal', phone: '9876543210', email: 'rajesh@pkcold.in', city: 'Agra', state: 'Uttar Pradesh', pincode: '282001' },
    { fullName: 'Anil Mehta', phone: '9876543211', email: 'anil@shreecoldstorage.in', city: 'Indore', state: 'Madhya Pradesh', pincode: '452001' },
    { fullName: 'Sudhir Patil', phone: '9876543212', email: 'sudhir@freshcold.in', city: 'Nashik', state: 'Maharashtra', pincode: '422001' },
  ];

  for (const od of ownerData) {
    const owner = await prisma.user.upsert({
      where: { phone: od.phone },
      update: {},
      create: { ...od, phoneVerified: true, role: UserRole.OWNER, status: UserStatus.ACTIVE, passwordHash: pw, preferredLang: 'hi' },
    });
    owners.push(owner);
  }
  console.log(`✅ Owners: ${owners.length} created`);

  // ════════════════════════════════════════════════
  // 3. FACILITIES (3 across India)
  // ════════════════════════════════════════════════
  const facilityDefs = [
    {
      name: 'PK Cold Storage Pvt. Ltd.',
      regNumber: 'UP-AGR-CS-2020-001',
      code: 'PKCOLD',
      address: 'NH-2, Fatehabad Road',
      address2: 'Near Khandari Mandi',
      city: 'Agra', district: 'Agra', state: 'Uttar Pradesh', pincode: '282006',
      lat: 27.1767, lng: 78.0081,
      capacity: 11000, type: StorageType.BAG, status: FacilityStatus.ACTIVE,
      ownerId: owners[0].id, phone: '9876543210', email: 'info@pkcold.in',
      verified: true,
    },
    {
      name: 'Shree Cold Storage',
      regNumber: 'MP-IDR-CS-2022-001',
      code: 'SHREE',
      address: 'Dhar Road, Malharganj',
      city: 'Indore', district: 'Indore', state: 'Madhya Pradesh', pincode: '452002',
      lat: 22.7196, lng: 75.8577,
      capacity: 5000, type: StorageType.HYBRID, status: FacilityStatus.ACTIVE,
      ownerId: owners[1].id, phone: '9876543211',
      verified: true,
    },
    {
      name: 'Fresh Agro Cold Chain',
      regNumber: 'MH-NSK-CS-2023-001',
      code: 'FRESH',
      address: 'MIDC Area, Ambad',
      city: 'Nashik', district: 'Nashik', state: 'Maharashtra', pincode: '422010',
      lat: 20.0063, lng: 73.7890,
      capacity: 8000, type: StorageType.HYBRID, status: FacilityStatus.PENDING_REVIEW,
      ownerId: owners[2].id, phone: '9876543212',
      verified: false,
    },
  ];

  const facilities = [];
  for (const fd of facilityDefs) {
    const facility = await prisma.facility.upsert({
      where: { registrationNumber: fd.regNumber },
      update: {},
      create: {
        name: fd.name,
        registrationNumber: fd.regNumber,
        addressLine1: fd.address,
        addressLine2: fd.address2,
        city: fd.city, district: fd.district, state: fd.state, pincode: fd.pincode,
        latitude: fd.lat, longitude: fd.lng,
        totalCapacityMt: fd.capacity,
        storageType: fd.type,
        status: fd.status,
        operatingSince: fd.verified ? new Date('2020-03-15') : undefined,
        ownerId: fd.ownerId,
        contactPhone: fd.phone,
        contactEmail: fd.email,
        verifiedAt: fd.verified ? new Date() : undefined,
        verifiedBy: fd.verified ? admin.id : undefined,
      },
    });
    facilities.push({ ...facility, code: fd.code });
  }
  console.log(`✅ Facilities: ${facilities.length} (${facilities.filter(f => f.status === 'ACTIVE').length} active, ${facilities.filter(f => f.status !== 'ACTIVE').length} pending)`);

  // ════════════════════════════════════════════════
  // 4. STAFF
  // ════════════════════════════════════════════════
  const staffData = [
    { fullName: 'Suresh Yadav', phone: '9870000001', facilityId: facilities[0].id },
    { fullName: 'Mohan Lal', phone: '9870000002', facilityId: facilities[0].id },
    { fullName: 'Dinesh Sharma', phone: '9870000003', facilityId: facilities[1].id },
  ];

  const staffMembers = [];
  for (const sd of staffData) {
    const s = await prisma.user.upsert({
      where: { phone: sd.phone },
      update: {},
      create: { fullName: sd.fullName, phone: sd.phone, phoneVerified: true, role: UserRole.STAFF, status: UserStatus.ACTIVE, passwordHash: pw, facilityId: sd.facilityId, preferredLang: 'hi' },
    });
    staffMembers.push(s);
  }
  console.log(`✅ Staff: ${staffMembers.length} created`);

  // ════════════════════════════════════════════════
  // 5. CHAMBERS (4 per active facility)
  // ════════════════════════════════════════════════
  const chamberTemplates = [
    { number: 'C-01', name: 'Cold Room Alpha', capacity: 2500, commodity: CommodityCategory.POTATO, tempMin: 2, tempMax: 4, humMin: 85, humMax: 95 },
    { number: 'C-02', name: 'Cold Room Beta', capacity: 2500, commodity: CommodityCategory.POTATO, tempMin: 2, tempMax: 4, humMin: 85, humMax: 95 },
    { number: 'C-03', name: 'Cold Room Gamma', capacity: 3000, commodity: CommodityCategory.ONION, tempMin: 0, tempMax: 2, humMin: 65, humMax: 70 },
    { number: 'C-04', name: 'Multi-Purpose Delta', capacity: 3000, commodity: CommodityCategory.VEGETABLES, tempMin: 1, tempMax: 5, humMin: 80, humMax: 90 },
  ];

  const allChambers: Record<string, any[]> = {};

  for (const facility of facilities.filter(f => f.status === 'ACTIVE')) {
    allChambers[facility.id] = [];
    for (const ct of chamberTemplates) {
      const chamber = await prisma.chamber.upsert({
        where: { facilityId_chamberNumber: { facilityId: facility.id, chamberNumber: ct.number } },
        update: {},
        create: {
          facilityId: facility.id,
          chamberNumber: ct.number,
          name: ct.name,
          capacityMt: ct.capacity,
          commodityCategory: ct.commodity,
          targetTempMin: ct.tempMin, targetTempMax: ct.tempMax,
          targetHumidityMin: ct.humMin, targetHumidityMax: ct.humMax,
          status: ChamberStatus.OPERATIONAL,
          storageType: StorageType.BAG,
        },
      });
      allChambers[facility.id].push(chamber);
    }
  }
  console.log(`✅ Chambers: ${Object.values(allChambers).flat().length} across ${Object.keys(allChambers).length} facilities`);

  // ════════════════════════════════════════════════
  // 6. FARMERS (5 total)
  // ════════════════════════════════════════════════
  const farmerDefs = [
    { fullName: 'Ram Prasad Verma', phone: '9800000001', city: 'Agra', state: 'Uttar Pradesh' },
    { fullName: 'Lakshmi Devi', phone: '9800000002', city: 'Mathura', state: 'Uttar Pradesh' },
    { fullName: 'Govind Singh Patel', phone: '9800000003', city: 'Firozabad', state: 'Uttar Pradesh' },
    { fullName: 'Anita Sharma', phone: '9800000004', city: 'Indore', state: 'Madhya Pradesh' },
    { fullName: 'Sanjay Deshmukh', phone: '9800000005', city: 'Nashik', state: 'Maharashtra' },
  ];

  const farmers = [];
  for (const fd of farmerDefs) {
    const f = await prisma.user.upsert({
      where: { phone: fd.phone },
      update: {},
      create: { ...fd, phoneVerified: true, role: UserRole.FARMER, status: UserStatus.ACTIVE, passwordHash: pw, preferredLang: 'hi' },
    });
    farmers.push(f);
  }
  console.log(`✅ Farmers: ${farmers.length} created`);

  // ════════════════════════════════════════════════
  // 7. BUYERS (2)
  // ════════════════════════════════════════════════
  const buyerDefs = [
    { fullName: 'Priya Enterprises', phone: '9900000001', email: 'priya@enterprises.com', city: 'Delhi', state: 'Delhi' },
    { fullName: 'Fresh Mart Pvt Ltd', phone: '9900000002', email: 'procurement@freshmart.in', city: 'Mumbai', state: 'Maharashtra' },
  ];

  const buyers = [];
  for (const bd of buyerDefs) {
    const b = await prisma.user.upsert({
      where: { phone: bd.phone },
      update: {},
      create: { ...bd, phoneVerified: true, role: UserRole.BUYER, status: UserStatus.ACTIVE, passwordHash: pw },
    });
    buyers.push(b);
  }
  console.log(`✅ Buyers: ${buyers.length} created`);

  // ════════════════════════════════════════════════
  // 8. PRICING
  // ════════════════════════════════════════════════
  const pricingDefs = [
    { commodity: CommodityCategory.POTATO, rate: 12.50 },
    { commodity: CommodityCategory.ONION, rate: 15.00 },
    { commodity: CommodityCategory.VEGETABLES, rate: 18.00 },
    { commodity: CommodityCategory.FRUITS, rate: 20.00 },
  ];

  for (const facility of facilities.filter(f => f.status === 'ACTIVE')) {
    for (const pd of pricingDefs) {
      await prisma.facilityPricing.create({
        data: {
          facilityId: facility.id,
          commodityCategory: pd.commodity,
          rateAmount: pd.rate,
          pricingModel: PricingModel.PER_DAY_PER_MT,
          effectiveFrom: new Date('2024-01-01'),
          status: 'ACTIVE',
          adminApproved: true,
          createdById: facility.ownerId,
        },
      });
    }
  }
  console.log(`✅ Pricing: ${pricingDefs.length * 2} rates configured`);

  // ════════════════════════════════════════════════
  // 9. INVENTORY LOTS (10 lots across facilities)
  // ════════════════════════════════════════════════
  const f1Chambers = allChambers[facilities[0].id];
  const f2Chambers = allChambers[facilities[1].id];

  const lotDefs = [
    // Facility 1 — PK Cold Storage (Agra)
    { facility: facilities[0], chamber: f1Chambers[0], farmer: farmers[0], code: 'PKCOLD', idx: 1, commodity: CommodityCategory.POTATO, name: 'Kufri Jyoti', weight: 50000, bags: 500, grade: QualityGrade.A },
    { facility: facilities[0], chamber: f1Chambers[0], farmer: farmers[1], code: 'PKCOLD', idx: 2, commodity: CommodityCategory.POTATO, name: 'Kufri Bahar', weight: 30000, bags: 300, grade: QualityGrade.B },
    { facility: facilities[0], chamber: f1Chambers[1], farmer: farmers[0], code: 'PKCOLD', idx: 3, commodity: CommodityCategory.POTATO, name: 'Kufri Pukhraj', weight: 40000, bags: 400, grade: QualityGrade.A },
    { facility: facilities[0], chamber: f1Chambers[2], farmer: farmers[2], code: 'PKCOLD', idx: 4, commodity: CommodityCategory.ONION, name: 'Nasik Red', weight: 25000, bags: 250, grade: QualityGrade.A },
    { facility: facilities[0], chamber: f1Chambers[3], farmer: farmers[2], code: 'PKCOLD', idx: 5, commodity: CommodityCategory.VEGETABLES, name: 'Green Peas', weight: 10000, bags: 200, grade: QualityGrade.B },
    // Facility 2 — Shree Cold Storage (Indore)
    { facility: facilities[1], chamber: f2Chambers[0], farmer: farmers[3], code: 'SHREE', idx: 1, commodity: CommodityCategory.POTATO, name: 'Kufri Chandramukhi', weight: 35000, bags: 350, grade: QualityGrade.A },
    { facility: facilities[1], chamber: f2Chambers[1], farmer: farmers[3], code: 'SHREE', idx: 2, commodity: CommodityCategory.POTATO, name: 'Kufri Sindhuri', weight: 20000, bags: 200, grade: QualityGrade.A },
    { facility: facilities[1], chamber: f2Chambers[2], farmer: farmers[4], code: 'SHREE', idx: 3, commodity: CommodityCategory.ONION, name: 'Agrifound Light Red', weight: 15000, bags: 150, grade: QualityGrade.B },
  ];

  const lots = [];
  for (const ld of lotDefs) {
    const lotNumber = generateLotNumber(ld.code, ld.idx);
    const receiptNumber = generateReceiptNumber(ld.code, ld.idx);

    const lot = await prisma.inventoryLot.upsert({
      where: { lotNumber },
      update: {},
      create: {
        lotNumber, receiptNumber,
        facilityId: ld.facility.id,
        chamberId: ld.chamber.id,
        depositorId: ld.farmer.id,
        commodityCategory: ld.commodity,
        commodityName: ld.name,
        intakeWeightKg: ld.weight,
        currentWeightKg: ld.weight * 0.98, // 2% natural weight loss
        bagCount: ld.bags,
        qualityGrade: ld.grade,
        moistureContent: ld.commodity === CommodityCategory.POTATO ? 78.5 : 86.0,
        status: LotStatus.STORED,
        intakeDate: new Date('2024-06-01'),
        expectedRelease: new Date('2024-12-31'),
        appliedRate: ld.commodity === CommodityCategory.POTATO ? 12.50 : 15.00,
        pricingModel: PricingModel.PER_DAY_PER_MT,
        createdById: staffMembers[0].id,
      },
    });
    lots.push(lot);

    // Create intake transaction
    await prisma.inventoryTransaction.create({
      data: {
        lotId: lot.id,
        transactionType: 'INTAKE',
        weightKg: ld.weight,
        bagCount: ld.bags,
        notes: `Initial intake of ${ld.name} — Grade ${ld.grade}`,
        gatePassNumber: `GP-${ld.code}-${String(ld.idx).padStart(4, '0')}`,
        performedById: staffMembers[0].id,
      },
    });
  }

  // Update chamber occupancy
  const occupancyMap: Record<string, number> = {};
  for (const ld of lotDefs) {
    const key = ld.chamber.id;
    occupancyMap[key] = (occupancyMap[key] || 0) + (ld.weight / 1000); // kg to MT
  }
  for (const [chamberId, occupiedMt] of Object.entries(occupancyMap)) {
    await prisma.chamber.update({ where: { id: chamberId }, data: { occupiedMt } });
  }

  console.log(`✅ Lots: ${lots.length} with intake transactions`);

  // ════════════════════════════════════════════════
  // 10. MARKETPLACE LISTINGS (5 active)
  // ════════════════════════════════════════════════
  const listingDefs = [
    { lot: lots[0], farmer: farmers[0], price: 22.50, minQty: 5000 },
    { lot: lots[1], farmer: farmers[1], price: 18.00, minQty: 2000 },
    { lot: lots[3], farmer: farmers[2], price: 35.00, minQty: 1000 },
    { lot: lots[5], farmer: farmers[3], price: 20.00, minQty: 3000 },
    { lot: lots[7], farmer: farmers[4], price: 28.00, minQty: 1500 },
  ];

  const listings = [];
  for (const ld of listingDefs) {
    const listing = await prisma.marketListing.create({
      data: {
        lotId: ld.lot.id,
        sellerId: ld.farmer.id,
        askingPricePerKg: ld.price,
        minQuantityKg: ld.minQty,
        description: `Fresh produce from cold storage. Quality grade: ${ld.lot.qualityGrade}. Available for immediate pickup.`,
        status: ListingStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    listings.push(listing);
  }
  console.log(`✅ Listings: ${listings.length} active on marketplace`);

  // ════════════════════════════════════════════════
  // 11. SAMPLE ORDER (Buyer → Farmer)
  // ════════════════════════════════════════════════
  const sampleOrder = await prisma.order.create({
    data: {
      listingId: listings[0].id,
      buyerId: buyers[0].id,
      quantityKg: 10000,
      agreedPricePerKg: 22.50,
      totalAmount: 225000,
      status: 'PENDING_APPROVAL',
      otpCode: '123456', // Demo OTP — production uses bcrypt hash (column needs widening)
      otpExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  console.log(`✅ Orders: 1 sample order (PENDING_APPROVAL)`);

  // Notification for the farmer
  await prisma.notification.create({
    data: {
      userId: farmers[0].id,
      type: 'SYSTEM',
      title: 'New Purchase Order!',
      message: `${buyers[0].fullName} wants to buy 10,000 kg of Kufri Jyoti at ₹22.50/kg. Total: ₹2,25,000. Review and approve.`,
      actionUrl: `/orders/${sampleOrder.id}`,
      metadata: { orderId: sampleOrder.id },
    },
  });

  // ════════════════════════════════════════════════
  // 12. FACILITY REVIEWS
  // ════════════════════════════════════════════════
  const reviewDefs = [
    { facilityId: facilities[0].id, userId: farmers[0].id, rating: 5, comment: 'Excellent cold storage! Temperature perfectly maintained. Fair pricing and helpful staff.' },
    { facilityId: facilities[0].id, userId: farmers[1].id, rating: 4, comment: 'Good facility. Clean chambers. Slightly slow during peak season for intake.' },
    { facilityId: facilities[0].id, userId: farmers[2].id, rating: 4, comment: 'Reliable and trustworthy. Have been using for 3 seasons now.' },
    { facilityId: facilities[1].id, userId: farmers[3].id, rating: 5, comment: 'Best cold storage in Indore. Modern equipment and digital records.' },
  ];

  for (const rd of reviewDefs) {
    await prisma.facilityReview.upsert({
      where: { facilityId_userId: { facilityId: rd.facilityId, userId: rd.userId } },
      update: {},
      create: rd,
    });
  }
  console.log(`✅ Reviews: ${reviewDefs.length} facility reviews`);

  // ════════════════════════════════════════════════
  // 13. SAMPLE NOTIFICATIONS
  // ════════════════════════════════════════════════
  await prisma.notification.createMany({
    data: [
      { userId: owners[0].id, type: 'CHAMBER_CAPACITY_WARNING', title: 'Chamber C-01 at 80% capacity', message: 'Cold Room Alpha is approaching full capacity. Current occupancy: 80 MT / 2500 MT.', read: false },
      { userId: farmers[0].id, type: 'LOT_EXPIRY_WARNING', title: 'Lot expiring soon', message: 'Your lot LOT-PKCOLD-2024-00001 (Kufri Jyoti) is nearing its expected release date of Dec 31, 2024.', read: false },
      { userId: admin.id, type: 'SYSTEM', title: 'New facility registration', message: 'Fresh Agro Cold Chain (Nashik) has submitted a registration request. Review required.', read: false, actionUrl: `/facilities/${facilities[2].id}` },
    ],
  });
  console.log(`✅ Notifications: 3 sample alerts`);

  // ════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════
  console.log('\n' + '━'.repeat(50));
  console.log('✨ Database seeded successfully!\n');
  console.log('📋 Login Credentials (all passwords: test1234)');
  console.log('━'.repeat(50));
  console.log('  ROLE          PHONE         NAME');
  console.log('  ──────────    ──────────    ──────────────────');
  console.log('  Super Admin   9999999999    Platform Admin');
  console.log('  Owner         9876543210    Rajesh Kumar Agrawal');
  console.log('  Owner         9876543211    Anil Mehta');
  console.log('  Staff         9870000001    Suresh Yadav');
  console.log('  Farmer        9800000001    Ram Prasad Verma');
  console.log('  Farmer        9800000002    Lakshmi Devi');
  console.log('  Farmer        9800000003    Govind Singh Patel');
  console.log('  Farmer        9800000004    Anita Sharma');
  console.log('  Buyer         9900000001    Priya Enterprises');
  console.log('  Buyer         9900000002    Fresh Mart Pvt Ltd');
  console.log('━'.repeat(50));
  console.log(`\n  📦 ${lots.length} inventory lots across ${facilities.filter(f => f.status === 'ACTIVE').length} facilities`);
  console.log(`  🏪 ${listings.length} active marketplace listings`);
  console.log(`  📝 1 pending order (OTP: 123456)`);
  console.log(`  ⭐ ${reviewDefs.length} facility reviews`);
  console.log('');
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
