// Utility for connecting to the notification WebSocket and handling messages
export type NotificationPayload = {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  sent_by: number;
};

export type NotificationWebSocketOptions = {
  onNotification: (notification: NotificationPayload) => void;
  onOpen?: () => void;
  onError?: (e: Event) => void;
  onClose?: () => void;
};

export function connectNotificationWebSocket(options: NotificationWebSocketOptions): WebSocket {
  const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5001') + '/ws/notifications';
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    options.onOpen?.();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Only handle notification payloads (not broadcast control messages)
      if (data && typeof data === 'object' && 'id' in data && 'title' in data && 'message' in data) {
        options.onNotification(data as NotificationPayload);
      }
    } catch {}
  };

  ws.onerror = (e) => {
    options.onError?.(e);
  };

  ws.onclose = () => {
    options.onClose?.();
  };

  return ws;
}
