import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  ThumbsUp, 
  ThumbsDown,
  Search,
  Globe,
  Clock,
  BarChart3,
  Lightbulb,
  RefreshCw,
  Download,
  Sparkles
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { withPermission } from '../components/common/PermissionGuard';

const COLORS = ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

function FeludaAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentFeedback, setRecentFeedback] = useState([]);

  useEffect(() => {
    loadAnalytics();
    loadRecentFeedback();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('feludaLearningAnalytics', {});
      
      if (response.data.success) {
        setAnalytics(response.data.analytics);
        toast.success('Analytics loaded successfully');
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentFeedback = async () => {
    try {
      const feedback = await base44.entities.FeludaFeedback.list('-created_date', 50);
      setRecentFeedback(feedback);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    }
  };

  const exportAnalytics = () => {
    if (!analytics) return;

    const csvContent = `Feluda Learning Analytics Report
Generated: ${new Date().toLocaleString()}

Overview:
Total Interactions: ${analytics.overview.totalInteractions}
Helpful Responses: ${analytics.overview.helpfulResponses}
Helpfulness Rate: ${analytics.overview.helpfulnessRate}%
Avg Response Time: ${Math.round(analytics.overview.avgResponseTime)}ms

Top Questions:
${analytics.topQuestions.map((q, i) => `${i + 1}. "${q.question}" (${q.count} times)`).join('\n')}

Language Stats:
English: ${analytics.languageStats.en}
Bengali: ${analytics.languageStats.bn}
`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feluda-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Analytics exported!');
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 animate-spin text-amber-600 mx-auto" />
          <p className="text-muted-foreground">Loading Feluda's learning data...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">No analytics data available yet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const languageData = [
    { name: 'English', value: analytics.languageStats.en, color: '#7C3AED' },
    { name: 'Bengali', value: analytics.languageStats.bn, color: '#EC4899' }
  ];

  const pageData = analytics.pageAnalysis.map(p => ({
    name: p.page.replace('/', ''),
    helpfulness: parseFloat(p.helpfulnessRate),
    total: p.total
  }));

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-2xl">
              🕵️
            </div>
            <div>
              <h1 className="text-3xl font-bold font-display text-gradient">
                Feluda Learning Analytics
              </h1>
              <p className="text-muted-foreground">AI performance insights & improvement tracking</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAnalytics} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportAnalytics} className="bg-amber-600 hover:bg-amber-700">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Interactions</p>
                <p className="text-3xl font-bold text-violet-600">{analytics.overview.totalInteractions}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-violet-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Helpfulness Rate</p>
                <p className="text-3xl font-bold text-green-600">{analytics.overview.helpfulnessRate}%</p>
              </div>
              <ThumbsUp className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                <p className="text-3xl font-bold text-blue-600">
                  {Math.round(analytics.overview.avgResponseTime)}ms
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Helpful Responses</p>
                <p className="text-3xl font-bold text-amber-600">{analytics.overview.helpfulResponses}</p>
              </div>
              <Sparkles className="w-8 h-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions */}
      {analytics.suggestions.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Lightbulb className="w-5 h-5" />
              AI Improvement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <p className="text-sm text-amber-900">{suggestion}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="questions">Top Questions</TabsTrigger>
          <TabsTrigger value="best">Best Responses</TabsTrigger>
          <TabsTrigger value="pages">Page Analysis</TabsTrigger>
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="recent">Recent Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Most Common Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topQuestions.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Badge className="bg-violet-600">{index + 1}</Badge>
                      <p className="text-sm font-medium">{item.question}</p>
                    </div>
                    <Badge variant="outline">{item.count}x asked</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="best">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                Most Helpful Responses (Learning Database)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.bestResponses.map((item, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className="bg-green-600">{index + 1}</Badge>
                      <Badge variant="outline">{item.count}x helpful</Badge>
                    </div>
                    <p className="font-semibold text-sm mb-2">Q: {item.question}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      A: {item.response}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-500">
                        Avg {Math.round(item.avgResponseTime)}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Helpfulness by Page</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={pageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="helpfulness" fill="#7C3AED" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="languages">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="premium-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Language Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={languageData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {languageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card">
              <CardHeader>
                <CardTitle>Language Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">English</span>
                    <Badge className="bg-violet-600">{analytics.languageStats.en} interactions</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {((analytics.languageStats.en / analytics.overview.totalInteractions) * 100).toFixed(1)}% of total
                  </div>
                </div>

                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">বাংলা (Bengali)</span>
                    <Badge className="bg-pink-600">{analytics.languageStats.bn} interactions</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {((analytics.languageStats.bn / analytics.overview.totalInteractions) * 100).toFixed(1)}% of total
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💡 {analytics.languageStats.bn > analytics.languageStats.en 
                      ? 'Bengali is the primary language. Consider enhancing Bengali content.'
                      : 'English is the primary language. Maintain current balance.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recent">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>Recent User Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentFeedback.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No feedback received yet</p>
                  </div>
                ) : (
                  recentFeedback.slice(0, 20).map((feedback) => (
                    <div 
                      key={feedback.id} 
                      className={`p-4 rounded-lg border ${
                        feedback.was_helpful 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {feedback.language === 'en' ? '🇬🇧 EN' : '🇧🇩 BN'}
                          </Badge>
                          <Badge variant="outline">{feedback.page_context}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {feedback.was_helpful ? (
                            <>
                              <ThumbsUp className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-green-700">Helpful</span>
                            </>
                          ) : (
                            <>
                              <ThumbsDown className="w-4 h-4 text-red-600" />
                              <span className="text-xs text-red-700">Not Helpful</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm font-medium mb-1">
                        <strong>Q:</strong> {feedback.user_question}
                      </p>
                      
                      {feedback.feedback_text && (
                        <div className="mt-2 p-2 bg-white/60 rounded text-xs italic">
                          "{feedback.feedback_text}"
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{feedback.user_name}</span>
                        <span>•</span>
                        <span>{new Date(feedback.created_date).toLocaleDateString()}</span>
                        {feedback.response_time_ms && (
                          <>
                            <span>•</span>
                            <span>{Math.round(feedback.response_time_ms)}ms</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FeludaAnalyticsPage;