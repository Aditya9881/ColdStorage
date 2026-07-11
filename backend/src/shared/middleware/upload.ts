/**
 * File Upload Middleware — ColdStorage Backend
 *
 * Dev:  Local disk storage (backend/uploads/)
 * Prod: AWS S3 with pre-signed URLs (future)
 *
 * Uses multer for multipart form handling.
 */
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

// ── Local disk storage (dev) ──
const localStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(UPLOAD_DIR, 'kyc'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuid()}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Use JPEG, PNG, WebP, or PDF.`));
  }
}

/**
 * Single KYC document upload middleware.
 * Field name: "document"
 * Max size: 5MB
 */
export const uploadKycDocument = multer({
  storage: localStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single('document');

/**
 * Multiple document upload (up to 5 at once).
 * Field name: "documents"
 */
export const uploadKycDocuments = multer({
  storage: localStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).array('documents', 5);

/**
 * Get the public URL for an uploaded file.
 * In dev, this returns a relative path served by Express static.
 * In prod, this would return an S3 pre-signed URL.
 */
export function getFileUrl(filename: string): string {
  // Dev: served via Express static at /uploads/kyc/
  return `/uploads/kyc/${filename}`;
}

export { UPLOAD_DIR };
