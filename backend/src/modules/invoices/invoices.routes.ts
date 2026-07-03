import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { validate } from '../../shared/middleware/validate';
import { invoicesService } from './invoices.service';
import { queryString, paramString } from '../../shared/utils/query-helpers';
import { createInvoiceSchema, updateInvoiceStatusSchema } from '../../shared/schemas';

const router = Router();

router.use(authenticate);

/**
 * POST /invoices — Generate invoice
 */
router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN),
  validate({ body: createInvoiceSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const invoice = await invoicesService.createInvoice({
      ...req.body,
      createdById: req.user!.userId,
    });
    sendSuccess(res, invoice, 201);
  })
);

/**
 * GET /invoices — List invoices (role-scoped)
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const role = req.user!.role;
    const input: any = {
      facilityId: queryString(req.query.facilityId),
      depositorId: queryString(req.query.depositorId),
      status: queryString(req.query.status),
      search: queryString(req.query.search),
      page: queryString(req.query.page),
      limit: queryString(req.query.limit),
      sortBy: queryString(req.query.sortBy),
      sortOrder: queryString(req.query.sortOrder),
    };

    if (role === UserRole.STAFF && req.user!.facilityId) input.scopeFacilityId = req.user!.facilityId;
    else if (role === UserRole.OWNER) input.scopeOwnerUserId = req.user!.userId;

    const { invoices, meta } = await invoicesService.listInvoices(input);
    sendSuccess(res, invoices, 200, meta);
  })
);

/**
 * GET /invoices/:id — Invoice detail
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const invoice = await invoicesService.getInvoiceById(paramString(req.params.id));
    sendSuccess(res, invoice);
  })
);

/**
 * PATCH /invoices/:id/status — Update payment status
 */
router.patch(
  '/:id/status',
  authorize(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN),
  validate({ body: updateInvoiceStatusSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await invoicesService.updateStatus(paramString(req.params.id), req.body);
    sendSuccess(res, updated);
  })
);

/**
 * GET /invoices/:id/pdf — Download invoice PDF
 */
router.get(
  '/:id/pdf',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { buffer, invoiceNumber } = await invoicesService.getInvoicePdf(paramString(req.params.id));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  })
);

export default router;
