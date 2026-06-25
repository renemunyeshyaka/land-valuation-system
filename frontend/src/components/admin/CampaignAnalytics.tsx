import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface CampaignAnalyticsData {
  total_campaigns: number;
  total_target: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_converted: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
  status_breakdown: {
    running: number;
    draft: number;
    completed: number;
    paused: number;
  };
  ai_insights: {
    summary: string;
    top_segment: string;
    recommendation: string;
    segment_scores: Record<string, number>;
  } | null;
}

export default function CampaignAnalytics() {
  const { t } = useTranslation();
  const [data, setData] = useState<CampaignAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights'>('overview');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/campaigns/analytics/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.error?.message || 'Failed to load analytics');
      }
    } catch {
      toast.error(t('toast.campaignAnalyticsLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-500">{t('common.noData')}</div>;
  }

  const statCard = (label: string, value: string | number, sub?: string, color = 'text-gray-800') => (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('admin.analyticsOverview')}
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'insights' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('admin.analyticsInsights')}
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Funnel metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statCard(t('admin.analyticsSent'), data.total_sent.toLocaleString(), `${data.total_campaigns} campaigns`)}
            {statCard(t('admin.analyticsOpened'), data.total_opened.toLocaleString(), `${data.open_rate.toFixed(1)}% open rate`, 'text-blue-600')}
            {statCard(t('admin.analyticsClicked'), data.total_clicked.toLocaleString(), `${data.click_rate.toFixed(1)}% click rate`, 'text-purple-600')}
            {statCard(t('admin.analyticsConverted'), data.total_converted.toLocaleString(), `${data.conversion_rate.toFixed(1)}% conversion`, 'text-green-600')}
          </div>

          {/* Funnel visualization */}
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">{t('admin.analyticsFunnel')}</h3>
            <div className="space-y-3">
              {[
                { label: t('admin.analyticsSent'), count: data.total_sent, pct: 100, color: 'bg-blue-400' },
                { label: t('admin.analyticsOpened'), count: data.total_opened, pct: data.open_rate, color: 'bg-indigo-400' },
                { label: t('admin.analyticsClicked'), count: data.total_clicked, pct: data.click_rate, color: 'bg-purple-400' },
                { label: t('admin.analyticsConverted'), count: data.total_converted, pct: data.conversion_rate, color: 'bg-emerald-400' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium">{item.count.toLocaleString()} ({item.pct.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`${item.color} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(item.pct, 1)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="font-semibold text-gray-800 mb-4">{t('admin.analyticsStatus')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: t('admin.campaignRunning'), count: data.status_breakdown.running, color: 'text-green-600 bg-green-50' },
                { label: t('admin.campaignDraft'), count: data.status_breakdown.draft, color: 'text-gray-600 bg-gray-50' },
                { label: t('admin.campaignCompleted'), count: data.status_breakdown.completed, color: 'text-teal-600 bg-teal-50' },
                { label: t('admin.campaignPaused'), count: data.status_breakdown.paused, color: 'text-yellow-600 bg-yellow-50' },
              ].map(item => (
                <div key={item.label} className={`${item.color} rounded-lg p-3 text-center`}>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* AI Insights Tab */
        <div className="bg-white rounded-xl border p-6">
          {data.ai_insights ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">{t('admin.analyticsSummary')}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{data.ai_insights.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-lg p-4">
                  <p className="text-xs text-emerald-600 font-medium mb-1">{t('admin.analyticsTopSegment')}</p>
                  <p className="text-lg font-bold text-emerald-800">{data.ai_insights.top_segment}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-xs text-indigo-600 font-medium mb-1">{t('admin.analyticsOverallRate')}</p>
                  <p className="text-lg font-bold text-indigo-800">{data.conversion_rate.toFixed(1)}%</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">{t('admin.analyticsRecommendation')}</h3>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-blue-800 text-sm leading-relaxed">{data.ai_insights.recommendation}</p>
                </div>
              </div>
              {data.ai_insights.segment_scores && Object.keys(data.ai_insights.segment_scores).length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">{t('admin.analyticsSegmentPerformance')}</h3>
                  <div className="space-y-2">
                    {Object.entries(data.ai_insights.segment_scores).map(([segment, score]) => (
                      <div key={segment} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-36 capitalize">{segment.replace(/_/g, ' ')}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${Math.min(score * 10, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{score.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg mb-2">🤖</p>
              <p className="text-gray-500">{t('admin.analyticsNoInsights')}</p>
              <p className="text-xs text-gray-400 mt-1">Launch a campaign and collect engagement data to generate insights.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
