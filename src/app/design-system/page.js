import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Link from 'next/link';
import ClientOnlyThreeScene from '@/components/ThreeScene/ClientOnly';

export const metadata = {
  title: 'Design System - Thumos',
};

export default async function DesignSystemPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed top-0 left-0 right-0 z-10 p-8">
        <Link href="/" className="text-gray-400 hover:text-white mb-4 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-4xl font-bold">Design System</h1>
      </div>
      <div className="fixed inset-0 w-screen h-screen">
        <ClientOnlyThreeScene />
      </div>
    </div>
  );
}

