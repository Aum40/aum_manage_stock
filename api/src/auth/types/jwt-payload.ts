import { UserRole } from '@/database/generated/prisma/enums';

export type AccessTokenPayload = {
  sub: string;
  role: UserRole;
  ownerId: string | null;
};
