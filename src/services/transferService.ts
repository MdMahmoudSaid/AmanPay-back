import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { Transfer } from "../entities/Transfer";
import { Wallet } from "../entities/Wallet";
import { User } from "../entities/User";

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
    // Note: this service assumes caller auth/verification is handled upstream.
    // It does not perform sender password or biometric checks by design.
    const data = normalizeBody({ ...raw });
    delete data.id;
    const row = this.repo.create(data as never);
    const saved = await this.repo.save(row);
    const id = (Array.isArray(saved) ? saved[0] : saved).id;
    return (await this.findById(id))!;
  }

  async createSimpleTransfer(raw: Record<string, unknown>, authUserId: number): Promise<Transfer> {
    const receiverId = Number(raw.receiverId);
    if (!Number.isInteger(receiverId) || receiverId < 1) {
      throw new AppError(400, "Invalid receiverId", "validation_error");
    }

    const senderId = authUserId;
    if (!Number.isInteger(senderId) || senderId < 1) {
      throw new AppError(401, "Unauthorized", "unauthorized");
    }
    if (senderId === receiverId) {
      throw new AppError(400, "Sender and receiver must be different", "validation_error");
    }

    const amount = Number(raw.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, "Invalid transfer amount", "validation_error");
    }
    const amountCents = Math.round(amount * 100);
    if (amountCents <= 0) {
      throw new AppError(400, "Invalid transfer amount", "validation_error");
    }

    const transferType =
      typeof raw.type === "string" && raw.type.trim().length > 0 ? raw.type.trim().toLowerCase() : "local";
    const transferStatus =
      typeof raw.status === "string" && raw.status.trim().length > 0
        ? raw.status.trim().toLowerCase()
        : "completed";
    const occurredAt =
      typeof raw.occurredAt === "string" || raw.occurredAt instanceof Date ? new Date(raw.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new AppError(400, "Invalid occurredAt", "validation_error");
    }

    return AppDataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const userRepo = manager.getRepository(User);
      const transferRepo = manager.getRepository(Transfer);

      const [firstId, secondId] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
      let firstWallet = await walletRepo
        .createQueryBuilder("wallet")
        .leftJoinAndSelect("wallet.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: firstId })
        .getOne();
      let secondWallet = await walletRepo
        .createQueryBuilder("wallet")
        .leftJoinAndSelect("wallet.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: secondId })
        .getOne();

      if (!firstWallet) {
        const firstUser = await userRepo.findOne({ where: { id: firstId }, select: ["id"] });
        if (!firstUser) throw new AppError(404, "Sender or receiver user not found", "not_found");
        await walletRepo.save(
          walletRepo.create({
            user: { id: firstId },
            totalBalance: "0.00",
            currency: "EUR",
          } as never)
        );
        firstWallet = await walletRepo
          .createQueryBuilder("wallet")
          .leftJoinAndSelect("wallet.user", "user")
          .setLock("pessimistic_write")
          .where("user.id = :id", { id: firstId })
          .getOne();
      }

      if (!secondWallet) {
        const secondUser = await userRepo.findOne({ where: { id: secondId }, select: ["id"] });
        if (!secondUser) throw new AppError(404, "Sender or receiver user not found", "not_found");
        await walletRepo.save(
          walletRepo.create({
            user: { id: secondId },
            totalBalance: "0.00",
            currency: "EUR",
          } as never)
        );
        secondWallet = await walletRepo
          .createQueryBuilder("wallet")
          .leftJoinAndSelect("wallet.user", "user")
          .setLock("pessimistic_write")
          .where("user.id = :id", { id: secondId })
          .getOne();
      }

      const senderWallet = senderId === firstId ? firstWallet : secondWallet;
      const receiverWallet = receiverId === firstId ? firstWallet : secondWallet;

      if (!senderWallet) {
        throw new AppError(404, "Sender wallet not found", "not_found");
      }
      if (!receiverWallet) {
        throw new AppError(404, "Receiver wallet not found", "not_found");
      }
      if (senderWallet.currency !== receiverWallet.currency) {
        throw new AppError(400, "Cross-currency transfer is not supported", "validation_error");
      }

      const senderBalanceCents = Math.round(Number(senderWallet.totalBalance) * 100);
      if (senderBalanceCents < amountCents) {
        throw new AppError(400, "Insufficient wallet balance", "insufficient_balance");
      }

      const receiverBalanceCents = Math.round(Number(receiverWallet.totalBalance) * 100);
      senderWallet.totalBalance = ((senderBalanceCents - amountCents) / 100).toFixed(2);
      receiverWallet.totalBalance = ((receiverBalanceCents + amountCents) / 100).toFixed(2);

      await walletRepo.save([senderWallet, receiverWallet]);

      const created = await transferRepo.save(
        transferRepo.create({
          sender: { id: senderId },
          receiver: { id: receiverId },
          totalAmount: (amountCents / 100).toFixed(2),
          occurredAt,
          type: transferType,
          status: transferStatus,
        } as never)
      );

      const transferId = (Array.isArray(created) ? created[0] : created).id;
      const hydrated = await transferRepo
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
        .where("t.id = :id", { id: transferId })
        .getOne();
      if (!hydrated) {
        throw new AppError(500, "Transfer created but could not be loaded", "transfer_load_failed");
      }
      return hydrated;
    });
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
