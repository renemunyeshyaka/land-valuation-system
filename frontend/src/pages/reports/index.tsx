import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

const ReportsPage: React.FC = () => {
  const { status } = useSession();
  const [schedule, setSchedule] = useState<'weekly' | 'monthly'>('monthly');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');

  const reportHistory = [
    { id: 'RPT-0001', name: 'Monthly Revenue Report', date: '2026-03-01', format: 'PDF', status: 'Ready' },
    { id: 'RPT-0002', name: 'Valuation Trends Report', date: '2026-02-25', format: 'CSV', status: 'Ready' },
    { id: 'RPT-0003', name: 'User Activity Report', date: '2026-02-20', format: 'PDF', status: 'Ready' },
    { id: 'RPT-0004', name: 'Subscription Summary', date: '2026-02-15', format: 'CSV', status: 'Ready' },
  ];

  const handleGenerate = () => {
    toast.success(`Report generated in ${format.toUpperCase()}`);
  };

  const handleSaveSchedule = () => {
    toast.success(`Auto-report schedule set to ${schedule}`);
  };

  return (
    <>
      <Head>
        <title>Reports · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </Head>

      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">
        <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-emerald-700 rounded-lg flex items-center justify-center group-hover:bg-emerald-800 transition-colors">
                  <i className="fas fa-map-marked-alt text-white text-lg"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-lg font-bold text-gray-800 leading-tight">LandVal</span>
                  <span className="text-xs text-gray-500 leading-tight hidden sm:block">Rwanda Property Valuation</span>
                </div>
              </Link>

              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors">
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Reports</h1>
              <p className="text-lg text-gray-600">Generate exports, manage schedules, and review report history</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Generate Report</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Report Type</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600">
                      <option>Revenue</option>
                      <option>Valuation Trends</option>
                      <option>User Activity</option>
                      <option>Subscriptions</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Export Format</label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <i className="fas fa-file-export mr-2"></i>
                  Generate Report
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Auto Schedule</h2>
                <div className="space-y-3 mb-5">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={schedule === 'weekly'}
                      onChange={() => setSchedule('weekly')}
                    />
                    <span className="text-sm font-medium">Weekly</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={schedule === 'monthly'}
                      onChange={() => setSchedule('monthly')}
                    />
                    <span className="text-sm font-medium">Monthly</span>
                  </label>
                </div>
                <button
                  onClick={handleSaveSchedule}
                  className="w-full px-4 py-2.5 bg-white border border-emerald-700 text-emerald-700 hover:bg-emerald-50 text-sm font-medium rounded-lg transition-colors"
                >
                  Save Schedule
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-5">Report History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Report ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Format</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportHistory.map((report) => (
                      <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-800 font-medium">{report.id}</td>
                        <td className="py-3 px-4 text-gray-700">{report.name}</td>
                        <td className="py-3 px-4 text-gray-600">{report.date}</td>
                        <td className="py-3 px-4 text-gray-600">{report.format}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">{report.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toast.success(`Downloading ${report.id}`)}
                            className="text-emerald-700 hover:text-emerald-800 font-medium"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
              © {new Date().getFullYear()} LandVal. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ReportsPage;
