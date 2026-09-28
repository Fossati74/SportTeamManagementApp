import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isDateInSeason } from '../utils/date';
import { useCollectifId } from './useCollectifId';

interface PlayerStats {
  aperoCount: number;
  matchCount: number;
  carpoolCount: number;
  finesTotal: number;
  redistributionAmount: number;
}

export const usePlayerStats = () => {
  const [playerStats, setPlayerStats] = useState<{ [playerId: string]: PlayerStats }>({});
  const [totalFinesGlobal, setTotalFinesGlobal] = useState(0);
  const [loading, setLoading] = useState(true);
  const collectifId = useCollectifId();

  const fetchAllStats = useCallback(async () => {
    try {
      const [
        aperoResponse,
        matchResponse,
        carpoolResponse,
        finesResponse,
        expensesResponse,
        playersResponse
      ] = await Promise.all([
        supabase.from("apero_schedule").select("person1_id, person2_id, person3_id").eq("collectif_id", collectifId),
        supabase.from("match_schedule").select("saturday_person1_id, saturday_person2_id, saturday_person3_id, saturday_person4_id, sunday_person1_id, sunday_person2_id, sunday_person3_id, sunday_person4_id").eq("collectif_id", collectifId),
        supabase.from("carpools").select("*").eq("collectif_id", collectifId),
        supabase.from("fines").select("player_id, date, fine_types(amount)").eq("collectif_id", collectifId),
        supabase.from("expenses").select(`id, amount, expense_participants(player_id)`).eq("collectif_id", collectifId),
        supabase.from("members").select("id, manual_payment, participates_in_fund").eq("collectif_id", collectifId)
      ]);

      const stats: { [playerId: string]: PlayerStats } = {};

      const initStat = (id: string) => {
        if (!stats[id]) {
          stats[id] = { aperoCount: 0, matchCount: 0, carpoolCount: 0, finesTotal: 0, redistributionAmount: 0 };
        }
      };

      // 1. Apéros
      aperoResponse.data?.forEach(item => {
        if (item.person1_id) { initStat(item.person1_id); stats[item.person1_id].aperoCount++; }
        if (item.person2_id) { initStat(item.person2_id); stats[item.person2_id].aperoCount++; }
        if (item.person3_id) { initStat(item.person3_id); stats[item.person3_id].aperoCount++; }
      });

      // 2. Matchs (Table de marque)
      matchResponse.data?.forEach((item: any) => {
        [item.saturday_person1_id, item.saturday_person2_id, item.saturday_person3_id, item.saturday_person4_id, 
         item.sunday_person1_id, item.sunday_person2_id, item.sunday_person3_id, item.sunday_person4_id].forEach(id => {
          if (id) { initStat(id); stats[id].matchCount++; }
        });
      });

      // 3. Covoiturage
      carpoolResponse.data?.forEach(carpool => {
        [carpool.team1_player1_id, carpool.team1_player2_id, carpool.team1_player3_id, carpool.team1_player4_id, carpool.team1_player5_id,
         carpool.team2_player1_id, carpool.team2_player2_id, carpool.team2_player3_id, carpool.team2_player4_id, carpool.team2_player5_id].forEach(id => {
          if (id) { initStat(id); stats[id].carpoolCount++; }
        });
      });

      // 4. Amendes (Filtrées par saison via notre utilitaire)
      finesResponse.data?.forEach((fine: any) => {
        if (fine.player_id && fine.fine_types && fine.date && isDateInSeason(fine.date)) {
          initStat(fine.player_id);
          stats[fine.player_id].finesTotal += fine.fine_types.amount || 0;
        }
      });

      // 5. Ajustements manuels et Dépenses redistribuées
      playersResponse.data?.forEach(p => {
        if (Number(p.manual_payment) > 0) {
          initStat(p.id);
          stats[p.id].finesTotal += Number(p.manual_payment);
        }
      });

      expensesResponse.data?.forEach((exp: any) => {
        const parts = exp.expense_participants?.map((p: any) => p.player_id) || [];
        if (parts.length > 0) {
          const perPerson = Number(exp.amount) / parts.length;
          parts.forEach((pId: string) => {
            const pData = playersResponse.data?.find(pd => pd.id === pId);
            if (pData && !pData.participates_in_fund) {
              initStat(pId);
              stats[pId].redistributionAmount += perPerson;
            }
          });
        }
      });

      // Calcul du total global pour le header
      const globalTotal = Object.values(stats).reduce((sum, s) => sum + s.finesTotal, 0);
      
      setPlayerStats(stats);
      setTotalFinesGlobal(globalTotal);
    } catch (error) {
      console.error("Error in usePlayerStats:", error);
    } finally {
      setLoading(false);
    }
  }, [collectifId]);

  useEffect(() => {
    fetchAllStats();
  }, [fetchAllStats]);

  return { 
    playerStats, 
    totalFinesGlobal, 
    loading, 
    refreshStats: fetchAllStats 
  };
};