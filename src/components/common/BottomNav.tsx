import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Mail, Users, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const items = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/invitations', label: 'Invitations', icon: Mail },
    { path: '/rsvp', label: 'RSVP', icon: Users },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav aria-label="Navigasi pentadbir" className="z-40 flex shrink-0 items-center justify-around border-t border-system bg-white/95 px-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-sm backdrop-blur-md min-[360px]:px-3 md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex min-w-0 min-h-11 flex-col items-center justify-center flex-1 py-1 px-1 min-[360px]:px-2 rounded-xl transition-all ${
              isActive ? 'text-accent font-semibold' : 'text-secondary hover:text-primary'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-all ${
                isActive ? 'bg-[#EFE7DF]' : 'bg-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-caption leading-tight tracking-tight mt-0.5 font-sans">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
