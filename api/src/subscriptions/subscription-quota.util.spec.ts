import {
  addMonths,
  calculateShopQuota,
  isSubscriptionReadOnly,
} from './subscription-quota.util';

describe('calculateShopQuota', () => {
  it('allows creating a shop on Free Plan with quota remaining', () => {
    const result = calculateShopQuota({
      status: 'ACTIVE',
      includedShopQuota: 1,
      usedShopCount: 0,
    });

    expect(result).toEqual({
      allowed: 1,
      used: 0,
      remaining: 1,
      canCreateShop: true,
    });
  });

  it('blocks creating a shop once Free Plan quota is used up', () => {
    const result = calculateShopQuota({
      status: 'ACTIVE',
      includedShopQuota: 1,
      usedShopCount: 1,
    });

    expect(result.remaining).toBe(0);
    expect(result.canCreateShop).toBe(false);
  });

  it('uses the plan quota as-is — no separate extra-quota purchase per SRS', () => {
    const result = calculateShopQuota({
      status: 'ACTIVE',
      includedShopQuota: 3,
      usedShopCount: 3,
    });

    expect(result.allowed).toBe(3);
    expect(result.remaining).toBe(0);
    expect(result.canCreateShop).toBe(false);
  });

  it('blocks shop creation when the subscription is EXPIRED, even with quota remaining', () => {
    const result = calculateShopQuota({
      status: 'EXPIRED',
      includedShopQuota: 3,
      usedShopCount: 1,
    });

    expect(result.remaining).toBe(2);
    expect(result.canCreateShop).toBe(false);
  });

  it('blocks shop creation when the subscription is CANCELLED', () => {
    const result = calculateShopQuota({
      status: 'CANCELLED',
      includedShopQuota: 3,
      usedShopCount: 0,
    });

    expect(result.canCreateShop).toBe(false);
  });
});

describe('isSubscriptionReadOnly', () => {
  it('never marks a Free Plan (expires_at = null) as read-only', () => {
    expect(isSubscriptionReadOnly({ status: 'ACTIVE', expiresAt: null })).toBe(
      false,
    );

    // Defensive: even if status is somehow inconsistent, expires_at = null still wins.
    expect(isSubscriptionReadOnly({ status: 'EXPIRED', expiresAt: null })).toBe(
      false,
    );
  });

  it('is not read-only while ACTIVE and before expiry', () => {
    const now = new Date('2026-08-18T00:00:00Z');
    const expiresAt = new Date('2026-09-01T00:00:00Z');

    expect(isSubscriptionReadOnly({ status: 'ACTIVE', expiresAt, now })).toBe(
      false,
    );
  });

  it('becomes read-only once expires_at has passed, even if status has not been updated yet', () => {
    const now = new Date('2026-08-18T00:00:00Z');
    const expiresAt = new Date('2026-08-01T00:00:00Z');

    expect(isSubscriptionReadOnly({ status: 'ACTIVE', expiresAt, now })).toBe(
      true,
    );
  });

  it('treats expires_at exactly at now as already read-only', () => {
    const now = new Date('2026-08-18T00:00:00Z');

    expect(
      isSubscriptionReadOnly({ status: 'ACTIVE', expiresAt: now, now }),
    ).toBe(true);
  });

  it('is read-only immediately when CANCELLED, even before expires_at', () => {
    const now = new Date('2026-08-18T00:00:00Z');
    const expiresAt = new Date('2026-09-01T00:00:00Z');

    expect(
      isSubscriptionReadOnly({ status: 'CANCELLED', expiresAt, now }),
    ).toBe(true);
  });
});

describe('addMonths', () => {
  it('adds the given number of months', () => {
    const result = addMonths(new Date('2026-08-18T00:00:00Z'), 12);

    expect(result.toISOString()).toBe('2027-08-18T00:00:00.000Z');
  });

  it('rolls over into the next year when needed', () => {
    const result = addMonths(new Date('2026-11-01T00:00:00Z'), 3);

    expect(result.getUTCFullYear()).toBe(2027);
    expect(result.getUTCMonth()).toBe(1); // February (0-indexed)
  });
});
