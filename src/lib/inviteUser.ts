import { supabase } from './supabase';

export const inviteUser = async (
  email: string | undefined,
  role: 'admin' | 'user',
  collectifId?: string,
  playerId?: string,
  firstName?: string,
  lastName?: string
) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Vous devez être connecté pour inviter un membre');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, role, collectifId, playerId, firstName, lastName }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Échec de l'invitation: ${response.statusText}`);
  }

  return result;
};
