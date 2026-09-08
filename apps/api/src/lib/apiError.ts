export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message = "Invalid request.", details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = "You must be logged in to do that.") {
    return new ApiError(401, message);
  }
  static forbidden(message = "You do not have permission to do that.") {
    return new ApiError(403, message);
  }
  static notFound(message = "The requested resource was not found.") {
    return new ApiError(404, message);
  }
  static conflict(message = "This action conflicts with the current state.") {
    return new ApiError(409, message);
  }
  static internal(message = "Something went wrong. Please try again.") {
    return new ApiError(500, message);
  }
}
