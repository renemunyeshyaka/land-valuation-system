import axios from 'axios';

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export async function fetchUserNotifications({ limit = 20 } = {}): Promise<Notification[]> {
  const res = await axios.get('/api/v1/users/notifications', { params: { limit } });
  return res.data.notifications;
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await axios.get('/api/v1/users/notifications/unread-count');
  return res.data.unreadCount;
}

export async function markNotificationRead(id: string): Promise<void> {
  await axios.post(`/api/v1/users/notifications/${id}/read`);
}

export async function deleteNotification(id: string): Promise<void> {
  await axios.delete(`/api/v1/users/notifications/${id}`);
}

export async function markAllAsRead(): Promise<void> {
  await axios.post('/api/v1/users/notifications/read-all');
}
