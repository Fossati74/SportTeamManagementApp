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
  <div className="p-4 md:p-6 border-b border-slate-700 bg-slate-900/50 flex flex-col gap-4">
    <div className="flex items-center justify-between w-full">
      {/* TITRE ET ICONE */}
      <h3 className="text-white font-bold flex items-center gap-2 underline decoration-green-500 underline-offset-8 uppercase tracking-wider text-sm md:text-base">
        <Icon size={20} className={colorClass} /> {title}
      </h3>

      {/* ENFANTS DIRECTS (Boutons de toggle alignés avec le titre) */}
      <div className="flex items-center">
        {/* On filtre ici pour ne prendre que les boutons de navigation si nécessaire, 
            mais dans ton cas, on va mettre les boutons Toggle ici */}
        {Array.isArray(children) ? children[0] : children}
      </div>
    </div>

    {/* BLOC DES FILTRES (Affiché en dessous du titre) */}
    {Array.isArray(children) && children[1] && (
      <div className="w-full animate-in fade-in slide-in-from-top-1">
        {children[1]}
      </div>
    )}
  </div>
);