import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { Transfer } from "../entities/Transfer";

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  if (typeof out.senderId === "number" && Number.isInteger(out.senderId) && out.senderId >= 1) {
    out.sender = { id: out.senderId };
    delete out.senderId;
  }
  if (typeof out.receiverId === "number" && Number.isInteger(out.receiverId) && out.receiverId >= 1) {
    out.receiver = { id: out.receiverId };
    delete out.receiverId;
  }
  return out;
}

export class TransferService {
  private repo = AppDataSource.getRepository(Transfer);

  /** Lists transfers with sender/receiver id, email, fullName only (no password hash). */
  async findAll(): Promise<Transfer[]> {
    return this.repo
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.sender", "sender")
      .leftJoinAndSelect("t.receiver", "receiver")
      .select([
        "t.id",
        "t.totalAmount",
        "t.occurredAt",
        "t.type",
        "t.status",
        "t.createdAt",
        "t.updatedAt",
        "sender.id",
        "sender.email",
        "sender.fullName",
        "receiver.id",
        "receiver.email",
        "receiver.fullName",
      ])
      .getMany();
  }

  async findById(id: number): Promise<Transfer | null> {
    return this.repo
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.sender", "sender")
      .leftJoinAndSelect("t.receiver", "receiver")
      .select([
        "t.id",
        "t.totalAmount",
        "t.occurredAt",
        "t.type",
        "t.status",
        "t.createdAt",
        "t.updatedAt",
        "sender.id",
        "sender.email",
        "sender.fullName",
        "receiver.id",
        "receiver.email",
        "receiver.fullName",
      ])
      .where("t.id = :id", { id })
      .getOne();
  }

  async create(raw: Record<string, unknown>): Promise<Transfer> {
    const data = normalizeBody({ ...raw });
    delete data.id;
    const row = this.repo.create(data as never);
    const saved = await this.repo.save(row);
    const id = (Array.isArray(saved) ? saved[0] : saved).id;
    return (await this.findById(id))!;
  }

  async update(id: number, raw: Record<string, unknown>): Promise<Transfer> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError(404, "Transfer not found", "not_found");
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
      throw new AppError(404, "Transfer not found", "not_found");
    }
  }
}
