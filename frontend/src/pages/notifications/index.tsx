
import Head from 'next/head';
import MainNavbar from '../../components/MainNavbar';

const notifications = [
  {
    id: 'NTF-001',
    title: 'Subscription Renewed',
    message: 'Your Professional plan was renewed successfully.',
    type: 'billing',
    read: false,
    date: '2026-03-02',
  },
  {
    id: 'NTF-002',
    title: 'Valuation Completed',
    message: 'Your valuation request for Remera Prime Location is ready.',
    type: 'valuation',
    read: false,
    date: '2026-03-01',
  },
  {
    id: 'NTF-003',
    title: 'System Maintenance',
    message: 'Scheduled maintenance on 2026-03-05 from 01:00 to 03:00.',
    type: 'system',
    read: true,
    date: '2026-02-28',
  },
  {
    id: 'NTF-004',
    title: 'Payment Receipt Available',
    message: 'Your receipt RCP-2098 is now available for download.',
    type: 'billing',
    read: true,
    date: '2026-02-27',
  },
];

function getTypeBadge(type: string) {
  if (type === 'billing') return 'bg-blue-100 text-blue-700';
  if (type === 'valuation') return 'bg-emerald-100 text-emerald-700';
  return 'bg-gray-100 text-gray-700';
}

export default function NotificationsPage() {
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
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <i className="fas fa-bell-slash text-4xl text-gray-300 mb-3"></i>
                  <p className="text-gray-600 font-medium">No notifications to show</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((item, idx) => (
                    <div key={item.id} className={`p-5 ${item.read ? 'bg-white' : 'bg-emerald-50/40'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="text-base font-semibold text-gray-800">{item.title}</h3>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getTypeBadge(item.type)}`}>
                              {item.type}
                            </span>
                            {!item.read && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{item.message}</p>
                          <p className="text-xs text-gray-500">{item.date}</p>
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
