import React from 'react';
import type { Statut, TypeJournee } from '../../types';

// ── STAT CARD ──
export function StatCard({ label, value, icon, color = 'blue', sub }: {
  label: string; value: string | number; icon: React.ReactNode; color?: 'blue'|'gold'|'green'|'red'|'purple'|'orange'; sub?: string;
}) {
  const colors = {
    blue:   'bg-brand-dark text-white',
    gold:   'bg-brand-gold text-white',
    green:  'bg-emerald-600 text-white',
    red:    'bg-red-500 text-white',
    purple: 'bg-purple-600 text-white',
    orange: 'bg-orange-500 text-white',
  };
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ── STATUS BADGE ──
export function StatusBadge({ statut }: { statut: Statut }) {
  const config: Record<Statut, { label: string; className: string }> = {
    brouillon: { label: 'Brouillon',  className: 'bg-gray-100 text-gray-600' },
    soumis:    { label: 'Soumis',     className: 'bg-blue-100 text-blue-700' },
    approuve:  { label: 'Approuvé',   className: 'bg-emerald-100 text-emerald-700' },
    refuse:    { label: 'Refusé',     className: 'bg-red-100 text-red-700' },
  };
  const c = config[statut] || config.brouillon;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.className}`}>{c.label}</span>;
}

// ── TYPE JOURNÉE BADGE ──
export function TypeBadge({ type }: { type: TypeJournee }) {
  const config: Record<TypeJournee, { label: string; className: string }> = {
    regulier:  { label: 'Régulier',   className: 'bg-brand-dark/10 text-brand-dark' },
    ferie:     { label: 'Férié',      className: 'bg-amber-100 text-amber-700' },
    weekend:   { label: 'Week-end',   className: 'bg-gray-100 text-gray-500' },
    maladie:   { label: 'Maladie',    className: 'bg-red-100 text-red-600' },
    vacance:   { label: 'Vacances',   className: 'bg-sky-100 text-sky-700' },
    formation: { label: 'Formation',  className: 'bg-purple-100 text-purple-700' },
  };
  const c = config[type] || config.regulier;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.className}`}>{c.label}</span>;
}

// ── PAGE HEADER ──
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ── CARD ──
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-card p-6 ${className}`}>{children}</div>;
}

// ── BUTTON ──
export function Button({ children, variant = 'primary', size = 'md', onClick, type = 'button', disabled, className = '', loading }: {
  children: React.ReactNode; variant?: 'primary'|'secondary'|'danger'|'ghost'|'gold';
  size?: 'sm'|'md'|'lg'; onClick?: () => void; type?: 'button'|'submit'|'reset';
  disabled?: boolean; className?: string; loading?: boolean;
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
  const variants = {
    primary:   'bg-brand-dark text-white hover:bg-brand-light shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger:    'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    ghost:     'text-brand-dark hover:bg-brand-dark/10',
    gold:      'bg-brand-gold text-white hover:bg-brand-goldDark shadow-sm',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {loading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
      {children}
    </button>
  );
}

// ── MODAL ──
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl';
}) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-card-lg w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-brand-dark">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

// ── FORM FIELD ──
export function FormField({ label, error, children, required, hint }: {
  label: string; error?: string; children: React.ReactNode; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm transition ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm bg-white transition ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent text-sm transition resize-none ${className}`} {...props} />;
}

// ── EMPTY STATE ──
export function EmptyState({ icon, title, subtitle, action }: { icon?: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-500">{title}</h3>
      {subtitle && <p className="text-sm text-gray-400 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── LOADING SPINNER ──
export function Spinner({ size = 'md' }: { size?: 'sm'|'md'|'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className="flex justify-center items-center py-8">
      <svg className={`animate-spin ${s} text-brand-gold`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );
}

// ── TABLE ──
export function Table({ headers, children, className = '' }: { headers: string[]; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-gray-100 ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-brand-dark text-white">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <tr className={`hover:bg-gray-50/80 transition-colors ${className}`}>{children}</tr>;
}

export function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-gray-700 whitespace-nowrap ${className}`}>{children}</td>;
}
