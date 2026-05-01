import type { EntityManager, Repository } from "typeorm";
import { AppError } from "../common/errors";
import { AppDataSource } from "../config/database";
import { ENVELOPE_WALLET_CATEGORIES, ENVELOPE_WALLET_CATEGORY_SET } from "../constants/envelopeWallet";
import { CategoryWallet } from "../entities/CategoryWallet";
import { Transfer } from "../entities/Transfer";
import { User, UserRole } from "../entities/User";
import { Wallet } from "../entities/Wallet";

function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

export class CategoryWalletService {
  private repo = AppDataSource.getRepository(CategoryWallet);
  private static mapMerchantCodeToWalletCategory(code: string | null): string | null {
    const normalized = (code ?? "").trim().toUpperCase();
    if (normalized === "AL" || normalized === "ALL") return "general";
    if (normalized === "FO") return "food";
    if (normalized === "TR") return "transportation";
    if (normalized === "PC") return "personal_care";
    if (normalized === "HO") return "household";
    return null;
  }

  async ensureForUser(userId: number, manager?: EntityManager): Promise<void> {
    const repo = (manager?.getRepository(CategoryWallet) ?? this.repo) as Repository<CategoryWallet>;
    const userRepo = manager?.getRepository(User) ?? AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId }, select: ["id", "role"] });
    if (!user) {
      throw new AppError(404, "User not found", "not_found");
    }
    if (user.role !== UserRole.USER) {
      return;
    }
    const existing = await repo.find({ where: { user: { id: userId } } });
    const existingSet = new Set(existing.map((w) => w.category));
    const missing = ENVELOPE_WALLET_CATEGORIES.filter((category) => !existingSet.has(category));
    if (!missing.length) return;
    await repo.save(
      missing.map((category) =>
        repo.create({
          user: { id: userId } as User,
          category,
          strictBalance: "0.00",
          dynamicBalance: "0.00",
          currency: "EUR",
        })
      )
    );
  }

  async getForUser(userId: number): Promise<CategoryWallet[]> {
    const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId }, select: ["id", "role"] });
    if (!user) {
      throw new AppError(404, "User not found", "not_found");
    }
    if (user.role !== UserRole.USER) {
      return [];
    }
    await this.ensureForUser(userId);
    return this.repo.find({
      where: { user: { id: userId } },
      order: { id: "ASC" },
    });
  }

  async moveDynamicToMain(userId: number, rawCategory: unknown, rawAmount: unknown): Promise<{
    movedAmount: string;
    categoryWallet: CategoryWallet;
    mainWalletBalance: string;
  }> {
    const category = String(rawCategory ?? "").trim().toLowerCase();
    if (!ENVELOPE_WALLET_CATEGORY_SET.has(category)) {
      throw new AppError(400, "Invalid category", "validation_error");
    }
    const cents = toCents(Number(rawAmount));
    if (!Number.isFinite(cents) || cents <= 0) {
      throw new AppError(400, "Amount must be positive", "validation_error");
    }

    return AppDataSource.transaction(async (manager) => {
      await this.ensureForUser(userId, manager);
      const walletRepo = manager.getRepository(Wallet);
      const categoryRepo = manager.getRepository(CategoryWallet);

      const mainWallet = await walletRepo
        .createQueryBuilder("wallet")
        .leftJoinAndSelect("wallet.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: userId })
        .getOne();
      if (!mainWallet) throw new AppError(404, "Main wallet not found", "not_found");

      const categoryWallet = await categoryRepo
        .createQueryBuilder("cw")
        .leftJoinAndSelect("cw.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: userId })
        .andWhere("cw.category = :category", { category })
        .getOne();
      if (!categoryWallet) throw new AppError(404, "Category wallet not found", "not_found");

      const dynamicCents = toCents(categoryWallet.dynamicBalance);
      if (dynamicCents < cents) {
        throw new AppError(400, "Insufficient dynamic envelope balance", "insufficient_balance");
      }

      const mainCents = toCents(mainWallet.totalBalance);
      categoryWallet.dynamicBalance = ((dynamicCents - cents) / 100).toFixed(2);
      mainWallet.totalBalance = ((mainCents + cents) / 100).toFixed(2);
      await categoryRepo.save(categoryWallet);
      await walletRepo.save(mainWallet);

      return {
        movedAmount: (cents / 100).toFixed(2),
        categoryWallet,
        mainWalletBalance: mainWallet.totalBalance,
      };
    });
  }

  async spendStrictToMerchant(
    userId: number,
    rawCategory: unknown,
    rawMerchantIdentifier: unknown,
    rawAmount: unknown
  ): Promise<{ spentAmount: string; categoryWallet: CategoryWallet }> {
    const category = String(rawCategory ?? "").trim().toLowerCase();
    if (!ENVELOPE_WALLET_CATEGORY_SET.has(category)) {
      throw new AppError(400, "Invalid category", "validation_error");
    }
    const merchantIdentifier = String(rawMerchantIdentifier ?? "").trim();
    if (!merchantIdentifier) {
      throw new AppError(400, "merchantIdentifier is required", "validation_error");
    }
    const cents = toCents(Number(rawAmount));
    if (!Number.isFinite(cents) || cents <= 0) {
      throw new AppError(400, "Amount must be positive", "validation_error");
    }

    return AppDataSource.transaction(async (manager) => {
      await this.ensureForUser(userId, manager);
      const userRepo = manager.getRepository(User);
      const categoryRepo = manager.getRepository(CategoryWallet);
      const walletRepo = manager.getRepository(Wallet);

      const merchant = await userRepo
        .createQueryBuilder("u")
        .where("u.role = :role", { role: UserRole.MERCHANT })
        .andWhere("(u.referenceId = :id OR lower(u.email) = :mail)", {
          id: merchantIdentifier.toUpperCase(),
          mail: merchantIdentifier.toLowerCase(),
        })
        .getOne();
      if (!merchant) {
        throw new AppError(404, "Merchant not found", "not_found");
      }
      const merchantCode = (merchant.merchantCategory ?? "").toUpperCase();
      const expectedMerchantCategoryPrefix = category.slice(0, 2).toUpperCase();
      const merchantAcceptsAnyCategory = merchantCode === "AL" || merchantCode === "ALL";
      if (!merchantAcceptsAnyCategory && merchantCode !== expectedMerchantCategoryPrefix) {
        throw new AppError(400, "Strict money can only be spent to allowed merchant category", "validation_error");
      }

      const sourceWallet = await categoryRepo
        .createQueryBuilder("cw")
        .leftJoinAndSelect("cw.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: userId })
        .andWhere("cw.category = :category", { category })
        .getOne();
      if (!sourceWallet) throw new AppError(404, "Category wallet not found", "not_found");

      const merchantWallet = await walletRepo
        .createQueryBuilder("wallet")
        .leftJoinAndSelect("wallet.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: merchant.id })
        .getOne();
      if (!merchantWallet) throw new AppError(404, "Merchant wallet not found", "not_found");

      const strictCents = toCents(sourceWallet.strictBalance);
      if (strictCents < cents) {
        throw new AppError(400, "Insufficient strict envelope balance", "insufficient_balance");
      }
      const merchantCents = toCents(merchantWallet.totalBalance);

      sourceWallet.strictBalance = ((strictCents - cents) / 100).toFixed(2);
      merchantWallet.totalBalance = ((merchantCents + cents) / 100).toFixed(2);
      await categoryRepo.save(sourceWallet);
      await walletRepo.save(merchantWallet);

      return { spentAmount: (cents / 100).toFixed(2), categoryWallet: sourceWallet };
    });
  }

  async payMerchantFromCategoryWallet(
    userId: number,
    rawMerchantId: unknown,
    rawAmount: unknown
  ): Promise<{ transfer: Transfer; spentAmount: string; category: string; remainingCategoryBalance: string }> {
    const merchantId = Number(rawMerchantId);
    if (!Number.isInteger(merchantId) || merchantId < 1) {
      throw new AppError(400, "merchantId is required", "validation_error");
    }
    const cents = toCents(Number(rawAmount));
    if (!Number.isFinite(cents) || cents <= 0) {
      throw new AppError(400, "Amount must be positive", "validation_error");
    }

    return AppDataSource.transaction(async (manager) => {
      await this.ensureForUser(userId, manager);
      const userRepo = manager.getRepository(User);
      const categoryRepo = manager.getRepository(CategoryWallet);
      const walletRepo = manager.getRepository(Wallet);
      const transferRepo = manager.getRepository(Transfer);

      const sender = await userRepo.findOne({ where: { id: userId }, select: ["id", "role"] });
      if (!sender || sender.role !== UserRole.USER) {
        throw new AppError(403, "Only simple users can use category wallet payments", "forbidden");
      }

      const merchant = await userRepo.findOne({
        where: { id: merchantId },
        select: ["id", "role", "merchantCategory"],
      });
      if (!merchant || merchant.role !== UserRole.MERCHANT) {
        throw new AppError(404, "Merchant not found", "not_found");
      }

      const walletCategory = CategoryWalletService.mapMerchantCodeToWalletCategory(merchant.merchantCategory);
      if (!walletCategory) {
        throw new AppError(400, "Merchant category is not supported for category-wallet payment", "validation_error");
      }

      const sourceWallet = await categoryRepo
        .createQueryBuilder("cw")
        .leftJoinAndSelect("cw.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: userId })
        .andWhere("cw.category = :category", { category: walletCategory })
        .getOne();
      if (!sourceWallet) {
        throw new AppError(404, "Category wallet not found", "not_found");
      }

      const merchantWallet = await walletRepo
        .createQueryBuilder("wallet")
        .leftJoinAndSelect("wallet.user", "user")
        .setLock("pessimistic_write")
        .where("user.id = :id", { id: merchant.id })
        .getOne();
      if (!merchantWallet) {
        throw new AppError(404, "Merchant wallet not found", "not_found");
      }

      const dynamicCents = toCents(sourceWallet.dynamicBalance);
      const strictCents = toCents(sourceWallet.strictBalance);
      const totalCategoryCents = dynamicCents + strictCents;
      if (totalCategoryCents < cents) {
        throw new AppError(400, "Insufficient category wallet balance", "insufficient_balance");
      }

      let remainingDebit = cents;
      let nextDynamic = dynamicCents;
      let nextStrict = strictCents;
      if (nextDynamic >= remainingDebit) {
        nextDynamic -= remainingDebit;
        remainingDebit = 0;
      } else {
        remainingDebit -= nextDynamic;
        nextDynamic = 0;
      }
      if (remainingDebit > 0) {
        nextStrict -= remainingDebit;
      }

      sourceWallet.dynamicBalance = (nextDynamic / 100).toFixed(2);
      sourceWallet.strictBalance = (nextStrict / 100).toFixed(2);

      const merchantCents = toCents(merchantWallet.totalBalance);
      merchantWallet.totalBalance = ((merchantCents + cents) / 100).toFixed(2);

      await categoryRepo.save(sourceWallet);
      await walletRepo.save(merchantWallet);

      const transfer = await transferRepo.save(
        transferRepo.create({
          sender: { id: userId },
          receiver: { id: merchant.id },
          totalAmount: (cents / 100).toFixed(2),
          occurredAt: new Date(),
          type: "local",
          status: "completed",
        } as never)
      );

      const transferId = (Array.isArray(transfer) ? transfer[0] : transfer).id;
      const savedTransfer = await manager.getRepository(Transfer).findOne({
        where: { id: transferId },
        relations: ["sender", "receiver", "envelopes"],
      });
      if (!savedTransfer) {
        throw new AppError(500, "Transfer persist failed", "persist_failed");
      }

      const remainingCategoryBalanceCents = nextDynamic + nextStrict;
      return {
        transfer: savedTransfer,
        spentAmount: (cents / 100).toFixed(2),
        category: walletCategory,
        remainingCategoryBalance: (remainingCategoryBalanceCents / 100).toFixed(2),
      };
    });
  }
}
