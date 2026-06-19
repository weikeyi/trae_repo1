import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { JwtPayload } from '../types';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as any);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};
