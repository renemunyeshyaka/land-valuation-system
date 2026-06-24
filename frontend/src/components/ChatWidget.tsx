import { useState, useEffect, useRef } from 'react';
import i18n from '../utils/i18n';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'rw', label: 'RW' },
];

function t(key: string): string {
  return i18n.t(key);
}

export default function ChatWidget() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [langVersion, setLangVersion] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Re-render when language changes
    const onLangChange = () => setLangVersion((v) => v + 1);
    i18n.on('languageChanged', onLangChange);
    return () => { i18n.off('languageChanged', onLangChange); };
  }, []);

  useEffect(() => {
    if (mounted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mounted]);

  if (!mounted) return null;

  // Re-derive on each render so language change triggers update via langVersion
  const curLang = i18n.language?.substring(0, 2) || 'en';
  const langLabel = LANGUAGES.find(l => l.code === curLang)?.label || 'EN';

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: t('chat.greeting') }]);
    }
  };

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to get response');
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err.message || t('chat.error') }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      pricing: t('chat.quickPricing'),
      features: t('chat.quickFeatures'),
      trial: t('chat.quickTrial'),
      templates: t('chat.quickTemplates'),
    };
    sendMessage(prompts[action] || action);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
          aria-label={t('chat.open')}
          title={t('chat.title')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="font-semibold text-sm">{t('chat.title')}</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Language switcher */}
              <div className="relative">
                <button onClick={() => setLangOpen(!langOpen)}
                  className="text-xs bg-green-400 text-green-900 px-1.5 py-0.5 rounded-full font-medium hover:bg-green-300 transition-colors"
                  aria-label="Language"
                >
                  {langLabel} ▾
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[70px]">
                    {LANGUAGES.map((l) => (
                      <button key={l.code} onClick={() => changeLang(l.code)}
                        className={`block w-full text-left px-3 py-1.5 text-xs transition-colors ${curLang === l.code ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        {l.label} — {l.code === 'en' ? 'English' : l.code === 'fr' ? 'Français' : 'Kinyarwanda'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setIsOpen(false); setLangOpen(false); }} className="p-1 hover:bg-blue-500 rounded-full" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {messages.filter((m) => m.role === 'user').length === 0 && (
            <div className="px-3 pb-2 flex flex-wrap gap-2">
              {['pricing','features','trial','templates'].map((action) => (
                <button key={action} onClick={() => handleQuickAction(action)}
                  className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-100 transition-colors"
                >{t('chat.btn' + action.charAt(0).toUpperCase() + action.slice(1))}</button>
              ))}
            </div>
          )}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="flex gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder={t('chat.placeholder')}
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading} />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
