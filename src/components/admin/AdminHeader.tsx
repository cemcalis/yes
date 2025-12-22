'use client';

import { useState } from 'react';
import { HiMenu, HiBell, HiUser } from 'react-icons/hi';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const [notifications] = useState(3); // This would come from your notification system

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <HiMenu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <HiBell className="w-6 h-6" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div className="relative">
            <button className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:bg-gray-100">
              <HiUser className="w-6 h-6" />
              <span className="text-sm font-medium">Admin</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
