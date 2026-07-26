import React from 'react';
import { Outlet } from 'react-router-dom';

export const GuestLayout: React.FC = () => {
  return (
    <div className="min-h-dvh bg-[#1E1E1C] flex items-center justify-center p-0 md:py-8 font-sans antialiased">
      <div className="w-full max-w-md min-w-0 min-h-dvh md:min-h-[760px] bg-[#F7F5F2] text-[#1E1E1C] shadow-2xl md:rounded-2xl md:border md:border-[#D9D2CA] overflow-x-clip relative flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Outlet />
      </div>
    </div>
  );
};
