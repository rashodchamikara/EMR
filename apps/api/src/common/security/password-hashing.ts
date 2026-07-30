import { argon2id, hash, verify } from 'argon2';

const argonOptions = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  const result: unknown = await hash(password, argonOptions);

  if (typeof result !== 'string') {
    throw new TypeError('Argon2 hash operation returned an invalid result');
  }

  return result;
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  const result: unknown = await verify(passwordHash, password);

  if (typeof result !== 'boolean') {
    throw new TypeError('Argon2 verify operation returned an invalid result');
  }

  return result;
}
