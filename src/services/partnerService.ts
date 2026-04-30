import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { Partner } from "../entities/Partner";

export class PartnerService {
  private repo = AppDataSource.getRepository(Partner);

  async findAll(): Promise<Partner[]> {
    return this.repo.find();
  }

  async findById(id: number): Promise<Partner | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(raw: Record<string, unknown>): Promise<Partner> {
    const data = { ...raw };
    delete data.id;
    const row = this.repo.create(data as never);
    const saved = await this.repo.save(row);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(id: number, raw: Record<string, unknown>): Promise<Partner> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError(404, "Partner not found", "not_found");
    }
    const data = { ...raw };
    delete data.id;
    this.repo.merge(existing, data as never);
    const saved = await this.repo.save(existing);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) {
      throw new AppError(404, "Partner not found", "not_found");
    }
  }
}
