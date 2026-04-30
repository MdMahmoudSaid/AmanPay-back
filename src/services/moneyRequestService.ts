import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { MoneyRequest } from "../entities/MoneyRequest";

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  if (typeof out.userId === "number" && Number.isInteger(out.userId) && out.userId >= 1) {
    out.user = { id: out.userId };
    delete out.userId;
  }
  return out;
}

export class MoneyRequestService {
  private repo = AppDataSource.getRepository(MoneyRequest);

  async findAll(): Promise<MoneyRequest[]> {
    return this.repo.find();
  }

  async findById(id: number): Promise<MoneyRequest | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(raw: Record<string, unknown>): Promise<MoneyRequest> {
    const data = normalizeBody({ ...raw });
    delete data.id;
    const row = this.repo.create(data as never);
    const saved = await this.repo.save(row);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(id: number, raw: Record<string, unknown>): Promise<MoneyRequest> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError(404, "Money request not found", "not_found");
    }
    const data = normalizeBody({ ...raw });
    delete data.id;
    this.repo.merge(existing, data as never);
    const saved = await this.repo.save(existing);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) {
      throw new AppError(404, "Money request not found", "not_found");
    }
  }
}
