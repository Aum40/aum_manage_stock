import { ForbiddenException } from '@nestjs/common';
import { ChatCommandService } from './chat-command.service';

describe('ChatCommandService', () => {
  it('checks chatbot access before parsing a command', async () => {
    const denied = new ForbiddenException(
      'Subscription does not include chatbot',
    );
    const tx = {};
    const prisma = {
      $transaction: jest.fn((callback: (value: unknown) => unknown) =>
        callback(tx),
      ),
      pendingAction: { create: jest.fn() },
    };
    const parser = { parse: jest.fn() };
    const authorization = {
      assertCanUseChatbot: jest.fn().mockRejectedValue(denied),
    };
    const service = new ChatCommandService(
      prisma as never,
      { get: jest.fn() } as never,
      {} as never,
      parser,
      { resolveProduct: jest.fn() } as never,
      authorization as never,
    );

    await expect(
      service.create({
        shopId: 'shop',
        actorId: 'staff',
        source: 'WEB',
        message: 'add coffee 1',
      }),
    ).rejects.toBe(denied);
    expect(authorization.assertCanUseChatbot).toHaveBeenCalledWith(tx, {
      shopId: 'shop',
      actorId: 'staff',
    });
    expect(parser.parse).not.toHaveBeenCalled();
    expect(prisma.pendingAction.create).not.toHaveBeenCalled();
  });
});
