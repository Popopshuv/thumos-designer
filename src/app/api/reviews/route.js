import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role key for admin access
    const supabase = await getSupabaseClient(true);

    // Fetch all reviews (both published and unpublished)
    const { data: reviews, error } = await supabase
      .from('product_review')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews', details: error.message },
        { status: 500 }
      );
    }

    // Separate into published and unpublished
    const published = reviews?.filter(review => review.published === true) || [];
    const unpublished = reviews?.filter(review => review.published !== true) || [];

    return NextResponse.json({
      success: true,
      reviews: {
        all: reviews || [],
        published,
        unpublished,
      },
    });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching reviews', details: error.message },
      { status: 500 }
    );
  }
}

