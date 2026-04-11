import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AppShell from '@/components/layout/AppShell';
import { UserProvider } from '@/lib/UserContext';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <UserProvider username={session.username}>
      <AppShell>{children}</AppShell>
    </UserProvider>
  );
}
