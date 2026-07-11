import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

/**
 * PDF Generator Utility for ColdStorage
 * Generates intake receipts, gate passes, and invoice PDFs.
 */

// ── Common Helpers ─────────────────────────────

const COLORS = {
  primary: '#6366f1',
  accent: '#10b981',
  dark: '#0f172a',
  muted: '#64748b',
  light: '#f1f5f9',
  border: '#e2e8f0',
  white: '#ffffff',
  danger: '#f43e5c',
};

function drawHeader(doc: PDFKit.PDFDocument, facilityName: string, subtitle: string) {
  // Background bar
  doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);

  // Title
  doc.fontSize(20).fillColor(COLORS.white).font('Helvetica-Bold')
    .text(facilityName, 40, 22, { width: doc.page.width - 80 });

  doc.fontSize(9).fillColor('rgba(255,255,255,0.8)').font('Helvetica')
    .text(subtitle, 40, 50, { width: doc.page.width - 80 });

  // Reset
  doc.fillColor(COLORS.dark).font('Helvetica');
  doc.y = 100;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  const y = doc.y;
  doc.fontSize(10).fillColor(COLORS.primary).font('Helvetica-Bold')
    .text(title.toUpperCase(), 40, y);
  doc.moveTo(40, y + 16).lineTo(doc.page.width - 40, y + 16)
    .strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.y = y + 24;
}

function drawField(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.fontSize(7).fillColor(COLORS.muted).font('Helvetica')
    .text(label.toUpperCase(), x, y, { width });
  doc.fontSize(10).fillColor(COLORS.dark).font('Helvetica-Bold')
    .text(value || '—', x, y + 10, { width });
}

function drawFooter(doc: PDFKit.PDFDocument, text: string) {
  const y = doc.page.height - 50;
  doc.moveTo(40, y).lineTo(doc.page.width - 40, y)
    .strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.fontSize(7).fillColor(COLORS.muted).font('Helvetica')
    .text(text, 40, y + 8, { width: doc.page.width - 80, align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 40, y + 20,
    { width: doc.page.width - 80, align: 'center' });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} MT`;
  return `${kg.toFixed(0)} kg`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
}

// ── PDF to Buffer Helper ───────────────────────

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    doc.pipe(stream);
    doc.end();
  });
}

// ── Intake Receipt PDF ─────────────────────────

interface ReceiptData {
  lotNumber: string;
  receiptNumber: string;
  facilityName: string;
  facilityAddress: string;
  chamberNumber: string;
  chamberName: string | null;
  depositorName: string;
  depositorPhone: string;
  commodityCategory: string;
  commodityName: string;
  intakeWeightKg: number;
  bagCount: number | null;
  qualityGrade: string | null;
  moistureContent: number | null;
  intakeDate: Date | string;
  expectedRelease: Date | string | null;
  appliedRate: number | null;
  pricingModel: string | null;
}

export async function generateReceiptPdf(data: ReceiptData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  // Header
  drawHeader(doc, data.facilityName, `Storage Receipt — ${data.receiptNumber}`);

  // Receipt & Lot Info
  const row1Y = doc.y;
  drawField(doc, 'Receipt Number', data.receiptNumber, 40, row1Y, 200);
  drawField(doc, 'Lot Number', data.lotNumber, 260, row1Y, 200);
  drawField(doc, 'Intake Date', formatDate(data.intakeDate), 460, row1Y, 100);
  doc.y = row1Y + 40;

  // Depositor
  drawSectionTitle(doc, 'Depositor Details');
  const row2Y = doc.y;
  drawField(doc, 'Name', data.depositorName, 40, row2Y, 250);
  drawField(doc, 'Phone', data.depositorPhone, 310, row2Y, 200);
  doc.y = row2Y + 40;

  // Commodity
  drawSectionTitle(doc, 'Commodity Details');
  const row3Y = doc.y;
  drawField(doc, 'Category', data.commodityCategory, 40, row3Y, 140);
  drawField(doc, 'Variety / Name', data.commodityName, 200, row3Y, 160);
  drawField(doc, 'Weight', formatWeight(data.intakeWeightKg), 380, row3Y, 100);
  drawField(doc, 'Bags', data.bagCount?.toString() || '—', 490, row3Y, 70);
  doc.y = row3Y + 40;

  const row4Y = doc.y;
  drawField(doc, 'Quality Grade', data.qualityGrade ? `Grade ${data.qualityGrade}` : 'Not assessed', 40, row4Y, 160);
  drawField(doc, 'Moisture Content', data.moistureContent ? `${data.moistureContent}%` : '—', 200, row4Y, 160);
  doc.y = row4Y + 40;

  // Storage
  drawSectionTitle(doc, 'Storage Details');
  const row5Y = doc.y;
  drawField(doc, 'Chamber', `${data.chamberNumber} — ${data.chamberName || ''}`, 40, row5Y, 200);
  drawField(doc, 'Expected Release', data.expectedRelease ? formatDate(data.expectedRelease) : 'Not specified', 260, row5Y, 200);
  doc.y = row5Y + 40;

  if (data.appliedRate) {
    const row6Y = doc.y;
    drawField(doc, 'Applied Rate', `₹${data.appliedRate}/day/MT`, 40, row6Y, 200);
    drawField(doc, 'Pricing Model', data.pricingModel || '—', 260, row6Y, 200);
    doc.y = row6Y + 40;
  }

  // Signature areas
  doc.y = Math.max(doc.y + 40, doc.page.height - 180);
  const sigY = doc.y;
  doc.moveTo(40, sigY + 30).lineTo(200, sigY + 30).strokeColor(COLORS.border).stroke();
  doc.moveTo(360, sigY + 30).lineTo(520, sigY + 30).strokeColor(COLORS.border).stroke();
  doc.fontSize(8).fillColor(COLORS.muted)
    .text('Depositor Signature', 40, sigY + 35, { width: 160, align: 'center' })
    .text('Authorized Signature', 360, sigY + 35, { width: 160, align: 'center' });

  // Footer
  drawFooter(doc, `${data.facilityName} — ${data.facilityAddress}`);

  return pdfToBuffer(doc);
}

// ── Gate Pass PDF ──────────────────────────────

interface GatePassData {
  gatePassNumber: string;
  lotNumber: string;
  facilityName: string;
  facilityAddress: string;
  depositorName: string;
  depositorPhone: string;
  commodityName: string;
  releaseWeightKg: number;
  bagCount: number | null;
  remainingWeightKg: number;
  releaseType: string;
  releasedBy: string;
  releaseDate: Date | string;
  notes: string | null;
}

export async function generateGatePassPdf(data: GatePassData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  // Header
  drawHeader(doc, data.facilityName, `Gate Pass — ${data.gatePassNumber}`);

  // Gate Pass Info
  const row1Y = doc.y;
  drawField(doc, 'Gate Pass No.', data.gatePassNumber, 40, row1Y, 200);
  drawField(doc, 'Lot Number', data.lotNumber, 260, row1Y, 200);
  drawField(doc, 'Date', formatDate(data.releaseDate), 460, row1Y, 100);
  doc.y = row1Y + 40;

  // Release Type indicator
  const isFullRelease = data.releaseType === 'FULL_RELEASE';
  doc.y += 5;
  doc.roundedRect(40, doc.y, doc.page.width - 80, 36, 6)
    .fill(isFullRelease ? '#dcfce7' : '#dbeafe');
  doc.fontSize(11).fillColor(isFullRelease ? '#166534' : '#1e40af').font('Helvetica-Bold')
    .text(isFullRelease ? '✓ FULL RELEASE' : '◐ PARTIAL RELEASE', 55, doc.y - 24);
  doc.y += 20;
  doc.fillColor(COLORS.dark).font('Helvetica');

  // Depositor
  drawSectionTitle(doc, 'Depositor');
  const row2Y = doc.y;
  drawField(doc, 'Name', data.depositorName, 40, row2Y, 250);
  drawField(doc, 'Phone', data.depositorPhone, 310, row2Y, 200);
  doc.y = row2Y + 40;

  // Release Details
  drawSectionTitle(doc, 'Release Details');
  const row3Y = doc.y;
  drawField(doc, 'Commodity', data.commodityName, 40, row3Y, 200);
  drawField(doc, 'Released Weight', formatWeight(data.releaseWeightKg), 260, row3Y, 140);
  drawField(doc, 'Bags', data.bagCount?.toString() || '—', 420, row3Y, 80);
  doc.y = row3Y + 40;

  const row4Y = doc.y;
  drawField(doc, 'Remaining Weight', formatWeight(data.remainingWeightKg), 40, row4Y, 200);
  drawField(doc, 'Authorized By', data.releasedBy, 260, row4Y, 250);
  doc.y = row4Y + 40;

  if (data.notes) {
    drawSectionTitle(doc, 'Notes');
    doc.fontSize(9).fillColor(COLORS.dark).font('Helvetica')
      .text(data.notes, 40, doc.y, { width: doc.page.width - 80 });
    doc.y += 20;
  }

  // Vehicle details (placeholder)
  drawSectionTitle(doc, 'Vehicle Details');
  const vY = doc.y;
  drawField(doc, 'Vehicle Number', '______________________', 40, vY, 200);
  drawField(doc, 'Driver Name', '______________________', 260, vY, 200);
  doc.y = vY + 40;

  // Signatures
  doc.y = Math.max(doc.y + 40, doc.page.height - 180);
  const sigY = doc.y;
  doc.moveTo(40, sigY + 30).lineTo(180, sigY + 30).strokeColor(COLORS.border).stroke();
  doc.moveTo(220, sigY + 30).lineTo(360, sigY + 30).strokeColor(COLORS.border).stroke();
  doc.moveTo(400, sigY + 30).lineTo(540, sigY + 30).strokeColor(COLORS.border).stroke();
  doc.fontSize(8).fillColor(COLORS.muted)
    .text('Depositor', 40, sigY + 35, { width: 140, align: 'center' })
    .text('Security Gate', 220, sigY + 35, { width: 140, align: 'center' })
    .text('Authorized By', 400, sigY + 35, { width: 140, align: 'center' });

  drawFooter(doc, `${data.facilityName} — ${data.facilityAddress}`);

  return pdfToBuffer(doc);
}

// ── Invoice PDF ────────────────────────────────

interface InvoiceLineItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface InvoicePdfData {
  invoiceNumber: string;
  facilityName: string;
  facilityAddress: string;
  depositorName: string;
  depositorPhone: string;
  depositorAddress: string | null;
  issueDate: Date | string;
  dueDate: Date | string;
  billingPeriodStart: Date | string | null;
  billingPeriodEnd: Date | string | null;
  lineItems: InvoiceLineItemData[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  lotNumber: string | null;
  commodityName: string | null;
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });

  // Header
  drawHeader(doc, data.facilityName, `Tax Invoice — ${data.invoiceNumber}`);

  // Invoice meta
  const row1Y = doc.y;
  drawField(doc, 'Invoice No.', data.invoiceNumber, 40, row1Y, 160);
  drawField(doc, 'Issue Date', formatDate(data.issueDate), 220, row1Y, 120);
  drawField(doc, 'Due Date', formatDate(data.dueDate), 360, row1Y, 120);
  drawField(doc, 'Status', data.status, 490, row1Y, 70);
  doc.y = row1Y + 40;

  if (data.billingPeriodStart && data.billingPeriodEnd) {
    const row1bY = doc.y;
    drawField(doc, 'Billing Period', `${formatDate(data.billingPeriodStart)} — ${formatDate(data.billingPeriodEnd)}`, 40, row1bY, 300);
    if (data.lotNumber) drawField(doc, 'Lot Number', data.lotNumber, 360, row1bY, 200);
    doc.y = row1bY + 40;
  }

  // Bill To
  drawSectionTitle(doc, 'Bill To');
  const row2Y = doc.y;
  drawField(doc, 'Name', data.depositorName, 40, row2Y, 250);
  drawField(doc, 'Phone', data.depositorPhone, 310, row2Y, 200);
  doc.y = row2Y + 35;
  if (data.depositorAddress) {
    doc.fontSize(8).fillColor(COLORS.muted).text(data.depositorAddress, 40, doc.y, { width: 300 });
    doc.y += 15;
  }

  // Line Items Table
  drawSectionTitle(doc, 'Items');
  const tableTop = doc.y;
  const tableW = doc.page.width - 80;
  const colWidths = [tableW * 0.5, tableW * 0.15, tableW * 0.15, tableW * 0.2];
  const headers = ['Description', 'Qty', 'Rate', 'Amount'];

  // Table header
  doc.rect(40, tableTop, tableW, 22).fill(COLORS.light);
  headers.forEach((h, i) => {
    const x = 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.fontSize(7).fillColor(COLORS.muted).font('Helvetica-Bold')
      .text(h.toUpperCase(), x + 6, tableTop + 6, { width: colWidths[i] - 12, align: i === 0 ? 'left' : 'right' });
  });

  // Table rows
  let rowY = tableTop + 22;
  doc.font('Helvetica');
  for (const item of data.lineItems) {
    const values = [item.description, item.quantity.toString(), formatCurrency(item.unitPrice), formatCurrency(item.totalPrice)];
    values.forEach((v, i) => {
      const x = 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.fontSize(9).fillColor(COLORS.dark)
        .text(v, x + 6, rowY + 6, { width: colWidths[i] - 12, align: i === 0 ? 'left' : 'right' });
    });
    rowY += 22;
    doc.moveTo(40, rowY).lineTo(40 + tableW, rowY).strokeColor(COLORS.border).lineWidth(0.3).stroke();
  }

  // Totals
  rowY += 10;
  const totalsX = 40 + colWidths[0] + colWidths[1];
  const totalsW = colWidths[2] + colWidths[3];

  const totals = [
    ['Subtotal', formatCurrency(data.subtotal)],
    ['Tax', formatCurrency(data.taxAmount)],
    ['Total', formatCurrency(data.totalAmount)],
    ['Paid', formatCurrency(data.paidAmount)],
    ['Balance Due', formatCurrency(data.totalAmount - data.paidAmount)],
  ];

  for (const [label, value] of totals) {
    const isTotal = label === 'Total' || label === 'Balance Due';
    doc.fontSize(isTotal ? 10 : 8)
      .fillColor(isTotal ? COLORS.dark : COLORS.muted)
      .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
      .text(label, totalsX, rowY, { width: totalsW / 2 - 6, align: 'right' })
      .text(value, totalsX + totalsW / 2, rowY, { width: totalsW / 2 - 6, align: 'right' });
    rowY += isTotal ? 18 : 14;
  }

  drawFooter(doc, `${data.facilityName} — ${data.facilityAddress}`);

  return pdfToBuffer(doc);
}
