import { PrismaClientKnownRequestError } from '@/database/generated/prisma/internal/prismaNamespace';

/**
 * Prisma reports a unique index collision as P2002. Categories rely on this to
 * turn a duplicate name within one owner (uq_category_owner_name) into a 409
 * instead of letting it surface as an unhandled 500.
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  if (
    error instanceof PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return true;
  }

  const pgCode = (error as { cause?: { code?: string } })?.cause?.code;
  return pgCode === '23505';
}
