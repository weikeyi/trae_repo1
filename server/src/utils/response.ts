import { Response } from 'express';
import { ApiResponse, PaginatedResult } from '../types';

export const success = <T>(res: Response, data?: T, message?: string, statusCode: number = 200): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  res.status(statusCode).json(response);
};

export const error = (res: Response, message: string, statusCode: number = 400, error?: string): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  };
  res.status(statusCode).json(response);
};

export const paginated = <T>(res: Response, result: PaginatedResult<T>, message?: string): void => {
  const response: ApiResponse<PaginatedResult<T>> = {
    success: true,
    data: result,
    message,
  };
  res.status(200).json(response);
};
