import { getSupabaseAdmin, isSupabaseAdminConfigured } from '../utils/supabaseAdmin.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

// Returns 503 (not a crash) when Supabase env vars are missing in this environment.
const requireSupabase = (res) => {
  if (isSupabaseAdminConfigured()) return getSupabaseAdmin();
  logger.error('Supabase storage requested but SUPABASE_URL / SUPABASE_SECRET_KEY are not set.');
  errorResponse(res, 'File storage is not configured on this server.', 503);
  return null;
};

/**
 * Generate a short-lived signed upload URL for curriculum materials (Admin only)
 */
export const getAdminUploadUrl = async (req, res, next) => {
  try {
    const supabaseAdmin = requireSupabase(res);
    if (!supabaseAdmin) return;

    const { fileName, fileType = 'application/pdf', folder = 'references', level = 'general', dayNumber = 1 } = req.body;

    if (!fileName || typeof fileName !== 'string') {
      return errorResponse(res, 'File name is required', 400);
    }

    const sanitizeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const sanitizedLevel = String(level).toLowerCase().replace(/[^a-z0-9]/g, '_');

    let filePath;
    if (folder === 'curriculum') {
      filePath = `curriculum/${sanitizedLevel}_${Date.now()}_${sanitizeName}`;
    } else {
      filePath = `references/${sanitizedLevel}_day${dayNumber}_${Date.now()}_${sanitizeName}`;
    }

    const { data, error } = await supabaseAdmin.storage
      .from('curriculum-books')
      .createSignedUploadUrl(filePath);

    if (error) {
      logger.error('Failed to create admin signed upload URL:', error);
      return errorResponse(res, `Storage service error: ${error.message}`, 500);
    }

    const { data: publicUrlData } = await supabaseAdmin.storage
      .from('curriculum-books')
      .getPublicUrl(filePath);

    return successResponse(res, 'Signed upload URL generated successfully', {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Generate a short-lived signed upload URL for payment receipts (Authenticated users)
 */
export const getDepositReceiptUploadUrl = async (req, res, next) => {
  try {
    // authenticateToken is permissive (it populates req.user when it can but does
    // not reject anonymous callers), so require a real user before minting an
    // upload URL. Without this, anyone could push files into the receipts bucket.
    if (!req.user || !req.user.id) {
      return errorResponse(res, 'Authentication required to upload a payment receipt.', 401);
    }

    const supabaseAdmin = requireSupabase(res);
    if (!supabaseAdmin) return;

    const { fileName, fileType } = req.body;

    if (!fileName || typeof fileName !== 'string') {
      return errorResponse(res, 'File name is required', 400);
    }

    const sanitizeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `receipts/${req.user.id.substring(0, 8)}_${Date.now()}_${sanitizeName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('payment-receipts')
      .createSignedUploadUrl(filePath);

    if (error) {
      logger.error('Failed to create receipt signed upload URL:', error);
      return errorResponse(res, `Storage service error: ${error.message}`, 500);
    }

    const { data: publicUrlData } = await supabaseAdmin.storage
      .from('payment-receipts')
      .getPublicUrl(filePath);

    return successResponse(res, 'Signed receipt upload URL generated successfully', {
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    });
  } catch (err) {
    next(err);
  }
};
