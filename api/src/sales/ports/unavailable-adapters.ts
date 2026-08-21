import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SalesStaffPort, SalesSubscriptionPort } from './sales-access.port';
import { SalesProductPort } from './sales-product.port';

@Injectable()
export class UnavailableSalesProductAdapter implements SalesProductPort {
  scan(): Promise<never> {
    throw new ServiceUnavailableException(
      'ShopProduct integration is not available yet',
    );
  }
  getForSale(): Promise<never> {
    throw new ServiceUnavailableException(
      'ShopProduct integration is not available yet',
    );
  }
  adjustStock(): Promise<never> {
    throw new ServiceUnavailableException(
      'ShopProduct integration is not available yet',
    );
  }
}
@Injectable()
export class UnavailableSalesStaffAdapter implements SalesStaffPort {
  assertCanManageSales(): Promise<never> {
    throw new ServiceUnavailableException(
      'Staff authorization integration is not available yet',
    );
  }
}
@Injectable()
export class UnavailableSalesSubscriptionAdapter implements SalesSubscriptionPort {
  assertSalesEnabled(): Promise<never> {
    throw new ServiceUnavailableException(
      'Subscription integration is not available yet',
    );
  }
}
