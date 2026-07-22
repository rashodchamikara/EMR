import { Injectable } from '@nestjs/common';
import {
  hashPassword,
  verifyPassword,
} from '../../common/security/password-hashing';
@Injectable()
export class PasswordService {
  private readonly dummyHashPromise = hashPassword(
    'This-is-not-a-real-user-password',
  );
  hash(password: string): Promise<string> {
    return hashPassword(password);
  }
  async verify(
    passwordHash: string | null,
    password: string,
  ): Promise<boolean> {
    const hashToVerify = passwordHash ?? (await this.dummyHashPromise);
    return verifyPassword(hashToVerify, password);
  }
}
