import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'thumos_auth';
const AUTH_PASSWORD = 'ignitetheflamewithin';

/**
 * Check if user is authenticated by verifying the auth cookie
 */
export async function isAuthenticated() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return authCookie?.value === AUTH_PASSWORD;
}

/**
 * Set the authentication cookie
 */
export async function setAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, AUTH_PASSWORD, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days

    path: '/',
  });
}

/**
 * Remove the authentication cookie
 */
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

/**
 * Verify password and set cookie if correct
 */
export async function verifyPassword(password) {
  return password === AUTH_PASSWORD;
}

