export const LINE_IDENTITY_PORT = Symbol('LINE_IDENTITY_PORT');

export interface LineIdentityPort {
  resolve(input: {
    destination: string;
    lineUserId: string;
  }): Promise<{ shopId: string; actorId?: string }>;
}
