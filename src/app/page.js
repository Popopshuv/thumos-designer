import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import PasswordProtection from '@/components/PasswordProtection';
import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export default async function Home() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <PasswordProtection />;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-12">
          <h1 className="text-6xl font-bold">thumos</h1>
          <LogoutButton />
        </div>
        
        <nav className="space-y-4">
          <Link 
            href="/design-system"
            className="block text-2xl hover:text-gray-400 transition-colors"
          >
            → Design System
          </Link>
          <Link 
            href="/reviews-manager"
            className="block text-2xl hover:text-gray-400 transition-colors"
          >
            → Reviews Manager
          </Link>
        </nav>
      </div>
    </div>
  );
}
