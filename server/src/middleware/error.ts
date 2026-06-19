import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : '服务器内部错误';
  error(res, message, statusCode, err.stack);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  error(res, `找不到路由 ${req.method} ${req.path}`, 404);
};
