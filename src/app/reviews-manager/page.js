import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import ReviewsManagerClient from '@/components/ReviewsManagerClient';

export const metadata = {
  title: 'Reviews Manager - Thumos',
};

export default async function ReviewsManagerPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <ReviewsManagerClient />
    </div>
  );
}

