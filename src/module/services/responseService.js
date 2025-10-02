/**
 * Response service for standardized API responses
 */

/**
 * Send success response
 * @param {object} reply - Fastify reply object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
export function sendSuccess(reply, data = null, message = 'Success', statusCode = 200) {
  return reply.code(statusCode).send({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send error response
 * @param {object} reply - Fastify reply object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {any} errors - Detailed errors
 */
export function sendError(reply, message = 'Error', statusCode = 400, errors = null) {
  return reply.code(statusCode).send({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send validation error response
 * @param {object} reply - Fastify reply object
 * @param {array} validationErrors - Array of validation errors
 */
export function sendValidationError(reply, validationErrors) {
  return sendError(reply, 'Validation Error', 422, validationErrors);
}

/**
 * Send not found response
 * @param {object} reply - Fastify reply object
 * @param {string} resource - Resource name that was not found
 */
export function sendNotFound(reply, resource = 'Resource') {
  return sendError(reply, `${resource} not found`, 404);
}
