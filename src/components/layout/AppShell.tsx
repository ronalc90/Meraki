'use client';

import { useState } from 'react';
import SidebarNav from './SidebarNav';
import MobileNav from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <SidebarNav collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/* Main content area — offset by sidebar width on desktop */}
      <main
        className={`
          transition-all duration-300 ease-in-out
          ${collapsed ? 'md:ml-16' : 'md:ml-64'}
        `}
      >
        <div className="min-h-screen p-4 md:p-6 lg:p-8 mobile-nav-padding">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
