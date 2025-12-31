import { Router } from 'express';
import { searchGames, getGameById, saveGame, deleteGame } from '../controllers/games.controller';
import { requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/search', searchGames);
router.post('/', requireAdmin, saveGame);
router.get('/:id', getGameById);
router.delete('/:id', requireAdmin, deleteGame);

export default router;
