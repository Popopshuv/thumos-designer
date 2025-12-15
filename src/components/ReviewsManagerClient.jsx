'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoutButton from './LogoutButton';

export default function ReviewsManagerClient() {
  const [reviews, setReviews] = useState({ published: [], unpublished: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(new Set());

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reviews');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reviews');
      }

      setReviews({
        published: data.reviews.published || [],
        unpublished: data.reviews.unpublished || [],
      });
      setError('');
    } catch (err) {
      setError(err.message);
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (reviewId, currentPublished) => {
    if (updating.has(reviewId)) return;

    setUpdating(prev => new Set(prev).add(reviewId));

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: !currentPublished }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update review');
      }

      // Refresh reviews after update
      await fetchReviews();
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error('Error updating review:', err);
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  const deleteReview = async (reviewId) => {
    if (updating.has(reviewId)) return;

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    setUpdating(prev => new Set(prev).add(reviewId));

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete review');
      }

      // Refresh reviews after deletion
      await fetchReviews();
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error('Error deleting review:', err);
    } finally {
      setUpdating(prev => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ReviewCard = ({ review }) => {
    const isUpdating = updating.has(review.id);
    const hasImages = review.images && review.images.length > 0;

    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">{review.title}</h3>
            <p className="text-gray-400 mb-3">{review.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                {review.rating}/5
              </span>
              <span>{formatDate(review.created_at)}</span>
              {review.customer?.name && (
                <span>By {review.customer.name}</span>
              )}
              {review.productHandle && (
                <span className="text-gray-600">Product: {review.productHandle}</span>
              )}
            </div>

            {hasImages && (
              <div className="flex gap-2 mb-4 flex-wrap">
                {review.images.map((imageUrl, idx) => (
                  <img
                    key={idx}
                    src={imageUrl}
                    alt={`Review image ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded border border-gray-700"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => togglePublish(review.id, review.published)}
            disabled={isUpdating}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              review.published
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isUpdating
              ? 'Updating...'
              : review.published
              ? 'Unpublish'
              : 'Publish'}
          </button>
          <button
            onClick={() => deleteReview(review.id)}
            disabled={isUpdating}
            className="px-4 py-2 rounded font-medium transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading reviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button
            onClick={fetchReviews}
            className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <Link href="/" className="text-gray-400 hover:text-white inline-block">
            ← Back to Home
          </Link>
          <LogoutButton />
        </div>
        <h1 className="text-4xl font-bold mb-2">Reviews Manager</h1>
        <p className="text-gray-400">
          {reviews.unpublished.length} unpublished • {reviews.published.length} published
        </p>
      </div>

      {/* Unpublished Reviews */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-yellow-400">
          Unpublished ({reviews.unpublished.length})
        </h2>
        {reviews.unpublished.length === 0 ? (
          <p className="text-gray-500">No unpublished reviews</p>
        ) : (
          reviews.unpublished.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </section>

      {/* Published Reviews */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-green-400">
          Published ({reviews.published.length})
        </h2>
        {reviews.published.length === 0 ? (
          <p className="text-gray-500">No published reviews</p>
        ) : (
          reviews.published.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </section>
    </div>
  );
}

