import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LineIdentityPort } from './line-identity.port';

@Injectable()
export class UnavailableLineIdentityAdapter implements LineIdentityPort {
  resolve(): Promise<{ shopId: string; actorId?: string; message: string }> {
    throw new ServiceUnavailableException(
      'LINE shop and staff identity integration is not available yet',
    );
  }
}
