import { Router } from 'express';
import { getConsoles } from '../controllers/consoles.controller';

const router = Router();

router.get('/', getConsoles);

export default router;
