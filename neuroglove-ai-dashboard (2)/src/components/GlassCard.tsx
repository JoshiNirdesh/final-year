/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
}

export function GlassCard({ children, className = '', title, icon }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 backdrop-blur-xl transition-all hover:border-[var(--accent-cyan)]/50 ${className}`}
    >
      {title && (
        <div className="mb-4 flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-[var(--accent-cyan)]" />
          <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent-cyan)]">
            {title}
          </h3>
          {icon && <span className="ml-auto text-[var(--accent-cyan)] opacity-50">{icon}</span>}
        </div>
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
