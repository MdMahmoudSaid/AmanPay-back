import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { Transfer } from "../entities/Transfer";
import { Wallet } from "../entities/Wallet";
import { User, UserRole } from "../entities/User";
import { Envelope } from "../entities/Envelope";
import { CategoryWallet } from "../entities/CategoryWallet";
import { ENVELOPE_WALLET_CATEGORY_SET, ENVELOPE_WALLET_MODE_SET } from "../constants/envelopeWallet";
import { CategoryWalletService } from "./categoryWalletService";
import type { EntityManager, Repository } from "typeorm";

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
  private categoryWalletService = new CategoryWalletService();

  private async resolveReceiverUserId(rawReceiver: unknown, userRepo: Repository<User>): Promise<number | null> {
    const asNumber = Number(rawReceiver);
    if (Number.isInteger(asNumber) && asNumber >= 1) {
      const byId = await userRepo.findOne({ where: { id: asNumber }, select: ["id"] });
      if (byId) return byId.id;
    }

    const text = String(rawReceiver ?? "").trim();
    if (!text) return null;
    if (text.includes("@")) {
      const byEmail = await userRepo.findOne({ where: { email: text.toLowerCase() }, select: ["id"] });
      return byEmail?.id ?? null;
    }
    const digits = text.replace(/\D/g, "");
    const byRefOrPhone = await userRepo
      .createQueryBuilder("u")
      .select(["u.id"])
      .where("u.referenceId = :ref", { ref: text.toUpperCase() })
      .orWhere("regexp_replace(COALESCE(u.phone, ''), '[^0-9]', '', 'g') = :digits", { digits })
      .getOne();
    return byRefOrPhone?.id ?? null;
  }

  /** Lists transfers with sender/receiver id, email, fullName only (no password hash). */
  async findAll(): Promise<Transfer[]> {
    return this.repo
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.sender", "sender")
      .leftJoinAndSelect("t.receiver", "receiver")
      .leftJoinAndSelect("t.envelopes", "envelopes")
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
        "envelopes.id",
        "envelopes.type",
        "envelopes.amount",
        "envelopes.status",
        "envelopes.mode",
      ])
      .orderBy("t.occurredAt", "DESC")
      .addOrderBy("t.id", "DESC")
      .getMany();
  }

  async findById(id: number): Promise<Transfer | null> {
    return this.repo
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.sender", "sender")
      .leftJoinAndSelect("t.receiver", "receiver")
      .leftJoinAndSelect("t.envelopes", "envelopes")
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
        "envelopes.id",
        "envelopes.type",
        "envelopes.amount",
        "envelopes.status",
        "envelopes.mode",
      ])
      .where("t.id = :id", { id })
      .getOne();
  }

  private async findByIdWithManager(id: number, manager: EntityManager): Promise<Transfer | null> {
    return manager
      .getRepository(Transfer)
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.sender", "sender")
      .leftJoinAndSelect("t.receiver", "receiver")
      .leftJoinAndSelect("t.envelopes", "envelopes")
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
        "envelopes.id",
        "envelopes.type",
        "envelopes.amount",
        "envelopes.status",
        "envelopes.mode",
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

  async createSimpleTransfer(raw: Record<string, unknown>, authUserId: number): Promise<Transfer> {
    const senderId = authUserId;
    if (!Number.isInteger(senderId) || senderId < 1) {
      throw new AppError(401, "Unauthorized", "unauthorized");
    }
    const amount = Number(raw.totalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, "Invalid transfer amount", "validation_error");
    }
    const amountCents = Math.round(amount * 100);
    if (amountCents <= 0) {
      throw new AppError(400, "Invalid transfer amount", "validation_error");
    }
    const occurredAt =
      typeof raw.occurredAt === "string" || raw.occurredAt instanceof Date ? new Date(raw.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new AppError(400, "Invalid occurredAt", "validation_error");
    }

    return AppDataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const userRepo = manager.getRepository(User);
      const transferRepo = manager.getRepository(Transfer);
      const receiverId = await this.resolveReceiverUserId(raw.receiverId, userRepo);
      if (!receiverId) {
        throw new AppError(404, "Receiver user not found", "not_found");
      }
      if (senderId === receiverId) {
        throw new AppError(400, "Sender and receiver must be different", "validation_error");
      }

      const [senderUser, receiverUser] = await Promise.all([
        userRepo.findOne({ where: { id: senderId }, select: ["id", "role"] }),
        userRepo.findOne({ where: { id: receiverId }, select: ["id", "role"] }),
      ]);
      if (!senderUser || !receiverUser) {
        throw new AppError(404, "Sender or receiver user not found", "not_found");
      }
      if (senderUser.role === UserRole.ADMIN || receiverUser.role === UserRole.ADMIN) {
        throw new AppError(400, "Admin cannot send or receive transfers", "validation_error");
      }

      const [firstId, secondId] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
      const firstWallet = await walletRepo
        .createQueryBuilder("wallet")
        .leftJoinAndSelect("wallet.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: firstId })
        .getOne();
      const secondWallet = await walletRepo
        .createQueryBuilder("wallet")
        .leftJoinAndSelect("wallet.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: secondId })
        .getOne();
      const senderWallet = senderId === firstId ? firstWallet : secondWallet;
      const receiverWallet = receiverId === firstId ? firstWallet : secondWallet;

      if (!senderWallet || !receiverWallet) {
        throw new AppError(404, "Sender or receiver wallet not found", "not_found");
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
          type: "local",
          status: "completed",
        } as never)
      );
      const transferId = (Array.isArray(created) ? created[0] : created).id;
      const hydrated = await this.findByIdWithManager(transferId, manager);
      if (!hydrated) {
        throw new AppError(500, "Failed to load created transfer", "persist_failed");
      }
      return hydrated;
    });
  }

  async createEnvelopeTransfer(raw: Record<string, unknown>, authUserId: number): Promise<Transfer> {
    const senderId = authUserId;
    if (!Number.isInteger(senderId) || senderId < 1) {
      throw new AppError(401, "Unauthorized", "unauthorized");
    }
    const totalAmount = Number(raw.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new AppError(400, "Invalid transfer amount", "validation_error");
    }
    const totalCents = Math.round(totalAmount * 100);
    const envelopesRaw = Array.isArray(raw.envelopes) ? raw.envelopes : null;
    if (!envelopesRaw || envelopesRaw.length === 0) {
      throw new AppError(400, "At least one envelope is required", "validation_error");
    }
    const occurredAt =
      typeof raw.occurredAt === "string" || raw.occurredAt instanceof Date ? new Date(raw.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new AppError(400, "Invalid occurredAt", "validation_error");
    }

    return AppDataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const userRepo = manager.getRepository(User);
      const transferRepo = manager.getRepository(Transfer);
      const envelopeRepo = manager.getRepository(Envelope);
      const categoryWalletRepo = manager.getRepository(CategoryWallet);
      const receiverId = await this.resolveReceiverUserId(raw.receiverId, userRepo);
      if (!receiverId) throw new AppError(404, "Receiver user not found", "not_found");
      if (senderId === receiverId) throw new AppError(400, "Sender and receiver must be different", "validation_error");
      const receiver = await userRepo.findOne({ where: { id: receiverId }, select: ["id", "role"] });
      if (!receiver) throw new AppError(404, "Receiver user not found", "not_found");
      const senderUser = await userRepo.findOne({ where: { id: senderId }, select: ["id", "role"] });
      if (!senderUser) throw new AppError(404, "Sender user not found", "not_found");
      if (senderUser.role === UserRole.ADMIN || receiver.role === UserRole.ADMIN) {
        throw new AppError(400, "Admin cannot send or receive transfers", "validation_error");
      }
      if (receiver.role === UserRole.MERCHANT) {
        throw new AppError(400, "Envelope transfer to merchant is not allowed", "validation_error");
      }

      let sumCents = 0;
      const parsed = envelopesRaw.map((row) => {
        if (!row || typeof row !== "object") throw new AppError(400, "Invalid envelope payload", "validation_error");
        const rec = row as Record<string, unknown>;
        const type = String(rec.type ?? rec.category ?? "").trim().toLowerCase().replace(/\s+/g, "_");
        const mode = String(rec.mode ?? raw.envelopeMode ?? "dynamic").trim().toLowerCase();
        const cents = Math.round(Number(rec.amount) * 100);
        if (!ENVELOPE_WALLET_CATEGORY_SET.has(type)) {
          throw new AppError(400, `Unsupported category: ${type}`, "validation_error");
        }
        if (!ENVELOPE_WALLET_MODE_SET.has(mode)) {
          throw new AppError(400, `Unsupported mode: ${mode}`, "validation_error");
        }
        if (!Number.isFinite(cents) || cents <= 0) {
          throw new AppError(400, "Envelope amount must be positive", "validation_error");
        }
        sumCents += cents;
        return { type, mode, cents };
      });
      if (sumCents !== totalCents) {
        throw new AppError(400, "Envelope amounts must equal totalAmount", "validation_error");
      }

      const senderWallet = await walletRepo
        .createQueryBuilder("wallet")
        .leftJoinAndSelect("wallet.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: senderId })
        .getOne();
      if (!senderWallet) throw new AppError(404, "Sender wallet not found", "not_found");
      const senderBalanceCents = Math.round(Number(senderWallet.totalBalance) * 100);
      if (senderBalanceCents < totalCents) {
        throw new AppError(400, "Insufficient wallet balance", "insufficient_balance");
      }
      senderWallet.totalBalance = ((senderBalanceCents - totalCents) / 100).toFixed(2);
      await walletRepo.save(senderWallet);

      await this.categoryWalletService.ensureForUser(receiverId, manager);
      const receiverCategoryWallets = await categoryWalletRepo
        .createQueryBuilder("cw")
        .leftJoinAndSelect("cw.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: receiverId })
        .getMany();
      const walletByCategory = new Map(receiverCategoryWallets.map((w) => [w.category, w]));
      for (const item of parsed) {
        const cw = walletByCategory.get(item.type);
        if (!cw) {
          throw new AppError(500, `Missing category wallet for ${item.type}`, "persist_failed");
        }
        if (item.mode === "strict") {
          const strictCents = Math.round(Number(cw.strictBalance) * 100);
          cw.strictBalance = ((strictCents + item.cents) / 100).toFixed(2);
        } else {
          const dynamicCents = Math.round(Number(cw.dynamicBalance) * 100);
          cw.dynamicBalance = ((dynamicCents + item.cents) / 100).toFixed(2);
        }
      }
      await categoryWalletRepo.save([...walletByCategory.values()]);

      const savedTransfer = await transferRepo.save(
        transferRepo.create({
          sender: { id: senderId },
          receiver: { id: receiverId },
          totalAmount: (totalCents / 100).toFixed(2),
          occurredAt,
          type: "envelope",
          status: "completed",
        } as never)
      );
      const transferId = (Array.isArray(savedTransfer) ? savedTransfer[0] : savedTransfer).id;
      const envelopeRows = parsed.map((e) =>
        envelopeRepo.create({
          transfer: { id: transferId } as never,
          type: e.type,
          amount: (e.cents / 100).toFixed(2),
          mode: e.mode,
          status: e.mode === "strict" ? "locked" : "flexible",
        } as never)
      );
      await envelopeRepo.save(envelopeRows as never);
      const hydrated = await this.findByIdWithManager(transferId, manager);
      if (!hydrated) {
        throw new AppError(500, "Failed to load created transfer", "persist_failed");
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
