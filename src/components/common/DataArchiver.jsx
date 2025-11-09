import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Archive, Database, Calendar, HardDrive, AlertCircle } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { toast } from 'sonner';

export default function DataArchiver() {
    const [archiveStats, setArchiveStats] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isArchiving, setIsArchiving] = useState(false);
    const [archiveProgress, setArchiveProgress] = useState(0);
    const [selectedEntity, setSelectedEntity] = useState('');
    const [archivePeriod, setArchivePeriod] = useState('6months');

    const archiveableEntities = [
        { id: 'Lead', name: 'Leads', description: 'Old leads that are closed/lost' },
        { id: 'Expense', name: 'Expenses', description: 'Approved/rejected expenses older than period' },
        { id: 'Income', name: 'Income', description: 'Income records older than period' },
        { id: 'InventoryMovement', name: 'Inventory Movements', description: 'Historical stock movements' },
        { id: 'Attendance', name: 'Attendance', description: 'Old attendance records' },
        { id: 'AuditLog', name: 'Audit Logs', description: 'System audit trails' }
    ];

    useEffect(() => {
        loadArchiveStats();
    }, []);

    const loadArchiveStats = async () => {
        setIsLoading(true);
        try {
            // Simulate loading archive statistics
            // In real implementation, this would query each entity for record counts
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const stats = {
                Lead: { total: 5420, archivable: 1230, size: '45MB' },
                Expense: { total: 3200, archivable: 890, size: '22MB' },
                Income: { total: 2100, archivable: 450, size: '15MB' },
                InventoryMovement: { total: 8900, archivable: 3200, size: '78MB' },
                Attendance: { total: 12000, archivable: 4500, size: '92MB' },
                AuditLog: { total: 25000, archivable: 15000, size: '180MB' }
            };
            
            setArchiveStats(stats);
        } catch (error) {
            console.error('Error loading archive stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getCutoffDate = () => {
        const now = new Date();
        switch (archivePeriod) {
            case '3months': return subMonths(now, 3);
            case '6months': return subMonths(now, 6);
            case '1year': return subMonths(now, 12);
            case '2years': return subMonths(now, 24);
            default: return subMonths(now, 6);
        }
    };

    const handleArchive = async () => {
        if (!selectedEntity) {
            toast.error('Please select an entity to archive');
            return;
        }

        setIsArchiving(true);
        setArchiveProgress(0);

        try {
            const cutoffDate = getCutoffDate();
            const entity = archiveableEntities.find(e => e.id === selectedEntity);
            
            // Simulate archiving process with progress updates
            for (let i = 0; i <= 100; i += 10) {
                setArchiveProgress(i);
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            // In real implementation, this would:
            // 1. Query records older than cutoffDate
            // 2. Export to archive storage (S3, separate DB, etc.)
            // 3. Verify archive integrity
            // 4. Delete archived records from active tables
            // 5. Update archive metadata

            toast.success(`Successfully archived ${entity?.name} records older than ${format(cutoffDate, 'MMM dd, yyyy')}`);
            await loadArchiveStats(); // Reload stats

        } catch (error) {
            console.error('Archive error:', error);
            toast.error('Failed to archive data');
        } finally {
            setIsArchiving(false);
            setArchiveProgress(0);
        }
    };

    const getTotalArchivable = () => {
        return Object.values(archiveStats).reduce((sum, stat) => sum + (stat?.archivable || 0), 0);
    };

    const getTotalSize = () => {
        const sizes = Object.values(archiveStats).map(stat => {
            const sizeStr = stat?.size || '0MB';
            const size = parseFloat(sizeStr.replace('MB', ''));
            return size;
        });
        return sizes.reduce((sum, size) => sum + size, 0).toFixed(1);
    };

    if (isLoading) {
        return <div className="p-4">Loading archive statistics...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="premium-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <Database className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Total Records</p>
                                <p className="text-3xl font-bold text-blue-600">
                                    {Object.values(archiveStats).reduce((sum, stat) => sum + (stat?.total || 0), 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="premium-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <Archive className="w-8 h-8 text-orange-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Archivable Records</p>
                                <p className="text-3xl font-bold text-orange-600">{getTotalArchivable().toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="premium-card">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <HardDrive className="w-8 h-8 text-green-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Potential Space Saved</p>
                                <p className="text-3xl font-bold text-green-600">{getTotalSize()}MB</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Archive Configuration */}
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Archive className="w-5 h-5" />
                        Data Archiving Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Archiving moves old data to long-term storage and removes it from active tables to improve performance. 
                            Archived data can still be accessed but with slower query times.
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Select Entity to Archive</label>
                            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose entity type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {archiveableEntities.map(entity => (
                                        <SelectItem key={entity.id} value={entity.id}>
                                            {entity.name} - {archiveStats[entity.id]?.archivable || 0} records
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Archive Period</label>
                            <Select value={archivePeriod} onValueChange={setArchivePeriod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3months">Older than 3 months</SelectItem>
                                    <SelectItem value="6months">Older than 6 months</SelectItem>
                                    <SelectItem value="1year">Older than 1 year</SelectItem>
                                    <SelectItem value="2years">Older than 2 years</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {selectedEntity && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-medium mb-2">
                                {archiveableEntities.find(e => e.id === selectedEntity)?.name} Archive Preview
                            </h4>
                            <p className="text-sm text-muted-foreground mb-3">
                                {archiveableEntities.find(e => e.id === selectedEntity)?.description}
                            </p>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Records to archive:</span>
                                    <div className="font-medium">{archiveStats[selectedEntity]?.archivable || 0}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Space to free:</span>
                                    <div className="font-medium">{archiveStats[selectedEntity]?.size || '0MB'}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Cutoff date:</span>
                                    <div className="font-medium">{format(getCutoffDate(), 'MMM dd, yyyy')}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {isArchiving && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Archiving in progress...</span>
                                <span className="text-sm text-muted-foreground">{archiveProgress}%</span>
                            </div>
                            <Progress value={archiveProgress} className="w-full" />
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button 
                            onClick={handleArchive}
                            disabled={!selectedEntity || isArchiving}
                            className="btn-primary"
                        >
                            {isArchiving ? 'Archiving...' : 'Start Archive Process'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Entity Statistics */}
            <Card className="premium-card">
                <CardHeader>
                    <CardTitle>Entity Archive Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {archiveableEntities.map(entity => {
                            const stats = archiveStats[entity.id];
                            if (!stats) return null;

                            const archivePercentage = (stats.archivable / stats.total) * 100;

                            return (
                                <div key={entity.id} className="p-4 border rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-medium">{entity.name}</h4>
                                        <div className="text-sm text-muted-foreground">{stats.size}</div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">{entity.description}</p>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-sm">
                                            <span className="font-medium">{stats.archivable.toLocaleString()}</span> of <span className="font-medium">{stats.total.toLocaleString()}</span> records archivable
                                        </div>
                                        <div className="text-sm font-medium">{archivePercentage.toFixed(1)}%</div>
                                    </div>
                                    <Progress value={archivePercentage} className="h-2" />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}