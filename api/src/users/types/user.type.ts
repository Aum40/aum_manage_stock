import { UserRole } from '@/database/generated/prisma/enums';

export type UserCreateInput = {
  firstName: string;
  lastName: string;
  email?: string;
  username?: string;
  password: string;
  role: UserRole;
  ownerId?: string;
};
