import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params in Next.js 16
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await request.json();
    const { published } = body;

    if (!id) {
      console.error("Missing review ID. Params:", resolvedParams);
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    if (typeof published !== "boolean") {
      return NextResponse.json(
        { error: "Published field must be a boolean" },
        { status: 400 }
      );
    }

    // Use service role key for admin access
    const supabase = getSupabaseClient(true);

    // Update the review - keep id as string for bigint compatibility
    // Supabase handles string-to-bigint conversion automatically
    const { data: review, error } = await supabase
      .from("product_review")
      .update({ published })
      .eq("id", String(id))
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to update review", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("Review update error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while updating review",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params in Next.js 16
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id) {
      console.error("Missing review ID. Params:", resolvedParams);
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    // Use service role key for admin access
    const supabase = getSupabaseClient(true);

    // Delete the review
    const { error } = await supabase
      .from("product_review")
      .delete()
      .eq("id", String(id));

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete review", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Review delete error:", error);
    return NextResponse.json(
      {
        error: "An error occurred while deleting review",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
