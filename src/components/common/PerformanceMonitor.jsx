import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Monitor, Zap, Clock, Database, Users, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function PerformanceMonitor() {
    const [metrics, setMetrics] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [performanceHistory, setPerformanceHistory] = useState([]);

    useEffect(() => {
        loadMetrics();
        const interval = setInterval(loadMetrics, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const loadMetrics = async (manual = false) => {
        if (manual) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            // Simulate performance metrics gathering
            await new Promise(resolve => setTimeout(resolve, 1000));

            const now = new Date();
            const newMetrics = {
                responseTime: Math.random() * 1000 + 500, // 500-1500ms
                throughput: Math.random() * 100 + 50, // 50-150 requests/sec
                errorRate: Math.random() * 2, // 0-2%
                activeUsers: Math.floor(Math.random() * 50) + 20, // 20-70 users
                dbConnections: Math.floor(Math.random() * 20) + 10, // 10-30 connections
                memoryUsage: Math.random() * 30 + 40, // 40-70%
                cpuUsage: Math.random() * 20 + 30, // 30-50%
                diskUsage: Math.random() * 10 + 60, // 60-70%
                cacheHitRate: Math.random() * 20 + 80, // 80-100%
                timestamp: now
            };

            setMetrics(newMetrics);

            // Add to history (keep last 24 points)
            setPerformanceHistory(prev => {
                const updated = [...prev, {
                    time: now.toLocaleTimeString(),
                    responseTime: newMetrics.responseTime,
                    throughput: newMetrics.throughput,
                    errorRate: newMetrics.errorRate,
                    activeUsers: newMetrics.activeUsers
                }];
                return updated.slice(-24);
            });

        } catch (error) {
            console.error('Error loading metrics:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const getHealthStatus = () => {
        if (!metrics.responseTime) return { status: 'unknown', color: 'bg-gray-100 text-gray-800' };
        
        const issues = [
            metrics.responseTime > 3000,
            metrics.errorRate > 1,
            metrics.memoryUsage > 80,
            metrics.cpuUsage > 70
        ].filter(Boolean).length;

        if (issues === 0) return { status: 'healthy', color: 'bg-green-100 text-green-800' };
        if (issues <= 2) return { status: 'warning', color: 'bg-yellow-100 text-yellow-800' };
        return { status: 'critical', color: 'bg-red-100 text-red-800' };
    };

    const getMetricStatus = (value, thresholds) => {
        if (value <= thresholds.good) return { color: 'text-green-600', status: 'good' };
        if (value <= thresholds.warning) return { color: 'text-yellow-600', status: 'warning' };
        return { color: 'text-red-600', status: 'critical' };
    };

    if (isLoading) {
        return <div className="p-4">Loading performance metrics...</div>;
    }

    const healthStatus = getHealthStatus();

    return (
        <div className="space-y-6">
            {/* System Health Overview */}
            <Card className="premium-card">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                            <Monitor className="w-5 h-5" />
                            System Performance Monitor
                        </CardTitle>
                        <div className="flex items-center gap-3">
                            <Badge className={healthStatus.color}>
                                {healthStatus.status === 'healthy' && <CheckCircle className="w-4 h-4 mr-1" />}
                                {healthStatus.status === 'warning' && <AlertTriangle className="w-4 h-4 mr-1" />}
                                {healthStatus.status === 'critical' && <AlertTriangle className="w-4 h-4 mr-1" />}
                                System {healthStatus.status.toUpperCase()}
                            </Badge>
                            <Button 
                                onClick={() => loadMetrics(true)} 
                                disabled={isRefreshing}
                                variant="outline" 
                                size="sm"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {healthStatus.status !== 'healthy' && (
                        <Alert className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                {healthStatus.status === 'critical' 
                                    ? 'System performance is critically degraded. Immediate attention required.'
                                    : 'System performance is below optimal. Consider investigating potential issues.'
                                }
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="premium-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <Clock className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                                <p className={`text-3xl font-bold ${getMetricStatus(metrics.responseTime, {good: 1000, warning: 3000}).color}`}>
                                    {Math.round(metrics.responseTime)}ms
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <Zap className="w-8 h-8 text-green-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Throughput</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {Math.round(metrics.throughput)}/s
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Error Rate</p>
                                <p className={`text-3xl font-bold ${getMetricStatus(metrics.errorRate, {good: 0.5, warning: 1}).color}`}>
                                    {metrics.errorRate.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-purple-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Active Users</p>
                                <p className="text-3xl font-bold text-purple-600">
                                    {metrics.activeUsers}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle>Response Time Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <LineChart data={performanceHistory}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => [`${Math.round(value)}ms`, 'Response Time']} />
                                    <Line type="monotone" dataKey="responseTime" stroke="#3B82F6" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardHeader>
                        <CardTitle>Active Users & Throughput</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <AreaChart data={performanceHistory}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="activeUsers" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                                    <Area type="monotone" dataKey="throughput" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Resource Usage */}
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        Resource Usage
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Memory Usage</span>
                                <span className="text-sm text-muted-foreground">{metrics.memoryUsage.toFixed(1)}%</span>
                            </div>
                            <Progress value={metrics.memoryUsage} className="h-2" />
                            {metrics.memoryUsage > 80 && (
                                <p className="text-xs text-red-600">High memory usage detected</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">CPU Usage</span>
                                <span className="text-sm text-muted-foreground">{metrics.cpuUsage.toFixed(1)}%</span>
                            </div>
                            <Progress value={metrics.cpuUsage} className="h-2" />
                            {metrics.cpuUsage > 70 && (
                                <p className="text-xs text-red-600">High CPU usage detected</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Disk Usage</span>
                                <span className="text-sm text-muted-foreground">{metrics.diskUsage.toFixed(1)}%</span>
                            </div>
                            <Progress value={metrics.diskUsage} className="h-2" />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Cache Hit Rate</span>
                                <span className="text-sm text-muted-foreground">{metrics.cacheHitRate.toFixed(1)}%</span>
                            </div>
                            <Progress value={metrics.cacheHitRate} className="h-2" />
                            {metrics.cacheHitRate < 85 && (
                                <p className="text-xs text-yellow-600">Cache performance could be improved</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Database Connections */}
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle>Database Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{metrics.dbConnections}</div>
                            <div className="text-sm text-blue-600">Active Connections</div>
                        </div>
                        
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {(Math.random() * 50 + 20).toFixed(1)}ms
                            </div>
                            <div className="text-sm text-green-600">Avg Query Time</div>
                        </div>
                        
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {Math.floor(Math.random() * 1000 + 500)}
                            </div>
                            <div className="text-sm text-purple-600">Queries/Min</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}