import { AppDataSource } from "../config/database";
import { Wallet } from "../entities/Wallet";
import { CategoryWallet } from "../entities/CategoryWallet";
import { Transfer } from "../entities/Transfer";

type AssistantInput = {
  userId: number;
  prompt?: string;
  language?: string;
};

type RecommendationResult = {
  summary: string;
  recommendations: string[];
  usedModel: boolean;
};

function asNumber(value: string | number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildFallback(
  language: string,
  mainBalance: number,
  totalEnvelope: number,
  strictEnvelope: number,
  dynamicEnvelope: number,
  monthlySpent: number,
  topCategory: string | null
): RecommendationResult {
  const ar = language.startsWith("ar");
  const summary = ar
    ? `الرصيد الرئيسي ${mainBalance.toFixed(2)} USD. رصيد المغلفات ${totalEnvelope.toFixed(2)} USD (صارم ${strictEnvelope.toFixed(2)} / مرن ${dynamicEnvelope.toFixed(2)}).`
    : `Main balance is ${mainBalance.toFixed(2)} USD. Envelope balance is ${totalEnvelope.toFixed(2)} USD (strict ${strictEnvelope.toFixed(2)} / flexible ${dynamicEnvelope.toFixed(2)}).`;
  const recommendations = ar
    ? [
        monthlySpent > mainBalance
          ? "المصروف الشهري أعلى من الرصيد الرئيسي الحالي؛ خفّض التحويلات الكبيرة هذا الأسبوع."
          : "المصروف الشهري ضمن الحدود المناسبة مقارنة بالرصيد الحالي.",
        dynamicEnvelope > 0
          ? "انقل جزءاً من الرصيد المرن إلى المحفظة الرئيسية لتغطية المدفوعات العاجلة."
          : "لا يوجد رصيد مرن متاح الآن؛ ركّز على إدارة الرصيد الرئيسي.",
        topCategory
          ? `أعلى فئة إنفاق لديك حالياً: ${topCategory}. راقبها لتفادي استنزاف مبكر.`
          : "ابدأ بتوزيع المبالغ على الفئات لتسهيل المتابعة والتحكم.",
      ]
    : [
        monthlySpent > mainBalance
          ? "Your monthly outgoing total is higher than current main balance; avoid large transfers this week."
          : "Your monthly spending is currently within a healthy range versus main balance.",
        dynamicEnvelope > 0
          ? "Move part of flexible envelope funds to main wallet for urgent payments."
          : "No flexible envelope funds available now; prioritize managing main wallet liquidity.",
        topCategory
          ? `Your top spending category is ${topCategory}. Monitor it to avoid early depletion.`
          : "Start allocating money by category to improve control and visibility.",
      ];
  return { summary, recommendations, usedModel: false };
}

export class AssistantService {
  async recommend(input: AssistantInput): Promise<RecommendationResult> {
    const language = (input.language ?? "en").toLowerCase();
    const walletRepo = AppDataSource.getRepository(Wallet);
    const categoryRepo = AppDataSource.getRepository(CategoryWallet);
    const transferRepo = AppDataSource.getRepository(Transfer);

    const wallet = await walletRepo.findOne({ where: { user: { id: input.userId } }, relations: ["user"] });
    const categoryWallets = await categoryRepo.find({ where: { user: { id: input.userId } } });
    const transfers = await transferRepo.find({
      where: [{ sender: { id: input.userId } }, { receiver: { id: input.userId } }],
      relations: ["sender", "receiver", "envelopes"],
      order: { occurredAt: "DESC", id: "DESC" },
      take: 60,
    });

    const mainBalance = asNumber(wallet?.totalBalance);
    const strictEnvelope = categoryWallets.reduce((sum, w) => sum + asNumber(w.strictBalance), 0);
    const dynamicEnvelope = categoryWallets.reduce((sum, w) => sum + asNumber(w.dynamicBalance), 0);
    const totalEnvelope = strictEnvelope + dynamicEnvelope;

    const now = new Date();
    const currentMonth = monthKey(now);
    let monthlySpent = 0;
    const categorySpend = new Map<string, number>();
    for (const t of transfers) {
      const tDate = new Date(t.occurredAt);
      if (monthKey(tDate) !== currentMonth) continue;
      const senderId = Number(t.sender?.id ?? 0);
      if (senderId === input.userId) {
        const amount = asNumber(t.totalAmount);
        monthlySpent += amount;
        for (const env of t.envelopes ?? []) {
          const prev = categorySpend.get(env.type) ?? 0;
          categorySpend.set(env.type, prev + asNumber(env.amount));
        }
      }
    }
    const topCategory =
      [...categorySpend.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]?.replaceAll("_", " ")?.toLowerCase() ?? null;

    const fallback = buildFallback(
      language,
      mainBalance,
      totalEnvelope,
      strictEnvelope,
      dynamicEnvelope,
      monthlySpent,
      topCategory
    );

    const groqToken = process.env.GROQ_API_KEY?.trim();
    const groqModel = process.env.ASSISTANT_GROQ_MODEL?.trim() || "llama-3.1-8b-instant";
    if (!groqToken) return fallback;

    try {
      const systemPrompt =
        language.startsWith("ar")
          ? "أنت مساعد مالي داخل AmanPay. أعطِ 3 توصيات قصيرة وعملية بناءً على بيانات الحساب فقط. لا تتحدث عن مستخدمين آخرين. لا تنفذ عمليات مالية."
          : "You are a financial assistant inside AmanPay. Provide 3 short actionable recommendations using this account data only. Do not mention other users. Do not execute transfers.";
      const userPrompt = JSON.stringify(
        {
          accountSnapshot: {
            mainBalance,
            totalEnvelope,
            strictEnvelope,
            dynamicEnvelope,
            monthlySpent,
            topCategory,
            recentTransfersCount: transfers.length,
          },
          userQuestion: input.prompt ?? null,
        },
        null,
        2
      );

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: groqModel,
          temperature: 0.3,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!response.ok) return fallback;
      const parsed = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = parsed.choices?.[0]?.message?.content ?? "";
      if (!content.trim()) return fallback;

      const lines = content
        .split("\n")
        .map((l) => l.replace(/^[\s\-*\d\.\)\(]+/, "").trim())
        .filter(Boolean);
      const summary = lines[0] ?? fallback.summary;
      const recommendations = lines.slice(1, 4);
      return {
        summary,
        recommendations: recommendations.length ? recommendations : fallback.recommendations,
        usedModel: true,
      };
    } catch {
      return fallback;
    }
  }
}
