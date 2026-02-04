export const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = month >= 8 ? year : year - 1;
  return {
    start,
    end: start + 1,
    label: `Saison ${start}-${start + 1}`
  };
};

export const isDateInSeason = (dateStr: string): boolean => {
  const { start, end } = getCurrentSeason();
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  if (year === start && month >= 8) return true;
  if (year === end && month <= 7) return true;
  return false;
};

export const formatDateFr = (dateStr: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) => {
  // Ajout de T12:00:00 pour éviter les décalages de timezone sur les dates pures
  const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('fr-FR', options);
};

/**
 * Génère la liste des dates pour un jour spécifique de la semaine dans un mois donné
 * @param monthOffset - Décalage par rapport au mois actuel (0 = ce mois, 1 = mois prochain)
 * @param dayOfWeek - 0 (Dimanche) à 6 (Samedi). Exemple : 4 pour Jeudi.
 */
export const getSpecificDaysInMonth = (monthOffset: number, dayOfWeek: number): string[] => {
  const days: string[] = [];
  const today = new Date();
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  
  // On récupère le dernier jour du mois
  const lastDay = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d);
    if (date.getDay() === dayOfWeek) {
      // On fixe à midi pour éviter les problèmes de fuseau horaire lors de l'ISOString
      date.setHours(12, 0, 0, 0);
      days.push(date.toISOString().split('T')[0]);
    }
  }
  return days;
};

/**
 * Retourne le nom du mois cible formaté
 */
export const getTargetMonthLabel = (monthOffset: number): string => {
  const today = new Date();
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  return targetMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};