import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || 'fallback-secret');
const COOKIE_NAME = 'meraki-session';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(username: string): Promise<string> {
  const token = await new SignJWT({ username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(SECRET);
  return token;
}

export async function verifySession(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { username: payload.username as string };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ username: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

const USERS: Record<string, string> = {
  paola: '1234',
  ronald: '1234',
};

export async function login(username: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
  const normalizedUser = username.toLowerCase().trim();
  const validPassword = USERS[normalizedUser];

  if (!validPassword) {
    return { success: false, error: 'Usuario no encontrado' };
  }

  if (password !== validPassword) {
    return { success: false, error: 'Contraseña incorrecta' };
  }

  const token = await createSession(username);
  return { success: true, token };
}
