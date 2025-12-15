import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Debug: Check environment variables (without exposing secrets)
    const hasSupabaseUrl =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL;
    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasAnonKey =
      !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      !!process.env.SUPABASE_ANON_KEY;

    if (process.env.NODE_ENV === "production") {
      console.log("Supabase config check:", {
        hasSupabaseUrl,
        hasServiceRoleKey,
        hasAnonKey,
      });
    }

    // Use service role key for admin access
    let supabase;
    try {
      supabase = getSupabaseClient(true);
    } catch (clientError) {
      console.error("Failed to create Supabase client:", clientError);
      return NextResponse.json(
        {
          error: "Failed to initialize Supabase client",
          details: clientError.message,
          configCheck: { hasSupabaseUrl, hasServiceRoleKey, hasAnonKey },
        },
        { status: 500 }
      );
    }

    // Fetch all reviews (both published and unpublished)
    const { data: reviews, error } = await supabase
      .from("product_review")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch reviews",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    // Separate into published and unpublished
    const published =
      reviews?.filter((review) => review.published === true) || [];
    const unpublished =
      reviews?.filter((review) => review.published !== true) || [];

    return NextResponse.json({
      success: true,
      reviews: {
        all: reviews || [],
        published,
        unpublished,
      },
    });
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while fetching reviews",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
