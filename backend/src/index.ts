import express from 'express';
import { config } from './config/config';
import gameRoutes from './routes/gameRoutes';
import { corsMiddleware } from './middleware/cors.middleware';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Routes
app.use('/game', gameRoutes);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});