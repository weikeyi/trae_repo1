import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { error } from '../utils/response';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (err: any) {
      const messages = err.issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      error(res, `请求参数错误: ${messages}`, 400);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (err: any) {
      const messages = err.issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      error(res, `查询参数错误: ${messages}`, 400);
    }
  };
};
