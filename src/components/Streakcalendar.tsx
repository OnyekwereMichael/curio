import { useState, useEffect } from 'react';
import { Star, Circle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/superbase';

interface ActivityDay {
    activity_date: string;
    quiz_perfect: boolean;
}

export function StreakCalendar() {
    const { user } = useAuth();
    const [activity, setActivity] = useState<ActivityDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        async function fetchActivity() {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data } = await supabase
                .from('user_activity_log')
                .select('activity_date, quiz_perfect')
                .eq('user_id', user?.id)
                .gte('activity_date', thirtyDaysAgo.toISOString().split('T')[0]);

            setActivity(data ?? []);
            setLoading(false);
        }

        fetchActivity();
    }, [user]);

    // Build the last 30 days as a simple grid, most recent last.
    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
    });

    function getDayStatus(dateStr: string) {
        const entry = activity.find((a) => a.activity_date === dateStr);
        if (!entry) return 'none';
        return entry.quiz_perfect ? 'perfect' : 'active';
    }

    if (loading) {
        return <div className="h-24 bg-ink/5 rounded-xl animate-pulse" />;
    }

    return (
        <div className="bg-white rounded-xl border border-ink/5 p-5">
            <p className="text-xs font-bold tracking-wider uppercase text-faded-ink mb-3">Last 30 days</p>
            <div className="grid grid-cols-10 gap-1.5">
                {days.map((dateStr) => {
                    const status = getDayStatus(dateStr);
                    return (
                        <div
                            key={dateStr}
                            title={dateStr}
                            className="aspect-square rounded-md flex items-center justify-center"
                        >
                            {status === 'perfect' ? (
                                <div className="w-full h-full rounded-md bg-gold-stamp/15 flex items-center justify-center">
                                    <Star size={12} className="text-gold-stamp fill-gold-stamp" />
                                </div>
                            ) : status === 'active' ? (
                                <div className="w-full h-full rounded-md bg-moss/15 flex items-center justify-center">
                                    <Circle size={8} className="text-moss fill-moss" />
                                </div>
                            ) : (
                                <div className="w-full h-full rounded-md bg-ink/5" />
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-faded-ink">
                <div className="flex items-center gap-1.5">
                    <Star size={11} className="text-gold-stamp fill-gold-stamp" />
                    <span>Perfect quiz</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Circle size={7} className="text-moss fill-moss" />
                    <span>Active</span>
                </div>
            </div>
        </div>
    );
}