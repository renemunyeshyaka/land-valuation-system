import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface AIConfig {
  deepseek_api_key: string;
  deepseek_model: string;
  deepseek_base_url: string;
  lead_aggregator_cron: string;
  lead_score_threshold: string;
  whatsapp_provider: string;
  ai_service_configured: boolean;
}

export default function AITargetingConfig() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/ai-targeting/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setConfig(json.data);
      else toast.error(json.error?.message || 'Failed to load config');
    } catch {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading configuration...</div>;
  if (!config) return <div className="text-center py-8 text-gray-500">Unable to load configuration.</div>;

  const configGroup = (title: string, icon: string, items: { label: string; value: string | boolean; note?: string; status?: 'ok' | 'warn' | 'off' }[]) => (
    <div className="bg-white rounded-xl border mb-6">
      <div className="border-b px-6 py-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-lg">{icon}</span> {title}
        </h3>
      </div>
      <div className="divide-y">
        {items.map(item => (
          <div key={item.label} className="px-6 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{item.label}</p>
              {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-mono ${typeof item.value === 'boolean' ? '' : 'text-gray-600 bg-gray-50 px-2 py-0.5 rounded'}`}>
                {typeof item.value === 'boolean' ? '' : item.value}
              </span>
              {item.status === 'ok' && <span className="w-2 h-2 rounded-full bg-green-500" title="Configured" />}
              {item.status === 'warn' && <span className="w-2 h-2 rounded-full bg-yellow-500" title="Not configured" />}
              {item.status === 'off' && <span className="w-2 h-2 rounded-full bg-gray-300" title="Disabled" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      {/* AI Service Status */}
      <div className={`rounded-lg p-4 mb-6 flex items-center gap-3 ${config.ai_service_configured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <span className={`text-2xl ${config.ai_service_configured ? '' : ''}`}>
          {config.ai_service_configured ? '✅' : '⚠️'}
        </span>
        <div>
          <p className={`font-medium ${config.ai_service_configured ? 'text-green-800' : 'text-yellow-800'}`}>
            AI Service {config.ai_service_configured ? 'Configured' : 'Not Configured'}
          </p>
          <p className={`text-sm ${config.ai_service_configured ? 'text-green-600' : 'text-yellow-600'}`}>
            {config.ai_service_configured
              ? 'DeepSeek AI is active for lead enrichment, scoring, and content generation.'
              : 'Set DEEPSEEK_API_KEY in your .env file to enable AI features.'}
          </p>
        </div>
      </div>

      {/* DeepSeek AI */}
      {configGroup('DeepSeek AI', '🧠', [
        { label: 'API Key', value: config.deepseek_api_key, status: config.ai_service_configured ? 'ok' : 'warn', note: 'Masked for security' },
        { label: 'Model', value: config.deepseek_model, status: 'ok' },
        { label: 'Base URL', value: config.deepseek_base_url, status: 'ok' },
      ])}

      {/* Lead Aggregator */}
      {configGroup('Lead Aggregator', '🎯', [
        { label: 'Cron Schedule', value: config.lead_aggregator_cron, status: 'ok', note: 'Every 6 hours' },
        { label: 'Score Threshold', value: config.lead_score_threshold, status: 'ok', note: 'Minimum AI score to qualify leads' },
        { label: 'Status', value: 'Active', status: 'ok' },
      ])}

      {/* WhatsApp */}
      {configGroup('WhatsApp Outreach', '💬', [
        { label: 'Provider', value: config.whatsapp_provider, status: config.whatsapp_provider === 'simulation' ? 'warn' : 'ok', note: config.whatsapp_provider === 'simulation' ? 'Simulation mode — no real messages sent' : 'Live mode' },
      ])}

      {/* How to modify */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">ℹ️ How to Modify Configuration</h4>
        <p className="text-sm text-blue-700 leading-relaxed">
          These values are read from your server's <code className="bg-blue-100 px-1 rounded">.env</code> file.
          To change them, edit <code className="bg-blue-100 px-1 rounded">backend/.env</code> (local) or
          <code className="bg-blue-100 px-1 rounded"> backend/.env.production</code> (production) and restart the server.
        </p>
      </div>
    </div>
  );
}
