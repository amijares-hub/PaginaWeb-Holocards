import React from 'react';
import { Outlet } from 'react-router-dom';
import { StoreFooter } from './StoreFooter';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Outlet />
      </div>
      <StoreFooter />
    </div>
  );
};
