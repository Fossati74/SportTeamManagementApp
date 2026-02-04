/**
 * Normalise un texte : retire les accents et met en minuscule
 */
export const normalizeText = (text: string): string => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
export const getLevenshteinDistance = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
};

/**
 * Recherche floue avancée : vérifie si tous les termes de la recherche 
 * sont présents dans la cible (marge d'erreur incluse)
 */
export const fuzzyMatch = (targetText: string, query: string, useLevenshtein = true): boolean => {
  if (!query) return true;
  
  const searchNorm = normalizeText(query);
  const targetNorm = normalizeText(targetText);
  
  // 1. On teste si la recherche est contenue dans le nom (ex: "theo" dans "théo")
  // La normalisation gère déjà les accents, donc "teo" vs "téo" passe ici.
  const searchTerms = searchNorm.split(/\s+/);
  const matchesAllTerms = searchTerms.every(term => targetNorm.includes(term));
  
  if (matchesAllTerms) return true;

  // 2. Si ça ne match pas, on utilise Levenshtein sur les mots individuels
  if (useLevenshtein) {
    const targetTerms = targetNorm.split(/\s+/);
    
    // On vérifie si UN des mots du nom ressemble au mot tapé
    return searchTerms.every(sTerm => 
      targetTerms.some(tTerm => {
        const threshold = sTerm.length > 4 ? 2 : 1;
        return getLevenshteinDistance(sTerm, tTerm) <= threshold;
      })
    );
  }

  return false;
};