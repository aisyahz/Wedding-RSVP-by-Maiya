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
    <nav className="md:hidden sticky bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D9D2CA] px-3 py-2 flex items-center justify-around shadow-sm">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all ${
              isActive ? 'text-[#9B7B63] font-semibold' : 'text-[#77736D] hover:text-[#1E1E1C]'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg transition-all ${
                isActive ? 'bg-[#EFE7DF]' : 'bg-transparent'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 font-sans">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
