import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { generateInvoiceNumber } from '../../shared/utils/id-generator';
import { generateInvoicePdf } from '../../shared/utils/pdf-generator';

const router = Router();

router.use(authenticate);

/**
 * POST /invoices — Generate invoice for a lot/depositor
 */

router.post('/', authorize(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    facilityId, depositorId, lotId,
    lineItems, // Array of { description, quantity, unitPrice }
    taxRate,    // e.g. 0.18 for 18% GST
    billingPeriodStart, billingPeriodEnd,
    dueDate,
  } = req.body;

  // Validate facility
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) {
    errors.notFound(res, 'Facility not found');
    return;
  }

  // Validate line items
  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
    errors.badRequest(res, 'At least one line item is required');
    return;
  }

  for (const item of lineItems) {
    if (item.unitPrice === null || item.unitPrice === undefined || isNaN(Number(item.unitPrice))) {
      errors.badRequest(res, `Invalid unitPrice in line item: "${item.description}". Please ensure a valid pricing rule is selected.`);
      return;
    }
    if (item.quantity === null || item.quantity === undefined || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
      errors.badRequest(res, `Invalid quantity in line item: "${item.description}".`);
      return;
    }
  }

  // Calculate amounts
  const subtotal = lineItems.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + Number(item.quantity) * Number(item.unitPrice),
    0
  );
  const taxAmount = subtotal * (taxRate || 0);
  const totalAmount = subtotal + taxAmount;

  const invoiceNumber = generateInvoiceNumber(facilityId);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      facilityId,
      depositorId,
      lotId: lotId || null,
      subtotal,
      taxAmount,
      totalAmount,
      billingPeriodStart: billingPeriodStart ? new Date(billingPeriodStart) : null,
      billingPeriodEnd: billingPeriodEnd ? new Date(billingPeriodEnd) : null,
      dueDate: new Date(dueDate),
      status: 'ISSUED',
      createdById: req.user!.userId,
      lineItems: {
        create: lineItems.map((item: { description: string; quantity: number; unitPrice: number }) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.quantity) * Number(item.unitPrice),
        })),
      },
    },
    include: {
      lineItems: true,
      depositor: { select: { id: true, fullName: true, phone: true } },
    },
  });

  // Update lot's rent accrued if linked
  if (lotId) {
    await prisma.inventoryLot.update({
      where: { id: lotId },
      data: { totalRentAccrued: { increment: totalAmount } },
    });
  }

  sendSuccess(res, invoice, 201);
}));

/**
 * GET /invoices — List invoices
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, skip, take, sortBy, sortOrder } = parsePagination(req.query);
  const { facilityId, depositorId, status, search } = req.query;

  const where: any = {};

  // Role-based scoping
  if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    where.facilityId = req.user!.facilityId;
  } else if (req.user!.role === UserRole.OWNER) {
    where.facility = { ownerId: req.user!.userId };
  }

  if (facilityId) where.facilityId = facilityId;
  if (depositorId) where.depositorId = depositorId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        depositor: { select: { id: true, fullName: true, phone: true } },
        facility: { select: { id: true, name: true } },
        lot: { select: { id: true, lotNumber: true, commodityName: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  sendSuccess(res, invoices, 200, buildPaginationMeta(page, limit, total));
}));

/**
 * GET /invoices/:id — Invoice details
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      lineItems: true,
      depositor: { select: { id: true, fullName: true, phone: true, email: true, addressLine1: true, city: true, state: true, pincode: true } },
      facility: { select: { id: true, name: true, addressLine1: true, city: true, state: true, pincode: true, contactPhone: true } },
      lot: { select: { id: true, lotNumber: true, commodityName: true, intakeWeightKg: true, intakeDate: true } },
    },
  });

  if (!invoice) {
    errors.notFound(res, 'Invoice not found');
    return;
  }

  sendSuccess(res, invoice);
}));

/**
 * PATCH /invoices/:id/status — Update payment status
 */
router.patch('/:id/status', authorize(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, paidAmount } = req.body;

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) {
    errors.notFound(res, 'Invoice not found');
    return;
  }

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      status,
      ...(paidAmount !== undefined && { paidAmount }),
    },
  });

  // Update lot's paid amount if linked
  if (invoice.lotId && paidAmount) {
    const incrementAmount = paidAmount - Number(invoice.paidAmount);
    if (incrementAmount > 0) {
      await prisma.inventoryLot.update({
        where: { id: invoice.lotId },
        data: { totalRentPaid: { increment: incrementAmount } },
      });
    }
  }

  sendSuccess(res, updated);
}));

/**
 * GET /invoices/:id/pdf — Download invoice PDF
 */
router.get('/:id/pdf', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      depositor: { select: { fullName: true, phone: true, addressLine1: true, city: true, state: true } },
      facility: { select: { name: true, addressLine1: true, city: true, state: true } },
      lot: { select: { lotNumber: true, commodityName: true } },
      lineItems: true,
    },
  });

  if (!invoice) {
    errors.notFound(res, 'Invoice not found');
    return;
  }

  const depositorAddress = invoice.depositor
    ? [invoice.depositor.addressLine1, invoice.depositor.city, invoice.depositor.state].filter(Boolean).join(', ')
    : null;

  const pdfBuffer = await generateInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    facilityName: invoice.facility?.name || 'ColdStorage Facility',
    facilityAddress: invoice.facility ? `${invoice.facility.addressLine1}, ${invoice.facility.city}, ${invoice.facility.state}` : '',
    depositorName: invoice.depositor?.fullName || 'Unknown',
    depositorPhone: invoice.depositor?.phone || '',
    depositorAddress,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    billingPeriodStart: invoice.billingPeriodStart,
    billingPeriodEnd: invoice.billingPeriodEnd,
    lineItems: (invoice.lineItems || []).map(li => ({
      description: li.description,
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
      totalPrice: Number(li.totalPrice),
    })),
    subtotal: Number(invoice.subtotal),
    taxAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.totalAmount),
    paidAmount: Number(invoice.paidAmount),
    status: invoice.status,
    lotNumber: invoice.lot?.lotNumber || null,
    commodityName: invoice.lot?.commodityName || null,
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
    'Content-Length': pdfBuffer.length.toString(),
  });
  res.send(pdfBuffer);
}));

export default router;
