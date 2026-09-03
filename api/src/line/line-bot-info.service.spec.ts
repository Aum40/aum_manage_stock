import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';

import { LineBotInfoService } from './line-bot-info.service';

const getBotInfo = jest.fn();

jest.mock('@line/bot-sdk', () => ({
  messagingApi: {
    MessagingApiClient: jest.fn().mockImplementation(() => ({
      getBotInfo: () => getBotInfo() as unknown,
    })),
  },
}));

function build(token: string | undefined) {
  const config = {
    get: jest.fn().mockReturnValue(token),
  } as unknown as ConfigService;

  return new LineBotInfoService(config);
}

describe('LineBotInfoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBotInfo.mockResolvedValue({
      basicId: '@213lduey',
      displayName: 'Aum_manage_stock',
    });
  });

  /**
   * "@" ต้องถูก encode เป็น %40 — พลาดตรงนี้แล้วลิงก์เพิ่มเพื่อนพังในบางเบราว์เซอร์
   * ซึ่งเป็นความพังที่เห็นยาก เพราะบนเครื่องที่มันทำงานได้ก็ดูปกติทุกอย่าง
   */
  it('ประกอบลิงก์เพิ่มเพื่อนโดย encode @ เป็น %40', async () => {
    const invite = await build('token').getInvite();

    expect(invite.addFriendUrl).toBe('https://line.me/R/ti/p/%40213lduey');
    expect(invite.basicId).toBe('@213lduey');
    expect(invite.displayName).toBe('Aum_manage_stock');
  });

  it('สร้าง QR เป็น data URL พร้อมใส่ <img>', async () => {
    const invite = await build('token').getInvite();

    expect(invite.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(
      true,
    );
  });

  it('เรียกซ้ำต้องไม่ยิง LINE API ใหม่', async () => {
    const service = build('token');

    const first = await service.getInvite();
    const second = await service.getInvite();

    expect(getBotInfo).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('ยังไม่ได้ตั้ง token — ปฏิเสธไปเลยแทนที่จะคืนของว่าง', async () => {
    await expect(build(undefined).getInvite()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(messagingApi.MessagingApiClient).not.toHaveBeenCalled();
  });

  it('LINE ล่ม — แปลงเป็นข้อความไทยที่ผู้ใช้อ่านรู้เรื่อง', async () => {
    getBotInfo.mockRejectedValue(new Error('boom'));

    await expect(build('token').getInvite()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
