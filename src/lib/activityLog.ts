import { supabase } from './supabase';

export const logActivity = async (action: string, description: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('activity_log').insert({
      action,
      description,
      user_id: user?.id || null,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
