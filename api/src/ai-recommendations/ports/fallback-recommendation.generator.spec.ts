import { FallbackRecommendationGenerator } from './fallback-recommendation.generator';
import type { LlmRecommendationGenerator } from './llm-recommendation.generator';
import { RuleBasedRecommendationGenerator } from './rule-based-recommendation.generator';
import type { ShopMetric } from './recommendation-generator.port';

const lowStock: ShopMetric = {
  shopProductId: 'sp1',
  productName: 'โค้ก 325ml',
  unit: 'กระป๋อง',
  stockQty: 3,
  lowStockThreshold: 10,
  soldLast30Days: 48,
  daysSinceLastSale: 2,
};

const stale: ShopMetric = {
  shopProductId: 'sp2',
  productName: 'ขนมค้างสต็อก',
  unit: 'ถุง',
  stockQty: 40,
  lowStockThreshold: 5,
  soldLast30Days: 0,
  daysSinceLastSale: null,
};

const healthy: ShopMetric = {
  shopProductId: 'sp3',
  productName: 'น้ำเปล่า',
  unit: 'ขวด',
  stockQty: 100,
  lowStockThreshold: 10,
  soldLast30Days: 20,
  daysSinceLastSale: 1,
};

describe('FallbackRecommendationGenerator', () => {
  let llm: { isEnabled: jest.Mock; generate: jest.Mock };
  let ruleBased: RuleBasedRecommendationGenerator;
  let generator: FallbackRecommendationGenerator;

  beforeEach(() => {
    llm = { isEnabled: jest.fn().mockReturnValue(true), generate: jest.fn() };
    ruleBased = new RuleBasedRecommendationGenerator();
    generator = new FallbackRecommendationGenerator(
      llm as unknown as LlmRecommendationGenerator,
      ruleBased,
    );
  });

  it('ใช้ผลจาก LLM เมื่อ LLM ทำงานสำเร็จ', async () => {
    llm.generate.mockResolvedValue([
      {
        type: 'RESTOCK',
        productName: 'โค้ก 325ml',
        title: 'จาก LLM',
        content: 'ข้อความจาก LLM',
      },
    ]);

    const result = await generator.generate([lowStock]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('จาก LLM');
  });

  it('ข้าม LLM ไปใช้กฎเมื่อยังไม่ได้ตั้งค่า env', async () => {
    llm.isEnabled.mockReturnValue(false);

    const result = await generator.generate([lowStock]);

    expect(llm.generate).not.toHaveBeenCalled();
    expect(result[0].type).toBe('RESTOCK');
  });

  it('ตกไปใช้กฎเมื่อ LLM ล้ม (โควตาหมด/เน็ตล่ม)', async () => {
    llm.generate.mockRejectedValue(new Error('ollama unreachable'));

    const result = await generator.generate([lowStock]);

    expect(result[0].type).toBe('RESTOCK');
    expect(result[0].content).toContain('48');
  });

  it('ตกไปใช้กฎเมื่อ LLM คืน array ว่าง ทั้งที่มีของใกล้หมด', async () => {
    llm.generate.mockResolvedValue([]);

    const result = await generator.generate([lowStock]);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('RESTOCK');
  });
});

describe('RuleBasedRecommendationGenerator', () => {
  const generator = new RuleBasedRecommendationGenerator();

  it('สต็อกต่ำกว่าจุดแจ้งเตือน → RESTOCK พร้อมอ้างตัวเลขจริง', async () => {
    const [rec] = await generator.generate([lowStock]);

    expect(rec.type).toBe('RESTOCK');
    expect(rec.content).toContain('3');
    expect(rec.content).toContain('48');
  });

  it('ไม่เคยขายเลยแต่มีสต็อกค้าง → CLEARANCE', async () => {
    const [rec] = await generator.generate([stale]);

    expect(rec.type).toBe('CLEARANCE');
    expect(rec.content).toContain('ยังไม่เคยขาย');
  });

  it('สินค้าปกติไม่มีประเด็น → ไม่แนะนำอะไร', async () => {
    await expect(generator.generate([healthy])).resolves.toEqual([]);
  });

  it('สต็อกหมดเกลี้ยง (0) ถือว่าต้องเติม ไม่ใช่ต้องระบาย', async () => {
    const [rec] = await generator.generate([
      { ...stale, stockQty: 0, lowStockThreshold: 5 },
    ]);

    expect(rec.type).toBe('RESTOCK');
  });
});
