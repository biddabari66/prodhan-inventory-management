import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, RefreshCw, Sparkles, Clock } from 'lucide-react';
import { generateAIInsights } from '@/functions/generateAIInsights';
import { Task } from '@/entities/Task';
import { Lead } from '@/entities/Lead';
import { Expense } from '@/entities/Expense';
import { isToday } from 'date-fns';

export default function InsightsCard({ currentUser }) {
    const [insight, setInsight] = useState("Your personalized insight is loading...");
    const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
    const [lastGenerated, setLastGenerated] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [dashboardData, setDashboardData] = useState({
        tasksDueToday: 0,
        newLeadsToday: 0,
        pendingExpenses: 0
    });

    const loadDashboardData = useCallback(async () => {
        if (!currentUser?.id) return { tasksDueToday: 0, newLeadsToday: 0, pendingExpenses: 0 };
        
        try {
            const [tasks, leads, expenses] = await Promise.all([
                Task.filter({ assigned_to: { $in: [currentUser.id] }, status: { $ne: 'completed' } }).catch(() => []),
                Lead.list('-created_date', 100).catch(() => []),
                Expense.filter({ status: { $in: ['pending_manager_approval', 'pending_finance_approval'] } }).catch(() => [])
            ]);

            const tasksDueToday = tasks.filter(t => t.deadline && isToday(new Date(t.deadline))).length;
            const newLeadsToday = leads.filter(l => l.created_date && isToday(new Date(l.created_date))).length;
            const pendingExpenses = expenses.length;

            const stats = { tasksDueToday, newLeadsToday, pendingExpenses };
            setDashboardData(stats);
            return stats;
        } catch (error) {
            console.error("Failed to load dashboard stats for insights:", error);
            const fallbackStats = { tasksDueToday: 0, newLeadsToday: 0, pendingExpenses: 0 };
            setDashboardData(fallbackStats);
            return fallbackStats;
        }
    }, [currentUser]);

    const generateInsight = useCallback(async (forceRefresh = false) => {
        if (!currentUser) return;
        
        // Check if we need to generate a new insight (every 2.4 hours or forced)
        const now = Date.now();
        const INSIGHT_INTERVAL = 2.4 * 60 * 60 * 1000; // 2.4 hours in milliseconds
        
        if (!forceRefresh && lastGenerated && (now - lastGenerated) < INSIGHT_INTERVAL) {
            return; // Skip if recent insight exists
        }

        setIsGeneratingInsight(true);
        try {
            const stats = await loadDashboardData();
            const response = await generateAIInsights({
                dashboardData: stats,
                userName: currentUser.display_name || currentUser.full_name
            });
            
            if (response.data?.insight) {
                setInsight(response.data.insight);
                setMetadata(response.data.metadata || null);
                setLastGenerated(now);
            } else {
                throw new Error("No insight received");
            }
        } catch (error) {
            console.error("Failed to generate AI insight:", error);
            // Time-based fallback insights
            const hour = new Date().getHours();
            const fallbackInsights = [
                "Your focused energy creates extraordinary results. Keep building momentum!",
                "Every challenge is a stepping stone to greatness. You've got this!",
                "Peak performance starts with peak mindset. Channel your strengths today!",
                "Your dedication is your superpower. Use it to unlock new possibilities!",
                "Excellence is a habit, not an accident. Make today count!"
            ];
            setInsight(fallbackInsights[hour % fallbackInsights.length]);
            setMetadata({ method: 'Contextual Fallback', timeOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening' });
        } finally {
            setIsGeneratingInsight(false);
        }
    }, [currentUser, loadDashboardData, lastGenerated]);

    // Auto-refresh insights periodically
    useEffect(() => {
        generateInsight();
        
        // Set up interval to check for new insights every 30 minutes
        const interval = setInterval(() => {
            generateInsight(false); // Don't force, let the function decide
        }, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, [generateInsight]);

    const formatStats = () => {
        return [
            { label: 'Tasks due', value: dashboardData.tasksDueToday || 0 },
            { label: 'New leads', value: dashboardData.newLeadsToday || 0 },
            { label: 'Pending', value: dashboardData.pendingExpenses || 0 }
        ];
    };

    const getTimeSlotIndicator = () => {
        if (!metadata?.timeSlot) return null;
        return `${metadata.timeSlot}/10`;
    };

    return (
        <Card className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl border border-white/10 text-white shadow-2xl shadow-purple-500/20 mb-4">
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                            <Sparkles className="w-5 h-5 text-purple-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-slate-50">AI Insights</h3>
                            <p className="text-xs text-purple-300">
                                {metadata?.method || 'Powered by AI'}
                                {getTimeSlotIndicator() && ` • ${getTimeSlotIndicator()}`}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => generateInsight(true)}
                        disabled={isGeneratingInsight}
                        className="text-purple-300 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 w-8 h-8"
                    >
                        <RefreshCw className={`w-4 h-4 ${isGeneratingInsight ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                
                <div className="mb-4">
                    <div className="flex items-start gap-2 mb-3">
                        <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-100 leading-relaxed font-medium">
                            {insight}
                        </p>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    {formatStats().map((stat, index) => (
                        <div key={index} className="text-center">
                            <div className="text-lg font-bold text-white">{stat.value}</div>
                            <div className="text-xs text-purple-200">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {metadata?.timeOfDay && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-purple-300">
                        <Clock className="w-3 h-3" />
                        <span className="capitalize">{metadata.timeOfDay.replace('_', ' ')} insight</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}