import multer from 'multer';
import path from 'path';

//strorage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
         // Save to public/uploads folder
         cb(null, 'public/uploads/avatars');
  },
  filename: (req, file, cb) => {
    // Use unique filename
    const userId = (req as any).user.userId;
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${Date.now()}${ext}`);
  }


    
});
// File filter - only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG allowed'));
  }
};
// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  }
});