import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';

const router = Router();

router.use(authenticate);

/**
 * Convert array of objects to CSV string
 */
function toCSV(data: Record<string, any>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

function sendCSV(res: any, filename: string, csvContent: string) {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': Buffer.byteLength(csvContent, 'utf-8').toString(),
  });
  res.send(csvContent);
}

/**
 * GET /reports/inventory/csv — Export inventory lots
 */
router.get('/inventory/csv', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const status = req.query.status as string | undefined;
  const where: any = {};

  // Scope to facility for non-admin users
  if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    where.facilityId = req.user!.facilityId;
  } else if (req.user!.role === UserRole.OWNER) {
    where.facility = { ownerId: req.user!.userId };
  }

  if (status) where.status = status;

  const lots = await prisma.inventoryLot.findMany({
    where,
    include: {
      depositor: { select: { fullName: true, phone: true } },
      chamber: { select: { chamberNumber: true, name: true } },
      facility: { select: { name: true } },
    },
    orderBy: { intakeDate: 'desc' },
  });

  const columns = [
    { key: 'lotNumber', label: 'Lot Number' },
    { key: 'receiptNumber', label: 'Receipt Number' },
    { key: 'facilityName', label: 'Facility' },
    { key: 'chamberNumber', label: 'Chamber' },
    { key: 'depositorName', label: 'Depositor' },
    { key: 'depositorPhone', label: 'Phone' },
    { key: 'commodityCategory', label: 'Category' },
    { key: 'commodityName', label: 'Commodity' },
    { key: 'intakeWeightKg', label: 'Intake Weight (kg)' },
    { key: 'currentWeightKg', label: 'Current Weight (kg)' },
    { key: 'bagCount', label: 'Bags' },
    { key: 'qualityGrade', label: 'Quality Grade' },
    { key: 'status', label: 'Status' },
    { key: 'intakeDate', label: 'Intake Date' },
    { key: 'expectedRelease', label: 'Expected Release' },
  ];

  const rows = lots.map((lot) => ({
    lotNumber: lot.lotNumber,
    receiptNumber: lot.receiptNumber,
    facilityName: lot.facility?.name || '',
    chamberNumber: lot.chamber?.chamberNumber || '',
    depositorName: lot.depositor?.fullName || '',
    depositorPhone: lot.depositor?.phone || '',
    commodityCategory: lot.commodityCategory,
    commodityName: lot.commodityName,
    intakeWeightKg: Number(lot.intakeWeightKg),
    currentWeightKg: Number(lot.currentWeightKg),
    bagCount: lot.bagCount || '',
    qualityGrade: lot.qualityGrade || '',
    status: lot.status,
    intakeDate: new Date(lot.intakeDate).toLocaleDateString('en-IN'),
    expectedRelease: lot.expectedRelease ? new Date(lot.expectedRelease).toLocaleDateString('en-IN') : '',
  }));

  const csv = toCSV(rows, columns);
  const date = new Date().toISOString().split('T')[0];
  sendCSV(res, `inventory-report-${date}.csv`, csv);
}));

/**
 * GET /reports/invoices/csv — Export invoices
 */
router.get('/invoices/csv', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const where: any = {};

  if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    where.facilityId = req.user!.facilityId;
  } else if (req.user!.role === UserRole.OWNER) {
    where.facility = { ownerId: req.user!.userId };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      depositor: { select: { fullName: true, phone: true } },
      facility: { select: { name: true } },
      lot: { select: { lotNumber: true, commodityName: true } },
    },
    orderBy: { issueDate: 'desc' },
  });

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'facilityName', label: 'Facility' },
    { key: 'depositorName', label: 'Depositor' },
    { key: 'depositorPhone', label: 'Phone' },
    { key: 'lotNumber', label: 'Lot Number' },
    { key: 'commodity', label: 'Commodity' },
    { key: 'subtotal', label: 'Subtotal (₹)' },
    { key: 'taxAmount', label: 'Tax (₹)' },
    { key: 'totalAmount', label: 'Total (₹)' },
    { key: 'paidAmount', label: 'Paid (₹)' },
    { key: 'balance', label: 'Balance (₹)' },
    { key: 'status', label: 'Status' },
    { key: 'issueDate', label: 'Issue Date' },
    { key: 'dueDate', label: 'Due Date' },
  ];

  const rows = invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    facilityName: inv.facility?.name || '',
    depositorName: inv.depositor?.fullName || '',
    depositorPhone: inv.depositor?.phone || '',
    lotNumber: inv.lot?.lotNumber || '',
    commodity: inv.lot?.commodityName || '',
    subtotal: Number(inv.subtotal),
    taxAmount: Number(inv.taxAmount),
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    balance: Number(inv.totalAmount) - Number(inv.paidAmount),
    status: inv.status,
    issueDate: new Date(inv.issueDate).toLocaleDateString('en-IN'),
    dueDate: new Date(inv.dueDate).toLocaleDateString('en-IN'),
  }));

  const csv = toCSV(rows, columns);
  const date = new Date().toISOString().split('T')[0];
  sendCSV(res, `invoices-report-${date}.csv`, csv);
}));

/**
 * GET /reports/transactions/csv — Export inventory transactions
 */
router.get('/transactions/csv', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const where: any = {};

  if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    where.lot = { facilityId: req.user!.facilityId };
  } else if (req.user!.role === UserRole.OWNER) {
    where.lot = { facility: { ownerId: req.user!.userId } };
  }

  const transactions = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      lot: { select: { lotNumber: true, commodityName: true } },
      performer: { select: { fullName: true } },
    },
    orderBy: { performedAt: 'desc' },
    take: 1000,
  });

  const columns = [
    { key: 'lotNumber', label: 'Lot Number' },
    { key: 'commodity', label: 'Commodity' },
    { key: 'type', label: 'Transaction Type' },
    { key: 'weightKg', label: 'Weight (kg)' },
    { key: 'bagCount', label: 'Bags' },
    { key: 'gatePassNumber', label: 'Gate Pass' },
    { key: 'performedBy', label: 'Performed By' },
    { key: 'performedAt', label: 'Date' },
    { key: 'notes', label: 'Notes' },
  ];

  const rows = transactions.map((txn) => ({
    lotNumber: txn.lot?.lotNumber || '',
    commodity: txn.lot?.commodityName || '',
    type: txn.transactionType,
    weightKg: Number(txn.weightKg),
    bagCount: txn.bagCount || '',
    gatePassNumber: txn.gatePassNumber || '',
    performedBy: txn.performer?.fullName || '',
    performedAt: new Date(txn.performedAt).toLocaleString('en-IN'),
    notes: txn.notes || '',
  }));

  const csv = toCSV(rows, columns);
  const date = new Date().toISOString().split('T')[0];
  sendCSV(res, `transactions-report-${date}.csv`, csv);
}));

export default router;
