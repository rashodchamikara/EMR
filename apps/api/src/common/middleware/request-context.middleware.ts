import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
export interface RequestWithContext extends Request {
  requestId: string;
}
const httpLogger = new Logger('HTTP'); 
function isValidRequestId(value: string): boolean {
  return /^[A-Za-z0-9._-]{1,100}$/.test(value);
}
export function requestContextMiddleware( 
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  const incomingRequestId = request.header('x-request-id');
  const requestId =
    incomingRequestId && isValidRequestId(incomingRequestId)
      ? incomingRequestId
      : randomUUID();
  const contextualRequest = request as RequestWithContext;
  contextualRequest.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  response.on('finish', () => {
    httpLogger.log({
      event: 'http_request',
      requestId,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
}
