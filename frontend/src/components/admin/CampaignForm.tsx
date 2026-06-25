import React from 'react';
import { useTranslation } from 'react-i18next';

export interface CampaignFormData {
  name: string;
  description: string;
  campaign_type: string;
  channel: string;
  language: string;
}

interface CampaignFormProps {
  formData: CampaignFormData;
  onChange: (data: CampaignFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
  title?: string;
}

const CAMPAIGN_TYPES = [
  { value: 'welcome', labelKey: 'admin.campaignTypeWelcome' },
  { value: 'owner_outreach', labelKey: 'admin.campaignTypeOwner' },
  { value: 'agent_onboarding', labelKey: 'admin.campaignTypeAgent' },
  { value: 'reactivation', labelKey: 'admin.campaignTypeReactivation' },
  { value: 'digest', labelKey: 'admin.campaignTypeDigest' },
  { value: 'seasonal', labelKey: 'admin.campaignTypeSeasonal' },
];

const CHANNELS = [
  { value: 'email', labelKey: 'admin.channelEmail' },
  { value: 'whatsapp', labelKey: 'admin.channelWhatsApp' },
  { value: 'both', labelKey: 'admin.channelBoth' },
];

const LANGUAGES = [
  { value: 'all', labelKey: 'admin.langAll' },
  { value: 'en', labelKey: 'admin.langEn' },
  { value: 'fr', labelKey: 'admin.langFr' },
  { value: 'rw', labelKey: 'admin.langRw' },
];

const CampaignForm: React.FC<CampaignFormProps> = ({
  formData,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  title,
}) => {
  const { t } = useTranslation();

  const update = (field: keyof CampaignFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="bg-gray-50 border rounded-lg p-4 mb-4">
      {title && <h3 className="font-semibold mb-3">{title}</h3>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            {t('admin.campaignName')}
          </label>
          <input
            className="border rounded px-3 py-2 text-sm w-full"
            value={formData.name}
            onChange={e => update('name', e.target.value)}
            placeholder={t('admin.campaignNamePlaceholder')}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            {t('admin.campaignType')}
          </label>
          <select
            className="border rounded px-3 py-2 text-sm w-full"
            value={formData.campaign_type}
            onChange={e => update('campaign_type', e.target.value)}
          >
            {CAMPAIGN_TYPES.map(ct => (
              <option key={ct.value} value={ct.value}>
                {t(ct.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 block mb-1">
            {t('admin.campaignDescription')}
          </label>
          <textarea
            className="border rounded px-3 py-2 text-sm w-full"
            value={formData.description}
            onChange={e => update('description', e.target.value)}
            placeholder={t('admin.campaignDescriptionPlaceholder')}
            rows={2}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            {t('admin.campaignChannel')}
          </label>
          <select
            className="border rounded px-3 py-2 text-sm w-full"
            value={formData.channel}
            onChange={e => update('channel', e.target.value)}
          >
            {CHANNELS.map(ch => (
              <option key={ch.value} value={ch.value}>
                {t(ch.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            {t('admin.campaignLanguage')}
          </label>
          <select
            className="border rounded px-3 py-2 text-sm w-full"
            value={formData.language}
            onChange={e => update('language', e.target.value)}
          >
            {LANGUAGES.map(lang => (
              <option key={lang.value} value={lang.value}>
                {t(lang.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onSubmit}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
        >
          {submitLabel || t('common.save')}
        </button>
        <button
          onClick={onCancel}
          className="border px-4 py-2 rounded text-sm hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};

export default CampaignForm;
