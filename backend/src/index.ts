import express from 'express';
import { createServer } from 'http';
import { config } from './config/config';
import gameRoutes from './routes/gameRoutes';
import { corsMiddleware } from './middleware/cors.middleware';

const app = express();
const server = createServer(app);

app.use(corsMiddleware);
app.use(express.json());
app.use('/game', gameRoutes);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});