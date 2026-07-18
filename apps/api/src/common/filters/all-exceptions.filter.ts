import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestWithContext } from '../middleware/request-context.middleware';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId: string | null;
  details?: Record<string, unknown>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();

    const response = context.getResponse<Response>();

    const request = context.getRequest<Request>();

    const requestWithContext = request as RequestWithContext;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    let error = 'Internal Server Error';

    let message: string | string[] = 'An unexpected error occurred.';

    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        const responseObject = exceptionResponse as Record<string, unknown>;

        if (typeof responseObject.error === 'string') {
          error = responseObject.error;
        } else {
          error = exception.name;
        }

        if (
          typeof responseObject.message === 'string' ||
          Array.isArray(responseObject.message)
        ) {
          message = responseObject.message as string | string[];
        } else {
          message = exception.message;
        }

        const {
          statusCode: ignoredStatusCode,
          error: ignoredError,
          message: ignoredMessage,
          ...remainingDetails
        } = responseObject;

        void ignoredStatusCode;
        void ignoredError;
        void ignoredMessage;

        if (Object.keys(remainingDetails).length > 0) {
          details = remainingDetails;
        }
      }
    }

    const responseBody: ErrorResponseBody = {
      statusCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.path,
      requestId: requestWithContext.requestId ?? null,
    };

    if (details) {
      responseBody.details = details;
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;

      this.logger.error(
        {
          event: 'unhandled_exception',
          requestId: requestWithContext.requestId ?? null,
          method: request.method,
          path: request.path,
          statusCode,
        },
        stack,
      );
    }

    response.status(statusCode).json(responseBody);
  }
}
