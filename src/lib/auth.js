import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "thumos_auth";
// Use server-side only env var (not NEXT_PUBLIC_*) for security
// Trim whitespace in case there's accidental spaces in the env var
const AUTH_PASSWORD = process.env.AUTH_PASSWORD?.trim();

if (!AUTH_PASSWORD) {
  // Log helpful error for debugging
  console.error("AUTH_PASSWORD environment variable is not set");
  throw new Error(
    "AUTH_PASSWORD environment variable is required. Please set it in your Vercel environment variables."
  );
}

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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days

    path: "/",
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
  // Trim both to handle any whitespace issues
  const trimmedPassword = String(password || "").trim();
  const trimmedAuthPassword = String(AUTH_PASSWORD || "").trim();

  // Debug in production (check Vercel logs)
  if (process.env.NODE_ENV === "production") {
    console.log("Password verification:", {
      providedLength: trimmedPassword.length,
      expectedLength: trimmedAuthPassword.length,
      match: trimmedPassword === trimmedAuthPassword,
    });
  }

  return trimmedPassword === trimmedAuthPassword;
}
