import { sign, verify } from 'jsonwebtoken';

export function signToken(payload: object) {
  return sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

export function verifyToken(token: string) {
  return verify(token, process.env.JWT_SECRET!);
}
