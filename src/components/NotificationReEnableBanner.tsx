import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, X, Check, AlertCircleIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';
import logo from '../../public/icon-192.png';

export function NotificationReEnableBanner() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [show, setShow] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const wasPrompted = localStorage.getItem('notification_prompted') === 'true';
        if (!user || !wasPrompted) return;

        async function checkStatus() {
            const { data } = await supabase
                .from('users')
                .select('notifications_enabled')
                .eq('id', user?.id)
                .maybeSingle();

            if (data && data.notifications_enabled === false) {
                setShow(true);
            }
        }

        checkStatus();
    }, [user]);

    if (!show) return null;

    return (
        <>
            <div className="bg-white border-b border-ink/10 px-4 py-3 flex items-center gap-3 shadow-sm font-ui">
                <div className="w-9 h-9 rounded-full bg-gold-stamp/10 flex items-center justify-center flex-shrink-0">
                    <BellOff size={16} className="text-gold-stamp" />
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="font-semibold text-ink text-sm leading-tight font-display flex items-center gap-2">
                        Push Notification is off
                        <button onClick={() => setShowModal(true)} className="text-[11px] text-ember hover:underline font-medium">Why enable this?</button>
                    </h3>
                    <p className="text-xs text-faded-ink mt-0.5 truncate font-display">Turn it back on so you never miss your daily word</p>
                </div>

                <button
                    onClick={() => navigate('/settings')}
                    className="text-xs font-medium text-ember hover:text-ember/80 transition-colors whitespace-nowrap flex-shrink-0 px-3 py-2"
                >
                    Enable
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-ink/5">
                            <h2 className="font-display font-bold text-lg text-ink">Why enable notifications?</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 text-faded-ink hover:text-ink rounded-full hover:bg-ink/5 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-5 font-ui">
                            <div className="mb-6 relative perspective-1000">
                              <div className="absolute inset-0 bg-gradient-to-br from-ember/20 to-gold-stamp/20 blur-2xl -z-10 rounded-full animate-pulse" />
                              
                              <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/80 shadow-[0_4px_20px_rgb(0,0,0,0.06)] p-3 mx-auto">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    <img src={logo} alt="Curi Logo" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0 flex-1 font-display">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[12px] font-semibold text-ink">Curi</span>
                                      <span className="text-[10px] text-faded-ink">now</span>
                                    </div>
                                    <p className="text-[13px] font-semibold text-ink leading-snug">
                                      Your daily word is ready: Sonder
                                    </p>
                                    <p className="text-[12px] text-faded-ink mt-0.5 leading-snug truncate">
                                      the realization that each random passerby has a life as vivid and complex as your own.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="flex items-start gap-3 text-ink font-display">
                                <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                                <div>
                                  <span className="block font-semibold text-[14px]">Keep your streak alive</span>
                                  <span className="block text-[12px] text-faded-ink mt-0.5 leading-snug">The easiest way to stay consistent and build a learning habit.</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-3 text-ink font-display">
                                <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <AlertCircleIcon size={12} strokeWidth={2.5} />
                                </div>
                                <div>
                                  <span className="block font-semibold text-[14px]">Zero spam. Just one reminder.</span>
                                  <span className="block text-[12px] text-faded-ink mt-0.5 leading-snug">We only send you one notification a day, right when it's ready.</span>
                                </div>
                              </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-ink/[0.02] border-t border-ink/5">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    navigate('/settings');
                                }}
                                className="w-full bg-ink text-white font-display font-medium rounded-xl py-3 hover:bg-ink/90 transition-colors"
                            >
                                Go to Settings to Enable
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}