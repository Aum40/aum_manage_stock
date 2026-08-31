import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LineIdentityPort, LineIdentityResult } from './line-identity.port';

@Injectable()
export class UnavailableLineIdentityAdapter implements LineIdentityPort {
  resolve(): Promise<LineIdentityResult> {
    throw new ServiceUnavailableException(
      'LINE shop and staff identity integration is not available yet',
    );
  }

  selectShop(): Promise<{ shopId: string; shopName: string } | null> {
    throw new ServiceUnavailableException(
      'LINE shop and staff identity integration is not available yet',
    );
  }
}
