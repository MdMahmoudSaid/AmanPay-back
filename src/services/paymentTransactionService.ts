import { AppDataSource } from "../config/database";
import { AppError } from "../common/errors";
import { PaymentTransaction } from "../entities/PaymentTransaction";

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  if (typeof out.envelopeId === "number" && Number.isInteger(out.envelopeId) && out.envelopeId >= 1) {
    out.envelope = { id: out.envelopeId };
    delete out.envelopeId;
  }
  if (typeof out.partnerId === "number" && Number.isInteger(out.partnerId) && out.partnerId >= 1) {
    out.partner = { id: out.partnerId };
    delete out.partnerId;
  }
  if (out.invoiceId === null) {
    out.invoice = null;
    delete out.invoiceId;
  } else if (typeof out.invoiceId === "number" && Number.isInteger(out.invoiceId) && out.invoiceId >= 1) {
    out.invoice = { id: out.invoiceId };
    delete out.invoiceId;
  }
  return out;
}

export class PaymentTransactionService {
  private repo = AppDataSource.getRepository(PaymentTransaction);

  async findAll(): Promise<PaymentTransaction[]> {
    return this.repo.find();
  }

  async findById(id: number): Promise<PaymentTransaction | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(raw: Record<string, unknown>): Promise<PaymentTransaction> {
    const data = normalizeBody({ ...raw });
    delete data.id;
    const row = this.repo.create(data as never);
    const saved = await this.repo.save(row);
    return Array.isArray(saved) ? saved[0] : saved;
  }

  async update(id: number, raw: Record<string, unknown>): Promise<PaymentTransaction> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError(404, "Payment transaction not found", "not_found");
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
      throw new AppError(404, "Payment transaction not found", "not_found");
    }
  }
}
