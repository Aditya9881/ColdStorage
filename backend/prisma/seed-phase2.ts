/**
 * Phase 2 Seed: Create farmer and buyer test users
 * Run: npx tsx prisma/seed-phase2.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Phase 2 users...');

  const passwordHash = await bcrypt.hash('farmer123', 10);
  const buyerHash = await bcrypt.hash('buyer123', 10);

  // Create Farmer user
  const farmer = await prisma.user.upsert({
    where: { phone: '9876500001' },
    update: {},
    create: {
      fullName: 'Ramesh Kumar',
      phone: '9876500001',
      email: 'ramesh@example.com',
      role: 'FARMER',
      status: 'ACTIVE',
      phoneVerified: true,
      passwordHash,
      addressLine1: 'Village Mohammadpur',
      city: 'Agra',
      state: 'Uttar Pradesh',
      pincode: '282001',
      preferredLang: 'hi',
    },
  });
  console.log(`  ✅ Farmer: ${farmer.fullName} (${farmer.phone}) — password: farmer123`);

  // Create a second farmer
  const farmer2 = await prisma.user.upsert({
    where: { phone: '9876500002' },
    update: {},
    create: {
      fullName: 'Suresh Yadav',
      phone: '9876500002',
      email: 'suresh@example.com',
      role: 'FARMER',
      status: 'ACTIVE',
      phoneVerified: true,
      passwordHash,
      addressLine1: 'Village Barsana',
      city: 'Mathura',
      state: 'Uttar Pradesh',
      pincode: '281001',
      preferredLang: 'hi',
    },
  });
  console.log(`  ✅ Farmer: ${farmer2.fullName} (${farmer2.phone}) — password: farmer123`);

  // Create Buyer user
  const buyer = await prisma.user.upsert({
    where: { phone: '9876500010' },
    update: {},
    create: {
      fullName: 'Priya Enterprises',
      phone: '9876500010',
      email: 'priya@enterprises.com',
      role: 'BUYER',
      status: 'ACTIVE',
      phoneVerified: true,
      passwordHash: buyerHash,
      addressLine1: '45 Industrial Area',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
  });
  console.log(`  ✅ Buyer: ${buyer.fullName} (${buyer.phone}) — password: buyer123`);

  // Assign some existing lots to the farmer (if any exist)
  const existingLots = await prisma.inventoryLot.findMany({ take: 3 });
  if (existingLots.length > 0) {
    let updated = 0;
    for (const lot of existingLots) {
      await prisma.inventoryLot.update({
        where: { id: lot.id },
        data: { depositorId: farmer.id },
      });
      updated++;
    }
    console.log(`  ✅ Assigned ${updated} existing lot(s) to farmer ${farmer.fullName}`);
  } else {
    console.log(`  ℹ️  No existing lots to assign. Create intake from WMS first.`);
  }

  // Create a sample facility review
  const facilities = await prisma.facility.findMany({ where: { status: 'ACTIVE' }, take: 1 });
  if (facilities.length > 0) {
    await prisma.facilityReview.upsert({
      where: { facilityId_userId: { facilityId: facilities[0].id, userId: farmer.id } },
      update: {},
      create: {
        facilityId: facilities[0].id,
        userId: farmer.id,
        rating: 4,
        comment: 'Good facility, clean chambers and fair pricing. Temperature control is excellent.',
      },
    });
    console.log(`  ✅ Created sample review for ${facilities[0].name}`);
  }

  console.log('\n🎉 Phase 2 seed complete!\n');
  console.log('Test Credentials:');
  console.log('  Farmer 1: 9876500001 / farmer123');
  console.log('  Farmer 2: 9876500002 / farmer123');
  console.log('  Buyer:    9876500010 / buyer123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
