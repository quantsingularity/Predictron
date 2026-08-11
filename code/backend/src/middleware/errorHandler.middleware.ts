import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Known errors (HttpError) return their own status/message; anything
// unexpected is logged in full but reduced to a generic 500 for the client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res
      .status(err.status)
      .json({ success: false, message: err.message });
  }
  logger.error({ err, path: req.path }, "unhandled error");
  return res
    .status(500)
    .json({ success: false, message: "Internal server error" });
}
