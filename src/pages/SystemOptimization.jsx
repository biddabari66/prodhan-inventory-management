import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Database, Archive, Monitor } from 'lucide-react';
import DataArchiver from '../components/common/DataArchiver';
import PerformanceMonitor from '../components/common/PerformanceMonitor';
import DatabaseBackups from '../components/system/DatabaseBackups';

export default function SystemOptimization() {
    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-4xl font-bold font-display text-gradient">System Optimization</h1>
                <p className="text-lg text-muted-foreground mt-1">Monitor performance and optimize system resources.</p>
            </div>

            <Tabs defaultValue="performance" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="performance" className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Performance Monitor
                    </TabsTrigger>
                    <TabsTrigger value="archiver" className="flex items-center gap-2">
                        <Archive className="w-4 h-4" />
                        Data Archiver
                    </TabsTrigger>
                    <TabsTrigger value="backups" className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Database Backups
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="performance" className="mt-6">
                    <PerformanceMonitor />
                </TabsContent>
                
                <TabsContent value="archiver" className="mt-6">
                    <DataArchiver />
                </TabsContent>
                
                <TabsContent value="backups" className="mt-6">
                    <DatabaseBackups />
                </TabsContent>
            </Tabs>
        </div>
    );
}