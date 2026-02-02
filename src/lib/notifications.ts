import { supabase } from './supabase';

export interface NotificationData {
  to: string;
  subject: string;
  message: string;
  playerName?: string;
  action?: string;
}

export const sendNotification = async (data: NotificationData) => {
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`;

    const headers = {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

export const notifyPlayerAction = async (
  playerEmail: string | undefined,
  playerName: string,
  action: 'created' | 'updated' | 'deleted' | 'assigned'
) => {
  if (!playerEmail) {
    console.log(`No email for player ${playerName}, skipping notification`);
    return;
  }

  let subject = '';
  let message = '';

  switch (action) {
    case 'created':
      subject = 'Bienvenue dans l\'équipe !';
      message = `Bonjour ${playerName},\n\nVous avez été ajouté à l'effectif de l'équipe. Bienvenue !`;
      break;
    case 'updated':
      subject = 'Vos informations ont été mises à jour';
      message = `Bonjour ${playerName},\n\nVos informations dans le système ont été mises à jour.`;
      break;
    case 'deleted':
      subject = 'Retrait de l\'équipe';
      message = `Bonjour ${playerName},\n\nVous avez été retiré de l'effectif de l'équipe.`;
      break;
    case 'assigned':
      subject = 'Nouvelle assignation';
      message = `Bonjour ${playerName},\n\nVous avez été assigné à une nouvelle tâche. Consultez le planning pour plus de détails.`;
      break;
  }

  try {
    await sendNotification({
      to: playerEmail,
      subject,
      message,
      playerName,
      action,
    });
  } catch (error) {
    console.error('Failed to notify player:', error);
  }
};
