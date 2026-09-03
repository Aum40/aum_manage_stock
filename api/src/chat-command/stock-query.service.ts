import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { StockCandidate, StockChoiceService } from './stock-choice.service';

/**
 * [อั้ม] ตอบคำถาม "ยอดคงเหลือ" — ใช้ร่วมกันทั้ง WEB และ LINE
 *
 * เป็นการอ่านล้วน จึงไม่สร้าง PendingAction และไม่ต้องให้ผู้ใช้ยืนยัน ต่างจาก
 * คำสั่งปรับสต็อกที่ต้องยืนยันทุกครั้ง
 *
 * ใช้ StockChoiceService.findCandidates() ตัวเดิมโดยตั้งใจ — มันคืน stockQty
 * มาให้อยู่แล้ว และใช้เงื่อนไขค้นหาชุดเดียวกับตอนปรับสต็อก **ผลลัพธ์จึงตรงกัน
 * เสมอ** ถ้าเขียน query ใหม่แยกต่างหาก วันหนึ่งกติกาการค้นจะเลื่อนออกจากกัน
 * แล้วผู้ใช้จะเห็น "ถามว่ามี แต่สั่งแล้วไม่เจอ"
 */
@Injectable()
export class StockQueryService {
  constructor(
    private readonly choices: StockChoiceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * @param productQuery ว่าง = ถามทั้งร้าน / มีค่า = ถามเจาะจง
   * @returns ข้อความพร้อมส่งกลับผู้ใช้ (ใช้ได้ทั้งสองช่องทาง)
   */
  async answer(shopId: string, productQuery: string): Promise<string> {
    const query = productQuery.trim();
    const { candidates, totalMatches } = await this.choices.findCandidates(
      shopId,
      query,
    );

    if (candidates.length === 0) {
      const where = await this.shopLabel(shopId);

      return query
        ? `ไม่พบสินค้าที่ตรงกับ "${query}" ${where}ครับ`
        : `${where}ยังไม่มีสินค้าในระบบครับ`;
    }

    return this.render(query, candidates, totalMatches);
  }

  /**
   * [อั้ม] ข้อความที่ตีความเป็นคำสั่งไม่ได้ — ลองมองเป็น "ชื่อสินค้า" ก่อนยอมแพ้
   *
   * คนพิมพ์ชื่อสินค้าเปล่า ๆ ("โค้ก") เพราะอยากรู้ว่าร้านมีไหม เหลือเท่าไหร่ ซึ่งเป็น
   * คำถามที่เราตอบได้อยู่แล้ว การตอบว่า "ไม่เข้าใจคำสั่ง" ทั้งที่รู้ทั้งรู้ว่าร้านนี้
   * ไม่มีสินค้าชื่อนั้น เท่ากับปิดบังคำตอบที่ผู้ใช้ต้องการจริง ๆ แล้วปล่อยให้เขา
   * พิมพ์ซ้ำเดิมไปเรื่อย ๆ
   *
   * matched = false แปลว่าไม่ใช่ชื่อสินค้าในร้าน (อาจเป็นข้อความคุยเล่น)
   * ผู้เรียกควรต่อท้ายด้วยวิธีใช้ เพื่อให้คนที่หลงทางจริง ๆ ยังได้คำแนะนำ
   */
  async answerUnknownCommand(
    shopId: string,
    message: string,
  ): Promise<{ matched: boolean; text: string }> {
    const query = message.trim();

    // ข้อความยาว ๆ ไม่ใช่ชื่อสินค้าแน่ ๆ ค้นไปก็เปลืองเปล่า
    if (!query || query.length > 60) {
      return { matched: false, text: `ไม่เข้าใจคำสั่ง "${message}" ครับ` };
    }

    const { candidates, totalMatches } = await this.choices.findCandidates(
      shopId,
      query,
    );

    if (candidates.length > 0) {
      return {
        matched: true,
        text: this.render(query, candidates, totalMatches),
      };
    }

    const where = await this.shopLabel(shopId);

    return { matched: false, text: `ไม่พบสินค้า "${query}" ${where}ครับ` };
  }

  private render(
    query: string,
    candidates: StockCandidate[],
    totalMatches: number,
  ): string {
    // เจอตัวเดียว ตอบสั้น ๆ ตรงคำถาม ไม่ต้องทำเป็นรายการ
    if (candidates.length === 1) {
      const only = candidates[0];

      return `${only.name} เหลือ ${only.stockQty} ${only.unit}ครับ`;
    }

    const header = query
      ? `พบ ${candidates.length} รายการที่ตรงกับ "${query}" ครับ`
      : `สินค้าในร้านมี ${candidates.length} รายการครับ`;

    const lines = candidates.map(
      (item) => `• ${item.name} — เหลือ ${item.stockQty} ${item.unit}`,
    );

    // findCandidates ตัดผลลัพธ์ไว้ที่ CANDIDATE_FETCH_LIMIT ถ้าของจริงมากกว่านั้น
    // ต้องบอกด้วย ไม่งั้นผู้ใช้จะเข้าใจว่าร้านมีแค่เท่าที่เห็น
    const more =
      totalMatches > candidates.length
        ? [`(แสดง ${candidates.length} จากทั้งหมด ${totalMatches} รายการ)`]
        : [];

    return [header, '', ...lines, ...more].join('\n');
  }

  /**
   * บอกชื่อร้านไปด้วยตอนหาไม่เจอ — บน LINE ผู้ใช้เพิ่งเลือกร้านจากเมนูตัวเลข
   * ถ้าตอบแค่ "ไม่พบในร้านนี้" เขาจะไม่รู้ว่าระบบไปดูร้านไหนให้
   */
  private async shopLabel(shopId: string): Promise<string> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true },
    });

    return shop ? `ในร้าน ${shop.name} ` : 'ในร้านนี้';
  }
}
