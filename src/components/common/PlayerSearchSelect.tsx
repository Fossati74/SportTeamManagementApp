import React, { useState, useEffect, useRef } from 'react';
import { fuzzyMatch } from '../../utils/search';

export const PlayerSearchSelect = ({ 
  label, value, onSelect, players, playerStats = {}, allSelectedIds = [], statLabel = "x", statKey = "aperoCount" 
}: any) => {
  const [localSearch, setLocalSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fonction utilitaire pour obtenir le nom à afficher (Joueur ou Amende)
  const getDisplayName = (item: any) => {
    if (!item) return "";
    return item.name || `${item.first_name} ${item.last_name}`;
  };

  useEffect(() => {
    const item = players.find((p: any) => p.id === value);
    setLocalSearch(item ? getDisplayName(item) : "");
  }, [value, players]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = players.filter((p: any) => {
    if (!localSearch || value) return true;
    return fuzzyMatch(getDisplayName(p), localSearch, true);
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        placeholder={label}
        value={localSearch}
        onChange={(e) => { 
          setLocalSearch(e.target.value); 
          setShowList(true);
          if (e.target.value === "") onSelect("");
        }}
        onFocus={() => {
          setShowList(true);
          setLocalSearch(""); 
        }}
        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-500"
      />
      {showList && (
        <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          
          {/* Option pour réinitialiser / Voir tout */}
          {localSearch === "" && (
            <button
              type="button"
              onClick={() => {
                onSelect("");
                setLocalSearch("");
                setShowList(false);
              }}
              className="w-full text-left px-4 py-3 text-[10px] border-b border-slate-800 text-amber-500 font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors bg-slate-900/50"
            >
              {label.toLowerCase().includes("amende") ? "Voir toutes les amendes" : "Voir tous les joueurs"}
            </button>
          )}

          {filteredItems.map((item: any) => {
            const isAlreadyChosen = allSelectedIds.includes(item.id) && item.id !== value;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isAlreadyChosen}
                onClick={() => {
                  onSelect(item.id);
                  setLocalSearch(getDisplayName(item));
                  setShowList(false);
                }}
                className={`w-full text-left px-4 py-3 text-sm border-b border-slate-800 last:border-none flex justify-between items-center transition-colors
                  ${isAlreadyChosen ? 'opacity-40 cursor-not-allowed bg-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-green-400'}`}
              >
                <div className="flex flex-col">
                  {!isAlreadyChosen ? (
                    <span>{getDisplayName(item)}</span>
                  ) : (
                    <span className="text-amber-500 font-bold uppercase tracking-tighter text-[11px]">
                      {getDisplayName(item)}
                    </span>
                  )}
                </div>
                
                {statKey && (
                  <span className="text-slate-500 font-bold text-xs">
                    {item[statKey] !== undefined ? item[statKey] : (playerStats[item.id]?.[statKey] || 0)}
                    {statLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};