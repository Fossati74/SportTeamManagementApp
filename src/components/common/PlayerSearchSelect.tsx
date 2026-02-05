import React, { useState, useEffect, useRef } from 'react';
import { fuzzyMatch } from '../../utils/search';
import { Player } from '../../lib/supabase';

export const PlayerSearchSelect = ({ 
  label, value, onSelect, players, playerStats = {}, allSelectedIds = [], statLabel = "x", statKey = "aperoCount" 
}: any) => {
  const [localSearch, setLocalSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = players.find((p: Player) => p.id === value);
    setLocalSearch(p ? `${p.first_name} ${p.last_name}` : "");
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

  const filteredPlayers = players.filter((p: Player) => {
    if (!localSearch || value) return true;
    return fuzzyMatch(`${p.first_name} ${p.last_name}`, localSearch, true);
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
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder:text-slate-500"
      />
      {showList && (
        <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-40 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
          
          {/* Option pour réinitialiser / Voir tous les joueurs */}
          {localSearch === "" && (
            <button
              type="button"
              onClick={() => {
                onSelect("");
                setLocalSearch("");
                setShowList(false);
              }}
              className="w-full text-left px-3 py-2 text-[10px] border-b border-slate-800 text-amber-500 font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors bg-slate-900/50"
            >
              Voir tous les joueurs
            </button>
          )}

          {filteredPlayers.map((p: Player) => {
            const isAlreadyChosen = allSelectedIds.includes(p.id) && p.id !== value;
            return (
              <button
                key={p.id}
                type="button"
                disabled={isAlreadyChosen}
                onClick={() => {
                  onSelect(p.id);
                  setLocalSearch(`${p.first_name} ${p.last_name}`);
                  setShowList(false);
                }}
                className={`w-full text-left px-3 py-2 text-[11px] border-b border-slate-800 last:border-none flex justify-between items-center
                  ${isAlreadyChosen ? 'opacity-40 cursor-not-allowed bg-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-green-400'}`}
              >
                <div className="flex flex-col">
                  {!isAlreadyChosen ? (
                    <span>{p.first_name} {p.last_name}</span>
                  ) : (
                    <span className="text-amber-500 font-bold uppercase tracking-tighter">
                      {p.first_name} {p.last_name}
                    </span>
                  )}
                </div>
                {statKey && (
                  <span className="text-slate-500 font-bold text-[10px]">
                    {playerStats[p.id]?.[statKey] || 0}{statLabel}
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