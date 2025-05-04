import cors from 'cors';
import { config } from '../config/config';

export const corsMiddleware = cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 200
});