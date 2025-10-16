import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

router.get('/hello', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Test route works!' });
});

export default router;