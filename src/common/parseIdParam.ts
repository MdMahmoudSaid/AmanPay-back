import { AppError } from "./errors";

export function parseIdParam(param: string | string[] | undefined): number {
  const raw = Array.isArray(param) ? param[0] : param;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw new AppError(400, "Invalid id", "invalid_id");
  }
  return id;
}
