import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { MerchantCategory } from "../entities/MerchantCategory";

export type CreateMerchantCategoryInput = {
  code: string;
  displayName: string;
  isActive?: boolean;
};

export type UpdateMerchantCategoryInput = {
  code?: string;
  displayName?: string;
  isActive?: boolean;
};

export class MerchantCategoriesService {
  private repo = AppDataSource.getRepository(MerchantCategory);

  async findAll(): Promise<MerchantCategory[]> {
    return this.repo.find({ order: { code: "ASC" } });
  }

  async create(input: CreateMerchantCategoryInput): Promise<MerchantCategory> {
    const code = input.code.trim().toUpperCase();
    if (code.length < 2 || code.length > 32) {
      throw new AppError(400, "Invalid category code", "validation_error");
    }
    const exists = await this.repo.findOne({ where: { code } });
    if (exists) {
      throw new AppError(409, "Category code already exists", "category_code_taken");
    }
    const created = this.repo.create({
      code,
      displayName: input.displayName.trim(),
      isActive: input.isActive ?? true,
    });
    return this.repo.save(created);
  }

  async update(id: number, input: UpdateMerchantCategoryInput): Promise<MerchantCategory> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) {
      throw new AppError(404, "Category not found", "not_found");
    }
    if (input.code !== undefined) {
      const code = input.code.trim().toUpperCase();
      if (code.length < 2 || code.length > 32) {
        throw new AppError(400, "Invalid category code", "validation_error");
      }
      const taken = await this.repo.findOne({ where: { code } });
      if (taken && taken.id !== id) {
        throw new AppError(409, "Category code already exists", "category_code_taken");
      }
      existing.code = code;
    }
    if (input.displayName !== undefined) {
      existing.displayName = input.displayName.trim();
    }
    if (input.isActive !== undefined) {
      existing.isActive = input.isActive;
    }
    return this.repo.save(existing);
  }
}
