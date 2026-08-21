import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LineIdentityPort } from './line-identity.port';

@Injectable()
export class UnavailableLineIdentityAdapter implements LineIdentityPort {
  resolve(): Promise<{ shopId: string; actorId?: string }> {
    // TODO(line/staff): map LINE destination/user IDs after channel ownership and
    // staff identity models are available. Deliberately fail closed meanwhile.
    throw new ServiceUnavailableException(
      'LINE shop and staff identity integration is not available yet',
    );
  }
}
