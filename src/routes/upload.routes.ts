import { Router } from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/upload.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), uploadImage);

export default router;
