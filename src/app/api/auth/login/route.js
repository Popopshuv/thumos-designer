import { NextResponse } from "next/server";
import { verifyPassword, setAuthCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    // Debug logging (in production, check Vercel logs)
    if (process.env.NODE_ENV === "production") {
      console.log(
        "Login attempt - AUTH_PASSWORD env var is set:",
        !!process.env.AUTH_PASSWORD
      );
      console.log("Login attempt - Password length:", password?.length);
    }

    const isValid = await verifyPassword(password);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    await setAuthCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
