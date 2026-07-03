import { prisma } from '../../config/database';
import { AppError } from '../../shared/middleware/error-handler';
import { UserRole } from '../../shared/types';
import { generateInvoiceNumber } from '../../shared/utils/id-generator';
import { generateInvoicePdf } from '../../shared/utils/pdf-generator';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';

// ── Input Interfaces ───────────────────────────────────────

export interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  facilityId: string;
  depositorId: string;
  lotId?: string;
  lineItems: LineItemInput[];
  taxRate?: number;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  dueDate: string;
  createdById: string;
}

export interface ListInvoicesInput {
  facilityId?: string;
  depositorId?: string;
  status?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: string;
  // Role-based scope
  scopeFacilityId?: string;
  scopeOwnerUserId?: string;
}

export interface UpdateInvoiceStatusInput {
  status: string;
  paidAmount?: number;
}

// ── Service Class ──────────────────────────────────────────

export class InvoicesService {
  /**
   * Generate a new invoice for a lot/depositor
   */
  async createInvoice(input: CreateInvoiceInput) {
    const facility = await prisma.facility.findUnique({ where: { id: input.facilityId } });
    if (!facility) throw new AppError(404, 'NOT_FOUND', 'Facility not found');

    if (!input.lineItems || input.lineItems.length === 0) {
      throw new AppError(400, 'MISSING_LINE_ITEMS', 'At least one line item is required');
    }

    for (const item of input.lineItems) {
      if (item.unitPrice === null || item.unitPrice === undefined || isNaN(Number(item.unitPrice))) {
        throw new AppError(400, 'INVALID_LINE_ITEM',
          `Invalid unitPrice in line item: "${item.description}". Ensure a valid pricing rule is selected.`);
      }
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        throw new AppError(400, 'INVALID_LINE_ITEM', `Invalid quantity in line item: "${item.description}".`);
      }
    }

    const subtotal = input.lineItems.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );
    const taxAmount = subtotal * (input.taxRate || 0);
    const totalAmount = subtotal + taxAmount;

    const invoiceNumber = generateInvoiceNumber(input.facilityId);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        facilityId: input.facilityId,
        depositorId: input.depositorId,
        lotId: input.lotId || null,
        subtotal,
        taxAmount,
        totalAmount,
        billingPeriodStart: input.billingPeriodStart ? new Date(input.billingPeriodStart) : null,
        billingPeriodEnd: input.billingPeriodEnd ? new Date(input.billingPeriodEnd) : null,
        dueDate: new Date(input.dueDate),
        status: 'ISSUED',
        createdById: input.createdById,
        lineItems: {
          create: input.lineItems.map(item => ({
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

    // Update lot rent accrued if linked
    if (input.lotId) {
      await prisma.inventoryLot.update({
        where: { id: input.lotId },
        data: { totalRentAccrued: { increment: totalAmount } },
      });
    }

    return invoice;
  }

  /**
   * List invoices with role-based scoping
   */
  async listInvoices(input: ListInvoicesInput) {
    const { page, limit, skip, take, sortBy, sortOrder } = parsePagination(input as any);

    const where: any = {};

    if (input.scopeFacilityId) where.facilityId = input.scopeFacilityId;
    if (input.scopeOwnerUserId) where.facility = { ownerId: input.scopeOwnerUserId };
    if (input.facilityId) where.facilityId = input.facilityId;
    if (input.depositorId) where.depositorId = input.depositorId;
    if (input.status) where.status = input.status;
    if (input.search) {
      where.OR = [{ invoiceNumber: { contains: input.search, mode: 'insensitive' } }];
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

    return { invoices, meta: buildPaginationMeta(page, limit, total) };
  }

  /**
   * Get invoice detail with all related data
   */
  async getInvoiceById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: true,
        depositor: {
          select: { id: true, fullName: true, phone: true, email: true, addressLine1: true, city: true, state: true, pincode: true },
        },
        facility: {
          select: { id: true, name: true, addressLine1: true, city: true, state: true, pincode: true, contactPhone: true },
        },
        lot: { select: { id: true, lotNumber: true, commodityName: true, intakeWeightKg: true, intakeDate: true } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });

    if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found');

    return invoice;
  }

  /**
   * Update invoice payment status
   */
  async updateStatus(id: string, input: UpdateInvoiceStatusInput) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found');

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: input.status as any,
        ...(input.paidAmount !== undefined && { paidAmount: input.paidAmount }),
      },
    });

    // Update lot rent paid if linked
    if (invoice.lotId && input.paidAmount) {
      const incrementAmount = input.paidAmount - Number(invoice.paidAmount);
      if (incrementAmount > 0) {
        await prisma.inventoryLot.update({
          where: { id: invoice.lotId },
          data: { totalRentPaid: { increment: incrementAmount } },
        });
      }
    }

    return updated;
  }

  /**
   * Generate invoice PDF buffer
   */
  async getInvoicePdf(id: string): Promise<{ buffer: Buffer; invoiceNumber: string }> {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        depositor: { select: { fullName: true, phone: true, addressLine1: true, city: true, state: true } },
        facility: { select: { name: true, addressLine1: true, city: true, state: true } },
        lot: { select: { lotNumber: true, commodityName: true } },
        lineItems: true,
      },
    });

    if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found');

    const depositorAddress = invoice.depositor
      ? [invoice.depositor.addressLine1, invoice.depositor.city, invoice.depositor.state].filter(Boolean).join(', ')
      : null;

    const buffer = await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      facilityName: invoice.facility?.name || 'ColdStorage Facility',
      facilityAddress: invoice.facility
        ? `${invoice.facility.addressLine1}, ${invoice.facility.city}, ${invoice.facility.state}`
        : '',
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

    return { buffer, invoiceNumber: invoice.invoiceNumber };
  }
}

export const invoicesService = new InvoicesService();
