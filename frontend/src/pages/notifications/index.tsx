

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MainNavbar from '../../components/MainNavbar';
import { fetchUserNotifications, markNotificationRead, deleteNotification, markAllAsRead } from '../../utils/notificationApi';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/login');
      return;
    }
    fetchUserNotifications({ limit: 50 }).then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, [session, status, router]);

  const handleMarkAsRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <>
      <Head>
        <title>Notifications · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </Head>

      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">
        <MainNavbar />

        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Notifications</h1>
                <p className="text-lg text-gray-600">Stay up to date with account, billing, and valuation updates</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 text-sm font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                  {notifications.filter((item) => !item.read).length} unread
                </span>
                <button className="ml-2 text-blue-600 text-sm" onClick={handleMarkAllAsRead}>
                  Mark all as read
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              {loading ? (
                <div className="p-10 text-center">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <i className="fas fa-bell-slash text-4xl text-gray-300 mb-3"></i>
                  <p className="text-gray-600 font-medium">No notifications to show</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((item) => (
                    <div key={item.id} className={`p-5 flex items-start ${item.read ? 'bg-white' : 'bg-emerald-50/40'}`}>
                      <span className={`mt-1 mr-3 ${item.read ? 'text-gray-400' : 'text-emerald-600'}`}>{item.read ? '○' : '●'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-base font-semibold text-gray-800">{item.title}</h3>
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                            {/* Type badge placeholder */}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{item.message}</p>
                        <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                        <div className="flex gap-2 mt-2">
                          {!item.read && (
                            <button className="text-xs text-green-600" onClick={() => handleMarkAsRead(item.id)}>
                              Mark as read
                            </button>
                          )}
                          <button className="text-xs text-red-600" onClick={() => handleDelete(item.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">© {new Date().getFullYear()} LandVal. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}
