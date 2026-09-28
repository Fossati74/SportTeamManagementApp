import { supabase } from './supabase';

export const deleteMember = async (memberId: string) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Vous devez être connecté pour supprimer un membre');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-member`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ memberId }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Échec de la suppression: ${response.statusText}`);
  }

  return result;
};
