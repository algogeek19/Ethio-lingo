import { prisma } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

// Store an uploaded file's bytes in Postgres and return a served URL
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded.', 400);
    }

    const file = await prisma.file.create({
      data: {
        filename: req.file.originalname || 'untitled',
        mimeType: req.file.mimetype || 'application/octet-stream',
        size: req.file.size,
        data: req.file.buffer,
      },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    });

    return successResponse(res, 'File uploaded successfully.', {
      ...file,
      url: `/api/v1/files/${file.id}`,
    }, 201);
  } catch (err) {
    logger.error('File upload error:', err);
    return errorResponse(res, 'File upload failed.', 500);
  }
};

// Stream a stored file back to the client
export const getFile = async (req, res) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) {
      return errorResponse(res, 'File not found.', 404);
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(file.data);
  } catch (err) {
    logger.error('File retrieval error:', err);
    return errorResponse(res, 'File retrieval failed.', 500);
  }
};