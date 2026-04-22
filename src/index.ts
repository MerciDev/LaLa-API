import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import gamesRoutes from './routes/games.routes';
import uploadRoutes from './routes/upload.routes';
import consolesRoutes from './routes/consoles.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve static files for images if needed
// Rate Limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply to all API requests
app.use('/api', apiLimiter);

// Routes
app.use('/api/games', gamesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/consoles', consolesRoutes);
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'Welcome to LaLa API',
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/info', (req: Request, res: Response) => {
    res.json({
        app: 'LaLa-HUB',
        version: '1.0.0',
        description: 'API providing data and assets for LaLa-HUB'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`); 
});
