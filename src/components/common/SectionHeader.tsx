import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  Icon: LucideIcon;
  colorClass?: string;
  children?: React.ReactNode;
  isSearch?: boolean; // Nouvelle propriété
}

export const SectionHeader = ({ title, Icon, colorClass = "text-green-400", children, isSearch = false }: SectionHeaderProps) => (
  <div className="p-4 md:p-6 border-b border-slate-700 bg-slate-900/50 flex flex-col gap-4 shrink-0">
    <div className="flex items-center justify-between w-full">
      {/* TITRE : Toujours à gauche */}
      <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase tracking-wider text-sm md:text-base shrink-0">
        <Icon size={20} className={colorClass} /> {title}
      </h3>

      {/* ENFANTS (Boutons ou Recherche Desktop) */}
      <div className={`flex items-center gap-3 ${isSearch ? 'hidden sm:flex' : 'flex'}`}>
        {children}
      </div>
    </div>

    {/* BLOC RECHERCHE MOBILE : S'affiche seulement si isSearch est vrai */}
    {isSearch && (
      <div className="w-full sm:hidden animate-in fade-in slide-in-from-top-1">
        {children}
      </div>
    )}
  </div>
);