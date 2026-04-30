import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { Wallet } from "../entities/Wallet";

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  if (typeof out.userId === "number" && Number.isInteger(out.userId) && out.userId >= 1) {
    out.user = { id: out.userId };
    delete out.userId;
  }
  return out;
}

export class WalletService {
  private repo = AppDataSource.getRepository(Wallet);

  /** Lists wallets with user id/email/fullName only (no password hash). */
  async findAll(): Promise<Wallet[]> {
    return this.repo
      .createQueryBuilder("wallet")
      .leftJoinAndSelect("wallet.user", "user")
      .select([
        "wallet.id",
        "wallet.totalBalance",
        "wallet.currency",
        "wallet.createdAt",
        "wallet.updatedAt",
        "user.id",
        "user.email",
        "user.fullName",
      ])
      .getMany();
  }

  async findById(id: number): Promise<Wallet | null> {
    return this.repo
      .createQueryBuilder("wallet")
      .leftJoinAndSelect("wallet.user", "user")
      .select([
        "wallet.id",
        "wallet.totalBalance",
        "wallet.currency",
        "wallet.createdAt",
        "wallet.updatedAt",
        "user.id",
        "user.email",
        "user.fullName",
      ])
      .where("wallet.id = :id", { id })
      .getOne();
  }

  async create(raw: Record<string, unknown>): Promise<Wallet> {
    const data = normalizeBody({ ...raw });
    delete data.id;
    const row = this.repo.create(data as never);
    const saved = await this.repo.save(row);
    const id = (Array.isArray(saved) ? saved[0] : saved).id;
    return (await this.findById(id))!;
  }

  async update(id: number, raw: Record<string, unknown>): Promise<Wallet> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError(404, "Wallet not found", "not_found");
    }
    const data = normalizeBody({ ...raw });
    delete data.id;
    this.repo.merge(existing, data as never);
    await this.repo.save(existing);
    return (await this.findById(id))!;
  }

  async delete(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) {
      throw new AppError(404, "Wallet not found", "not_found");
    }
  }
}
