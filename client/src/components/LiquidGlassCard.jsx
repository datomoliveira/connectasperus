import React from 'react';

export default function LiquidGlassCard({
  children,
  className = '',
  sheen = true,
  glow = false,
  as: Component = 'div',
  ...props
}) {
  return (
    <Component
      className={`
        relative rounded-3xl overflow-hidden
        glass-panel
        ${glow ? 'shadow-neon-graphite' : 'shadow-glass-lg'}
        ${sheen ? 'glass-specular-sheen' : ''}
        transition-all duration-300
        ${className}
      `}
      {...props}
    >
      {/* Specular top light reflex */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />
      
      {/* Subtle graphite ambient glow dot */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-slate-400/5 blur-2xl pointer-events-none" />

      {children}
    </Component>
  );
}
