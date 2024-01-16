import * as errors from "../errors/index.js";
import { ServerMiddleware } from "../server/index.js";

export function createErrorMiddleware(onError?: (error: unknown) => void): ServerMiddleware {
  return async function (request, next) {
    try {
      const response = await next(request);
      return response;
    } catch (error) {
      onError?.(error);

      if (
        error instanceof errors.ServerRequestEntityValidationFailed ||
        error instanceof errors.ServerRequestParameterValidationFailed
      ) {
        return {
          headers: {},
          status: 400,
        };
      }

      if (error instanceof errors.AuthenticationFailed) {
        return {
          headers: {},
          status: 401,
        };
      }

      if (error instanceof errors.NoRouteFound) {
        return {
          headers: {},
          status: 404,
        };
      }

      if (error instanceof errors.MethodNotSupported) {
        return {
          headers: {},
          status: 405,
        };
      }

      if (
        error instanceof errors.MissingServerRequestContentType ||
        error instanceof errors.UnexpectedServerRequestContentType
      ) {
        return {
          headers: {},
          status: 415,
        };
      }

      if (error instanceof errors.OperationNotImplemented) {
        return {
          headers: {},
          status: 501,
        };
      }

      return {
        headers: {},
        status: 500,
      };
    }
  };
}
