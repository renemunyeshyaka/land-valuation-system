import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { fetchUserNotifications, fetchUnreadCount, markAllAsRead } from '../utils/notificationApi';

import { connectNotificationWebSocket, NotificationPayload } from '../utils/notificationWebSocket';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export const NotificationBell: React.FC = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchUnreadCount().then((count) => { if (mounted) setUnreadCount(count); });
    fetchUserNotifications({ limit: 5 }).then((data) => { if (mounted) setNotifications(data); });

    // Connect to WebSocket for real-time notifications
    wsRef.current = connectNotificationWebSocket({
      onNotification: (notif: NotificationPayload) => {
        setNotifications((prev) => [
          {
            id: notif.id.toString(),
            title: notif.title,
            message: notif.message,
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...prev.slice(0, 4), // keep max 5 notifications
        ]);
        setUnreadCount((prev) => prev + 1);
      },
      onError: () => {},
      onClose: () => {},
    });
    return () => {
      mounted = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const handleDropdown = () => setShowDropdown((v) => !v);
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        className="relative focus:outline-none"
        onClick={handleDropdown}
        aria-label="Notifications"
      >
        <span className="icon-bell" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      {showDropdown && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-2 px-4 border-b flex justify-between items-center">
            <span className="font-semibold">Notifications</span>
            <button className="text-xs text-blue-600" onClick={handleMarkAllAsRead}>
              Mark all as read
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-2 text-gray-500">No notifications</li>
            )}
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-2 border-b last:border-b-0 cursor-pointer ${n.read ? 'bg-white' : 'bg-blue-50 font-semibold'}`}
              >
                <div className="flex justify-between items-center">
                  <span>{n.title}</span>
                  <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-xs text-gray-600">{n.message}</div>
              </li>
            ))}
          </ul>
          <div className="py-2 px-4 text-center">
            <Link href="/notifications">
              <span className="text-blue-600 hover:underline cursor-pointer">View all notifications</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
