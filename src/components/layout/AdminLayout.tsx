import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Mail, Users, Settings, LogOut, Sparkles } from 'lucide-react';
import { BottomNav } from '../common/BottomNav';
import { SiteCredit } from '../common/SiteCredit';

interface AdminLayoutProps {
  onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onLogout }) => {
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/invitations', label: 'Invitations', icon: Mail },
    { path: '/rsvp', label: 'RSVP Management', icon: Users },
    { path: '/settings', label: 'Brand Settings', icon: Settings },
  ];

  const handleLogoutClick = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh bg-app text-primary flex flex-col md:flex-row w-full font-sans antialiased">
      {/* Desktop Sidebar (Linear / Apple / Framer inspired dark contrast shell) */}
      <aside className="hidden md:flex md:w-64 bg-[#24211F] text-[#F7F5F2] flex-col justify-between p-6 shrink-0 sticky top-0 h-dvh shadow-xl border-r border-system/10">
        <div className="space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <img
              src="/logo-rsvp.png"
              alt="Digital Card by Maiya"
              className="h-10 w-10 rounded-xl border border-white/15 bg-white object-contain shadow-sm"
            />
            <div>
              <h1 className="text-title leading-tight text-white tracking-tight">
                Digital Card
              </h1>
              <p className="text-caption text-secondary uppercase tracking-widest font-semibold">
                by Maiya
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#9B7B63] text-white shadow-sm'
                        : 'text-secondary hover:bg-[#1E1E1C] hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout Button */}
        <div className="pt-6 border-t border-system/10 space-y-3">
          <div className="flex items-center space-x-3 px-1">
            <div className="w-8 h-8 rounded-full bg-[#9B7B63]/20 text-accent font-bold flex items-center justify-center text-xs">
              M
            </div>
            <div className="text-xs truncate">
              <p className="font-bold text-white">Maiya Admin</p>
              <p className="text-caption text-secondary">Supabase authenticated</p>
            </div>
          </div>

          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-950/30 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-dvh w-full overflow-x-clip">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-system shadow-2xs">
          <div>
            <h2 className="text-heading-3 text-primary tracking-tight">
              Creator Studio
            </h2>
            <p className="text-xs text-secondary font-medium">
              Digital Card by Maiya Admin System
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-[#EFE7DF] text-accent text-xs font-semibold border border-system">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Pro Version</span>
            </span>
            <div className="w-8 h-8 rounded-full bg-[#1E1E1C] text-white font-bold flex items-center justify-center text-xs">
              M
            </div>
          </div>
        </header>

        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-[#24211F] text-white sticky top-0 z-30 shadow-sm border-b border-system/10">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo-rsvp.png"
              alt="Digital Card by Maiya"
              className="h-8 w-8 rounded-lg border border-white/15 bg-white object-contain"
            />
            <span className="font-title font-bold text-sm tracking-wide text-white">
              Digital Card <span className="text-caption text-secondary uppercase font-sans font-normal">by Maiya</span>
            </span>
          </div>

          <button
            onClick={handleLogoutClick}
            className="p-1.5 text-secondary hover:text-white cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto p-3 min-[360px]:p-4 md:p-8 flex flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <Outlet />
          <footer className="mt-auto pt-8">
            <SiteCredit />
          </footer>
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </div>
  );
};
