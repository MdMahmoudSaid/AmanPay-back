import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { UnblockRequest } from "../entities/UnblockRequest";

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  if (typeof out.userId === "number" && Number.isInteger(out.userId) && out.userId >= 1) {
    out.user = { id: out.userId };
    delete out.userId;
  }
  if (typeof out.envelopeId === "number" && Number.isInteger(out.envelopeId) && out.envelopeId >= 1) {
    out.envelope = { id: out.envelopeId };
    delete out.envelopeId;
  }
  return out;
}

export class UnblockRequestService {
  private repo = AppDataSource.getRepository(UnblockRequest);

  async findAll(): Promise<UnblockRequest[]> {
    return this.repo.find();
  }

  async findById(id: number): Promise<UnblockRequest | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(raw: Record<string, unknown>): Promise<UnblockRequest> {
    const data = normalizeBody({ ...raw });
    delete data.id;
    const row = this.repo.create(data as never);
    const saved = await this.repo.save(row);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(id: number, raw: Record<string, unknown>): Promise<UnblockRequest> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError(404, "Unblock request not found", "not_found");
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
      throw new AppError(404, "Unblock request not found", "not_found");
    }
  }
}
