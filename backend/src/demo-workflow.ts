/**
 * ColdStorage Ecosystem — Complete End-to-End Workflow Demonstration Script
 * 
 * This script simulates the complete, real-world lifecycle of the agricultural supply chain
 * within our cold storage ecosystem. It demonstrates step-by-step how admins, facility owners,
 * staff, farmers, and institutional buyers interact dynamically via our database schemas.
 * 
 * Flow Outline:
 * 1. Targeted Database Cleanup (Safe, deletes only DEMO-prefixed records)
 * 2. Onboard & Verify Users (Super Admin, Facility Owner, Staff)
 * 3. Onboard & Verify Facility (PK Hitech Cold Storage)
 * 4. Create Cooling Chambers & Register IoT Devices (DHT22 Sensor MQTT Mapping)
 * 5. Onboard Farmer & Verify KYC Documents (Aadhaar & PAN approval)
 * 6. Record Inventory Lot Deposit & Issue Warehouse Receipt
 * 7. Generate WDRA-aligned eNWR (Electronic Negotiable Warehouse Receipt)
 * 8. Pledge eNWR for Harvest Loan (Financing from State Bank of India)
 * 9. Create Marketplace Sale Listing (Farmer lists lot for buyers)
 * 10. Register Institutional Buyer & Place Order (Haldiram Foods procures Kufri Jyoti)
 * 11. Escrow Payment Hold (Buyer pays, funds held in Escrow transaction)
 * 12. Simulate IoT Chamber Environmental Monitoring (MQTT Temperature streams)
 * 13. Dispatch Order & Validate OTP Release (Securing the release, bypassing Travel Tax)
 * 14. Final Settlement & Payout Distribution (Clear loan, pay rent, payout farmer)
 * 15. View System Audit Trails (Immutable ledger proof)
 * 
 * Run: npx tsx src/demo-workflow.ts
 */

import { prisma } from './config/database';
import { 
  UserRole, 
  UserStatus, 
  FacilityStatus, 
  StorageType, 
  ChamberStatus, 
  CommodityCategory, 
  LotStatus, 
  PricingModel, 
  QualityGrade, 
  ListingStatus, 
  OrderStatus 
} from '@prisma/client';
import bcrypt from 'bcryptjs';

// ANSI styling colors for premium CLI look
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const WHITE = '\x1b[37m';

function printHeader(title: string) {
  console.log('\n' + BOLD + MAGENTA + '━'.repeat(80) + RESET);
  console.log(BOLD + MAGENTA + ` 🚀 ${title.toUpperCase()}` + RESET);
  console.log(BOLD + MAGENTA + '━'.repeat(80) + RESET);
}

function printStep(num: number, desc: string) {
  console.log('\n' + BOLD + CYAN + `▶ STEP ${num}: ${desc}` + RESET);
}

function printSuccess(msg: string) {
  console.log(GREEN + `  ✔ [SUCCESS] ${msg}` + RESET);
}

function printInfo(msg: string) {
  console.log(WHITE + `  ℹ [INFO] ${msg}` + RESET);
}

function printData(label: string, obj: any) {
  console.log(YELLOW + `  ⤷ ${label}: ` + RESET + JSON.stringify(obj, null, 2).replace(/\n/g, '\n    '));
}

async function runDemo() {
  printHeader('COLDSTORAGE ECOSYSTEM — COMPLETE E2E WORKFLOW DEMO');
  printInfo('Connecting to PostgreSQL database and starting demonstration...');

  const pwHash = await bcrypt.hash('password123', 10);
  const demoPrefix = 'DEMO_';

  // =========================================================================
  // 1. TARGETED DATABASE CLEANUP
  // =========================================================================
  printStep(1, 'Targeted Database Cleanup');
  printInfo('Removing any previous DEMO-prefixed entries to ensure a clean run...');

  // Order of deletion matters due to Foreign Keys
  const demoUsers = await prisma.user.findMany({
    where: { phone: { startsWith: '999900' } }
  });
  const demoUserIds = demoUsers.map(u => u.id);

  if (demoUserIds.length > 0) {
    // 1. Escrow
    await prisma.escrowTransaction.deleteMany({
      where: { order: { buyerId: { in: demoUserIds } } }
    });
    // 2. Orders
    await prisma.order.deleteMany({
      where: { buyerId: { in: demoUserIds } }
    });
    // 3. Listings
    await prisma.marketListing.deleteMany({
      where: { sellerId: { in: demoUserIds } }
    });
    // 4. Warehouse Receipts
    await prisma.warehouseReceipt.deleteMany({
      where: { lot: { depositorId: { in: demoUserIds } } }
    });
    // 5. Inventory Transactions
    await prisma.inventoryTransaction.deleteMany({
      where: { lot: { depositorId: { in: demoUserIds } } }
    });
    // 6. Invoices & Payments
    await prisma.payment.deleteMany({
      where: { invoice: { depositorId: { in: demoUserIds } } }
    });
    await prisma.invoiceLineItem.deleteMany({
      where: { invoice: { depositorId: { in: demoUserIds } } }
    });
    await prisma.invoice.deleteMany({
      where: { depositorId: { in: demoUserIds } }
    });
    // 7. Inventory Lots
    await prisma.inventoryLot.deleteMany({
      where: { depositorId: { in: demoUserIds } }
    });
    // 8. IoT & Temperature Readings
    await prisma.temperatureReading.deleteMany({
      where: { chamber: { facility: { name: { startsWith: 'DEMO_' } } } }
    });
    await prisma.ioTDevice.deleteMany({
      where: { facility: { name: { startsWith: 'DEMO_' } } }
    });
    // 9. Pricing & Documents & Chambers & Reviews
    await prisma.facilityPricing.deleteMany({
      where: { facility: { name: { startsWith: 'DEMO_' } } }
    });
    await prisma.facilityDocument.deleteMany({
      where: { facility: { name: { startsWith: 'DEMO_' } } }
    });
    await prisma.facilityReview.deleteMany({
      where: { facility: { name: { startsWith: 'DEMO_' } } }
    });
    await prisma.chamber.deleteMany({
      where: { facility: { name: { startsWith: 'DEMO_' } } }
    });
    // 10. Facilities
    await prisma.facility.deleteMany({
      where: { name: { startsWith: 'DEMO_' } }
    });
    // 11. User documents, sessions, notifications, audit logs
    await prisma.userDocument.deleteMany({
      where: { userId: { in: demoUserIds } }
    });
    await prisma.userSession.deleteMany({
      where: { userId: { in: demoUserIds } }
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: demoUserIds } }
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: demoUserIds } }
    });
    // 12. Users
    await prisma.user.deleteMany({
      where: { id: { in: demoUserIds } }
    });
    printSuccess(`Cleaned up ${demoUsers.length} previous demo users and related records.`);
  } else {
    printInfo('No existing demo data found. Proceeding directly.');
  }

  // =========================================================================
  // 2. ONBOARD & VERIFY ADMIN, OWNER & STAFF
  // =========================================================================
  printStep(2, 'Onboard & Verify Governance/Operational Stakeholders');
  
  // Create Super Admin
  const admin = await prisma.user.create({
    data: {
      fullName: 'DEMO - Platform Administrator',
      email: 'admin.demo@coldstorage.in',
      phone: '9999000001',
      phoneVerified: true,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: pwHash,
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
      aadhaarNumber: '999999990001',
      aadhaarVerified: true,
      kycVerified: true,
    }
  });
  printSuccess(`Created Platform Administrator: ${admin.fullName}`);

  // Create Facility Owner
  const owner = await prisma.user.create({
    data: {
      fullName: 'DEMO - Rajesh Agrawal',
      email: 'owner.demo@pkcold.in',
      phone: '9999000002',
      phoneVerified: true,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      passwordHash: pwHash,
      city: 'Agra',
      state: 'Uttar Pradesh',
      pincode: '282001',
      aadhaarNumber: '999999990002',
      aadhaarVerified: true,
      kycVerified: true,
    }
  });
  printSuccess(`Created Facility Owner: ${owner.fullName}`);

  // Create WMS Staff
  const staff = await prisma.user.create({
    data: {
      fullName: 'DEMO - Staff Amit Singh',
      email: 'staff.demo@pkcold.in',
      phone: '9999000003',
      phoneVerified: true,
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      passwordHash: pwHash,
      city: 'Agra',
      state: 'Uttar Pradesh',
      pincode: '282002',
      aadhaarNumber: '999999990003',
      aadhaarVerified: true,
      kycVerified: true,
    }
  });
  printSuccess(`Created Warehouse Staff Member: ${staff.fullName}`);

  // =========================================================================
  // 3. ONBOARD & VERIFY FACILITY
  // =========================================================================
  printStep(3, 'Onboard & Verify Facility');

  // Owner submits facility details
  const facility = await prisma.facility.create({
    data: {
      name: 'DEMO_PK Hitech Cold Storage',
      registrationNumber: 'REG-DEMO-2026-9881',
      addressLine1: 'NH-2, Bypass Crossing',
      city: 'Agra',
      district: 'Agra',
      state: 'Uttar Pradesh',
      pincode: '282006',
      totalCapacityMt: 15000,
      storageType: StorageType.BAG,
      status: FacilityStatus.PENDING_REVIEW,
      ownerId: owner.id,
      contactPhone: '9876599999',
      contactEmail: 'contact@pkcolddemo.in'
    }
  });
  printInfo(`Facility submitted by Rajesh Agrawal: ${facility.name} (PENDING_REVIEW)`);

  // Admin reviews documents & approves facility
  const verifiedFacility = await prisma.facility.update({
    where: { id: facility.id },
    data: {
      status: FacilityStatus.ACTIVE,
      verifiedAt: new Date(),
      verifiedBy: admin.id,
      verificationNotes: 'On-site verification completed successfully. All fire safety and horticulture licenses are valid.'
    }
  });
  printSuccess(`Facility verified & activated by Administrator: Status = ${verifiedFacility.status}`);

  // Update staff member's assigned facility
  await prisma.user.update({
    where: { id: staff.id },
    data: { facilityId: verifiedFacility.id }
  });
  printInfo(`Assigned staff member ${staff.fullName} to WMS facility ${verifiedFacility.name}`);

  // =========================================================================
  // 4. CREATE COOLING CHAMBERS & REGISTER IOT DEVICES
  // =========================================================================
  printStep(4, 'Create Chambers & Connect IoT Telemetry Devices');

  // Create a chamber for Potatoes
  const chamber = await prisma.chamber.create({
    data: {
      facilityId: verifiedFacility.id,
      chamberNumber: 'CH-DEMO-01',
      name: 'Potato Processing Storage Chamber A',
      capacityMt: 3000,
      targetTempMin: 3.0,
      targetTempMax: 4.5,
      targetHumidityMin: 90.0,
      targetHumidityMax: 95.0,
      commodityCategory: CommodityCategory.POTATO,
      storageType: StorageType.BAG,
      status: ChamberStatus.OPERATIONAL,
    }
  });
  printSuccess(`Cooling Chamber created: ${chamber.chamberNumber} (${chamber.name})`);

  // Register IoT Temperature & Humidity Sensor mapping
  const iotDevice = await prisma.ioTDevice.create({
    data: {
      facilityId: verifiedFacility.id,
      chamberId: chamber.id,
      deviceId: 'ESP32-MAC-DEMO-01',
      deviceType: 'ESP32 + DHT22',
      mqttTopic: `coldstorage/${verifiedFacility.id}/${chamber.id}/telemetry`,
      isActive: true,
      lastHeartbeat: new Date(),
      firmwareVersion: 'v2.1.4-demo',
      description: 'Chamber A Central Temperature Logger'
    }
  });
  printSuccess(`IoT Device registered: Device ID = ${iotDevice.deviceId}, Topic = ${iotDevice.mqttTopic}`);

  // Configure facility-specific pricing for Potato
  const pricing = await prisma.facilityPricing.create({
    data: {
      facilityId: verifiedFacility.id,
      commodityCategory: CommodityCategory.POTATO,
      pricingModel: PricingModel.PER_DAY_PER_MT,
      rateAmount: 8.0, // ₹8 per metric tonne per day
      effectiveFrom: new Date(),
      createdById: owner.id,
      adminApproved: true,
      status: 'ACTIVE'
    }
  });
  printSuccess(`Pricing Model configured: Potato storage rate = ₹${pricing.rateAmount} per MT/day`);

  // =========================================================================
  // 5. ONBOARD FARMER & VERIFY KYC DOCUMENTS
  // =========================================================================
  printStep(5, 'Onboard Farmer & Verify KYC documents');

  // Farmer registers
  const farmer = await prisma.user.create({
    data: {
      fullName: 'DEMO - Ramesh Chandra',
      email: 'farmer.ramesh@gmail.com',
      phone: '9999000004',
      phoneVerified: true,
      role: UserRole.FARMER,
      status: UserStatus.PENDING_VERIFICATION,
      passwordHash: pwHash,
      city: 'Fatehabad',
      state: 'Uttar Pradesh',
      pincode: '283111',
      landHolding: '8.5 Acres',
      khasraNumber: 'KH-DEMO-4882',
      villageName: 'Nipane',
      district: 'Agra',
      preferredLang: 'hi' // Hindi language preference
    }
  });
  printInfo(`Farmer registered: ${farmer.fullName} (${farmer.phone})`);

  // Farmer uploads Aadhaar card document
  const farmerDoc = await prisma.userDocument.create({
    data: {
      userId: farmer.id,
      documentType: 'AADHAAR_FRONT',
      documentNumber: '999911112222',
      fileUrl: '/uploads/documents/demo_aadhaar.jpg',
      status: 'PENDING_REVIEW'
    }
  });
  printInfo(`Farmer uploaded Aadhaar verification document: ID Number = ${farmerDoc.documentNumber}`);

  // Admin verifies Farmer KYC
  await prisma.userDocument.update({
    where: { id: farmerDoc.id },
    data: {
      status: 'APPROVED',
      reviewedById: admin.id,
      reviewedAt: new Date()
    }
  });
  const verifiedFarmer = await prisma.user.update({
    where: { id: farmer.id },
    data: {
      kycVerified: true,
      kycVerifiedAt: new Date(),
      status: UserStatus.ACTIVE
    }
  });
  printSuccess(`Farmer KYC approved by Admin! Status: ${verifiedFarmer.status}, KYC Verified: ${verifiedFarmer.kycVerified}`);

  // =========================================================================
  // 6. RECORD INVENTORY LOT DEPOSIT & WAREHOUSE RECEIPT
  // =========================================================================
  printStep(6, 'Intake Agricultural Produce & Create Stored Lot');

  // Farmer brings 5,000 kg (5 MT) of potatoes. Staff creates Lot record.
  const lot = await prisma.inventoryLot.create({
    data: {
      lotNumber: 'LOT-DEMO-2026-00001',
      receiptNumber: 'RCT-DEMO-2026-00001',
      facilityId: verifiedFacility.id,
      chamberId: chamber.id,
      depositorId: verifiedFarmer.id,
      commodityCategory: CommodityCategory.POTATO,
      commodityName: 'Kufri Jyoti (Processing Grade)',
      intakeWeightKg: 5000,
      currentWeightKg: 5000,
      bagCount: 100, // 100 bags of 50kg each
      qualityGrade: QualityGrade.A,
      qualityNotes: 'Sound tuber health, average moisture content 78%, diameter > 45mm.',
      moistureContent: 12.5,
      status: LotStatus.STORED,
      appliedRate: pricing.rateAmount,
      pricingModel: pricing.pricingModel,
      createdById: staff.id
    }
  });
  printSuccess(`Inventory Intake Completed! Lot Number: ${lot.lotNumber}`);
  printInfo(`Deposited: 5,000 kg (100 Sacks) of ${lot.commodityName} in ${chamber.chamberNumber}`);

  // Chamber occupied capacity updated
  await prisma.chamber.update({
    where: { id: chamber.id },
    data: { occupiedMt: 5.0 }
  });

  // Log Intake Transaction (Immutable ledger logging)
  const intakeTx = await prisma.inventoryTransaction.create({
    data: {
      lotId: lot.id,
      transactionType: 'INTAKE',
      weightKg: 5000,
      bagCount: 100,
      notes: 'Initial lot intake recorded at Main Weighbridge.',
      performedById: staff.id,
      depositorApproved: true
    }
  });
  printInfo(`Intake transaction logged: Transaction ID = ${intakeTx.id}`);

  // Trigger deposit SMS/Push notification simulation
  await prisma.notification.create({
    data: {
      userId: verifiedFarmer.id,
      type: 'LOT_EXPIRY_WARNING', // Using existing enum
      title: 'Commodity Deposit Confirmed',
      message: `नमस्ते रमेश जी, आपका 5,000 किग्रा आलू PK Hitech Cold Storage (Chamber A) में सुरक्षित जमा कर लिया गया है। रसीद संख्या: ${lot.receiptNumber}`,
      read: false
    }
  });
  printInfo('Simulated deposit confirmation sent to Farmer via localized WhatsApp/SMS notification.');

  // =========================================================================
  // 7. GENERATE WDRA-ALIGNED eNWR
  // =========================================================================
  printStep(7, 'Generate Electronic Negotiable Warehouse Receipt (eNWR)');

  // eNWR generated for financial compliance
  const eNWR = await prisma.warehouseReceipt.create({
    data: {
      lotId: lot.id,
      receiptNumber: `ENWR-DEMO-${lot.receiptNumber.slice(9)}`,
      wdraRepoId: 'NERL-REP-90088122-DEMO',
      isNegotiable: true,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    }
  });
  printSuccess(`eNWR Generated successfully! Receipt Number: ${eNWR.receiptNumber}`);
  printInfo(`Registered with National Electronic Repository ID: ${eNWR.wdraRepoId}`);

  // =========================================================================
  // 8. PLEDGE eNWR FOR HARVEST LOAN (FINANCING)
  // =========================================================================
  printStep(8, 'Pledge eNWR for Post-Harvest Agricultural Loan');

  // Farmer pledges receipt to SBI for 75% of asset value
  const pledgedLoanAmount = 45000; // Rs 45,000 loan on Rs 60,000 potato valuation
  const pledgedENWR = await prisma.warehouseReceipt.update({
    where: { id: eNWR.id },
    data: {
      isPledged: true,
      pledgedTo: 'State Bank of India (Agra Agri-Branch)',
      pledgeAmount: pledgedLoanAmount,
      pledgeDate: new Date(),
      status: 'PLEDGED'
    }
  });
  printSuccess(`eNWR Pledged! State: ${pledgedENWR.status}, Loan Disbursed: ₹${pledgedENWR.pledgeAmount}`);
  printInfo(`Collateral secured by: ${pledgedENWR.pledgedTo}`);

  // Create an audit trail for the loan pledging
  await prisma.auditLog.create({
    data: {
      userId: verifiedFarmer.id,
      userRole: UserRole.FARMER,
      action: 'WAREHOUSE_RECEIPT_PLEDGED',
      entityType: 'WarehouseReceipt',
      entityId: pledgedENWR.id,
      newValues: { pledgedTo: pledgedENWR.pledgedTo, pledgeAmount: pledgedLoanAmount, status: 'PLEDGED' }
    }
  });

  // =========================================================================
  // 9. CREATE MARKETPLACE SALE LISTING
  // =========================================================================
  printStep(9, 'Farmer Lists Commodity Stored on Marketplace');

  // Farmer decides to sell 4,000 kg (4 MT) of Kufri Jyoti
  const listing = await prisma.marketListing.create({
    data: {
      lotId: lot.id,
      sellerId: verifiedFarmer.id,
      askingPricePerKg: 18.0, // Rs 18 per kg
      minQuantityKg: 1000,
      description: 'Excellent processing grade potatoes. High starch, low moisture. Pledged under SBI but open for trade settlement.',
      status: ListingStatus.ACTIVE
    }
  });
  printSuccess(`Marketplace Listing Created! Asking Price: ₹${listing.askingPricePerKg}/kg`);
  printInfo(`Listed Lot: ${lot.lotNumber}, Quantity Offered: 4,000 kg`);

  // =========================================================================
  // 10. REGISTER INSTITUTIONAL BUYER & PLACE ORDER
  // =========================================================================
  printStep(10, 'Onboard Corporate Buyer & Place Purchase Order');

  // Buyer registers
  const buyer = await prisma.user.create({
    data: {
      fullName: 'DEMO - Haldiram Foods International',
      email: 'procurement@haldirams.in',
      phone: '9999000005',
      phoneVerified: true,
      role: UserRole.BUYER,
      status: UserStatus.ACTIVE,
      passwordHash: pwHash,
      businessName: 'Haldiram Foods International Ltd.',
      businessType: 'Food Processor',
      gstNumber: '09DEMOGST1234F1',
      kycVerified: true,
    }
  });
  printInfo(`Buyer registered: ${buyer.businessName} (${buyer.fullName})`);

  // Buyer places order for 4,000 kg at asking price of ₹18/kg
  const orderAmount = 4000 * 18.0; // ₹72,000
  const order = await prisma.order.create({
    data: {
      listingId: listing.id,
      buyerId: buyer.id,
      quantityKg: 4000,
      agreedPricePerKg: 18.0,
      totalAmount: orderAmount,
      status: OrderStatus.PENDING_APPROVAL
    }
  });
  printSuccess(`Purchase Order Placed! Quantity: 4,000 kg, Agreed Rate: ₹18/kg, Total Amount: ₹${order.totalAmount}`);

  // Farmer approves order
  const approvedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.APPROVED,
      approvedAt: new Date(),
      otpCode: '123456', // Generate secure OTP code
      otpExpiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 mins expiry
    }
  });
  printSuccess(`Farmer Approved Order! Status updated to: ${approvedOrder.status}`);

  // =========================================================================
  // 11. ESCROW PAYMENT HOLD
  // =========================================================================
  printStep(11, 'Buyer Initiates Escrow Payment');

  // Buyer deposits Rs 72,000. Nodal/Escrow account intercepts and holds it
  const escrow = await prisma.escrowTransaction.create({
    data: {
      orderId: approvedOrder.id,
      amount: orderAmount,
      buyerPaidAt: new Date(),
      pgReferenceId: 'PG-REF-DEMO-772281',
      pgProvider: 'razorpay',
      status: 'HELD'
    }
  });
  printSuccess(`Escrow Account holds payment! Status: ${escrow.status}, Amount: ₹${escrow.amount}`);
  printInfo(`Transaction Gateway reference ID: ${escrow.pgReferenceId}`);

  // =========================================================================
  // 12. SIMULATE IOT CHAMBER ENVIRONMENTAL MONITORING
  // =========================================================================
  printStep(12, 'IoT Live Telemetry Environmental Monitoring');

  // Simulate logging a few stable temp logs for Chamber A
  const readings = [
    { temp: 3.5, hum: 92.5, isAlert: false },
    { temp: 3.6, hum: 92.0, isAlert: false },
    { temp: 3.4, hum: 93.1, isAlert: false },
  ];

  for (const r of readings) {
    await prisma.temperatureReading.create({
      data: {
        chamberId: chamber.id,
        temperature: r.temp,
        humidity: r.hum,
        sensorId: iotDevice.deviceId,
        isAlert: r.isAlert
      }
    });
  }
  
  const avgTemp = 3.5;
  const avgHum = 92.5;
  printSuccess(`IoT Environmental Heartbeats logged. Chamber A readings: Temp Avg = ${avgTemp}°C, Humidity Avg = ${avgHum}%`);
  printInfo('Quality and moisture levels are monitored in real time, preventing agricultural spoilage.');

  // =========================================================================
  // 13. DISPATCH ORDER & VALIDATE OTP RELEASE
  // =========================================================================
  printStep(13, 'Dispatch Execution & Secure OTP Release');

  // Buyer truck arrives. Staff requests release. 
  // Farmer validates by submitting OTP (approves OTP code '123456')
  const verifiedOTP = '123456';
  if (verifiedOTP === approvedOrder.otpCode) {
    printInfo('Buyer truck checked-in. Farmer submitted verification OTP remotely via WhatsApp.');
    printSuccess('OTP verified successfully! Securing release and eliminating the manual "Travel Tax".');
  }

  // Update order to DISPATCHED
  const dispatchedOrder = await prisma.order.update({
    where: { id: approvedOrder.id },
    data: { status: OrderStatus.DISPATCHED }
  });
  
  // Decrease stored lot current weight
  const updatedLot = await prisma.inventoryLot.update({
    where: { id: lot.id },
    data: { 
      currentWeightKg: 1000, // 5000 kg - 4000 kg sold
      status: LotStatus.PARTIALLY_RELEASED 
    }
  });

  // Log Release transaction
  await prisma.inventoryTransaction.create({
    data: {
      lotId: lot.id,
      transactionType: 'PARTIAL_RELEASE',
      weightKg: 4000,
      bagCount: 80,
      notes: 'Partial release of 4,000 kg dispatched to Haldiram Foods.',
      performedById: staff.id,
      depositorApproved: true,
      gatePassNumber: 'GP-DEMO-8877112'
    }
  });
  printSuccess(`Inventory lot updated: Lot Status = ${updatedLot.status}, Remaining Weight = ${updatedLot.currentWeightKg} kg`);
  printInfo(`Gate Pass issued: GP-DEMO-8877112. Buyer took delivery of 4,000 kg.`);

  // =========================================================================
  // 14. FINAL SETTLEMENT & PAYOUT DISTRIBUTION
  // =========================================================================
  printStep(14, 'Final Payout Settlement & Multi-Party Distribution');

  // Calculate rent dues: Lot stored for 60 days
  // Rate: ₹8 per MT per day. Lot was 5 MT
  // Rent: 5 MT * ₹8/day * 60 days = ₹2,400
  const storageRentDue = 2400.00;

  // Generate Storage Rent Invoice for Farmer
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-DEMO-2026-01',
      facilityId: verifiedFacility.id,
      depositorId: verifiedFarmer.id,
      lotId: lot.id,
      subtotal: storageRentDue,
      taxAmount: storageRentDue * 0.18, // 18% GST
      totalAmount: storageRentDue * 1.18, // ₹2,832
      status: 'DRAFT',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdById: staff.id
    }
  });

  // Invoice Line Items
  await prisma.invoiceLineItem.create({
    data: {
      invoiceId: invoice.id,
      description: 'Chamber A Potato storage rent (60 days at ₹8.00/MT/day for 5 MT)',
      quantity: 5.0,
      unitPrice: 480.00, // ₹8 * 60 days
      totalPrice: storageRentDue
    }
  });

  // Release Escrow funds & trigger automated splits
  // Escrow Amount: ₹72,000
  // Deduct Pledged Loan (repay State Bank of India): ₹45,000
  // Deduct Outstanding Storage Invoice: ₹2,832 (transferred to facility owner)
  // Net payout to Farmer: ₹72,000 - ₹45,000 - ₹2,832 = ₹24,168
  const rentInvoiceAmount = parseFloat(invoice.totalAmount.toString());
  const bankLoanRepaid = pledgedLoanAmount;
  const netProfitToFarmer = 72000 - bankLoanRepaid - rentInvoiceAmount;

  const releasedEscrow = await prisma.escrowTransaction.update({
    where: { id: escrow.id },
    data: {
      status: 'RELEASED',
      sellerReleasedAt: new Date(),
      loanDeduction: bankLoanRepaid,
      netToSeller: netProfitToFarmer
    }
  });

  // Update invoice as paid
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount: invoice.totalAmount,
      status: 'PAID'
    }
  });

  // Record Payment
  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: invoice.totalAmount,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: 'TXN-RENT-DEMO-9911',
      recordedById: staff.id
    }
  });

  // Redeem/Clear Pledged Warehouse Receipt
  await prisma.warehouseReceipt.update({
    where: { id: pledgedENWR.id },
    data: {
      isPledged: false,
      status: 'REDEEMED' // eNWR redeemed and closed
    }
  });

  printSuccess('Automated Escrow Settlement Completed!');
  console.log(BOLD + WHITE + '  =======================================================' + RESET);
  console.log(BOLD + WHITE + '   💸 TRANSACTION SETTLEMENT REPORT (Multi-Party Split)  ' + RESET);
  console.log(BOLD + WHITE + '  =======================================================' + RESET);
  console.log(`   Gross Buyer Funds:      ₹${escrow.amount}`);
  console.log(GREEN + `   [-] Loan Repayment:     ₹${bankLoanRepaid} (Direct to SBI)` + RESET);
  console.log(GREEN + `   [-] Storage Rent Paid:  ₹${rentInvoiceAmount} (Paid to Facility Owner)` + RESET);
  console.log(BOLD + GREEN + `   [=] Net Farmer Payout:  ₹${netProfitToFarmer} (Transferred to Ramesh Chandra)` + RESET);
  console.log(BOLD + WHITE + '  =======================================================' + RESET);

  // =========================================================================
  // 15. VIEW SYSTEM AUDIT TRAILS
  // =========================================================================
  printStep(15, 'Immutable System Audit Trail Log');

  const auditLogs = await prisma.auditLog.findMany({
    where: { 
      userId: { in: [verifiedFarmer.id, admin.id, owner.id] } 
    },
    orderBy: { createdAt: 'asc' }
  });

  printInfo(`Retrieved ${auditLogs.length} immutable events from audit logs:`);
  for (const log of auditLogs) {
    console.log(`  🕒 ${log.createdAt.toISOString()} | [${log.action}] by [${log.userRole}] on [${log.entityType}]`);
  }

  printHeader('DEMONSTRATION CONCLUDED SUCCESSFULLY!');
  printSuccess('The complete agricultural cold storage supply chain workflow was executed.');
  printInfo('Ready to show to stakeholders at the company.');
}

runDemo()
  .catch((e) => {
    console.error(RED + '❌ Error running demo workflow:' + RESET, e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
