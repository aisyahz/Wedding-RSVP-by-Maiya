import React from 'react';
import { Outlet } from 'react-router-dom';

export const GuestLayout: React.FC = () => {
  return (
    <div className="min-h-dvh bg-[#1E1E1C] flex items-center justify-center p-0 md:py-8 font-sans antialiased">
      <div className="relative flex min-h-dvh w-full max-w-md min-w-0 flex-col overflow-hidden bg-[#F7F5F2] text-[#1E1E1C] shadow-2xl md:h-[calc(100dvh-4rem)] md:max-h-[900px] md:min-h-[680px] md:rounded-3xl md:border md:border-[#D9D2CA]">
        <Outlet />
      </div>
    </div>
  );
};
