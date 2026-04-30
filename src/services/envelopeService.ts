import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { Envelope } from "../entities/Envelope";

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  if (typeof out.transferId === "number" && Number.isInteger(out.transferId) && out.transferId >= 1) {
    out.transfer = { id: out.transferId };
    delete out.transferId;
  }
  return out;
}

export class EnvelopeService {
  private repo = AppDataSource.getRepository(Envelope);

  async findAll(): Promise<Envelope[]> {
    return this.repo.find();
  }

  async findById(id: number): Promise<Envelope | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(raw: Record<string, unknown>): Promise<Envelope> {
    const data = normalizeBody({ ...raw });
    delete data.id;
    const row = this.repo.create(data as never);
    const saved = await this.repo.save(row);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(id: number, raw: Record<string, unknown>): Promise<Envelope> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError(404, "Envelope not found", "not_found");
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
      throw new AppError(404, "Envelope not found", "not_found");
    }
  }
}
