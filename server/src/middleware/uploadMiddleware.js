import multer from 'multer';

// Store files in memory; they are persisted to Postgres via the File model
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Unsupported file type. Allowed types: PDF, PNG, JPEG, WEBP, GIF.'));
  },
});

export default upload;