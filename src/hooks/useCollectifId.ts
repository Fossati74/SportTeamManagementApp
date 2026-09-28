import { useAuth } from '../contexts/AuthContext';

export const useCollectifId = () => {
  const { profile, actingCollectifId } = useAuth();
  if (profile?.role === 'super_admin') return actingCollectifId;
  return profile?.collectif_id ?? null;
};
