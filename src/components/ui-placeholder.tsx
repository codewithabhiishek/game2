/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, className = '', ...props }) => {
  return (
    <button
      className={`px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded transition-colors cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
