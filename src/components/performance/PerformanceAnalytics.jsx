import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Button } from '@/components/ui/button';
import { BrainCircuit } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import { toast } from 'sonner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4d'];

export default function PerformanceAnalytics({ tasks, dailyLogs, users }) {
    const [aiInsight, setAiInsight] = useState(null);
    const [isLoadingInsight, setIsLoadingInsight] = useState(false);

    const analyticsData = useMemo(() => {
        // Ensure tasks is always an array
        const safeTasks = Array.isArray(tasks) ? tasks : [];
        
        if (safeTasks.length === 0) return null;

        const statusCounts = safeTasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});
        const statusChartData = Object.keys(statusCounts).map(key => ({ name: key.replace('_', ' '), count: statusCounts[key] }));

        const priorityCounts = safeTasks.reduce((acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
        }, {});
        const priorityChartData = Object.keys(priorityCounts).map(key => ({ name: key, value: priorityCounts[key] }));
        
        return { statusChartData, priorityChartData };
    }, [tasks]);

    const getAiInsight = async () => {
        setIsLoadingInsight(true);
        setAiInsight(null);
        try {
            const safeTasks = Array.isArray(tasks) ? tasks : [];
            const prompt = `
                Analyze the following team task performance data and provide a concise summary with 3 actionable insights for a manager.
                Data:
                - Task Statuses: ${JSON.stringify(analyticsData?.statusChartData || [])}
                - Task Priorities: ${JSON.stringify(analyticsData?.priorityChartData || [])}
                - Total tasks: ${safeTasks.length}
                
                Format your response as a JSON object with two keys: "summary" (a 1-2 sentence overview) and "insights" (an array of 3 strings).
            `;
            const result = await InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        summary: { type: "string" },
                        insights: { type: "array", items: { type: "string" } }
                    }
                }
            });
            setAiInsight(result);
        } catch (error) {
            toast.error("Failed to get AI insight.");
            console.error(error);
        } finally {
            setIsLoadingInsight(false);
        }
    };

    if (!analyticsData) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No task data available for analytics.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI-Powered Performance Insights</CardTitle>
                    <CardDescription>Click the button to get an AI-generated summary of your team's performance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={getAiInsight} disabled={isLoadingInsight}>
                        <BrainCircuit className="w-4 h-4 mr-2"/>
                        {isLoadingInsight ? "Analyzing..." : "Generate AI Insight"}
                    </Button>
                    {aiInsight && (
                        <div className="mt-4 p-4 bg-violet-50 border border-violet-200 rounded-lg space-y-3">
                            <h4 className="font-semibold text-violet-800">AI Summary</h4>
                            <p className="text-sm text-violet-700">{aiInsight.summary}</p>
                            <h4 className="font-semibold text-violet-800">Actionable Insights</h4>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-violet-700">
                                {Array.isArray(aiInsight.insights) ? aiInsight.insights.map((insight, i) => <li key={i}>{insight}</li>) : null}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Tasks by Status</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analyticsData.statusChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Tasks by Priority</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                           <PieChart>
                                <Pie data={analyticsData.priorityChartData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label>
                                    {analyticsData.priorityChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}