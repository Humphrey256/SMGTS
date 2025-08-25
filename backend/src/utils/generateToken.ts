import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export function generateToken(id: string, role: string): string {
  // Pass options as any to avoid a TypeScript branded type mismatch that
  // commonly occurs when using environment values for expiresIn.
  const options: any = { expiresIn: ENV.JWT_EXPIRES_IN };

  return (jwt as any).sign({ id, role }, ENV.JWT_SECRET, options);
}
