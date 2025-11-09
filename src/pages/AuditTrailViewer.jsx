import React, { useState, useEffect } from 'react';
import { AuditLog } from '@/entities/AuditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { FileText, Search } from 'lucide-react';

export default function AuditTrailViewer() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const auditLogs = await AuditLog.list('-timestamp', 200);
            setLogs(auditLogs);
        } catch (error) {
            console.error("Failed to load audit logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return <div className="p-8">Loading Audit Trail...</div>;
    }

    return (
        <div className="p-8 space-y-6">
            <h1 className="text-4xl font-bold font-display text-gradient">System Audit Trail</h1>
            <p className="text-lg text-muted-foreground">Track all significant user actions across the system.</p>
            
            <Card className="premium-card">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                            <FileText />
                            Activity Logs
                        </CardTitle>
                        <div className="relative w-1/3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Module</TableHead>
                                <TableHead>Description</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell>{format(new Date(log.timestamp), 'PPpp')}</TableCell>
                                    <TableCell>{log.user_name}</TableCell>
                                    <TableCell>
                                        <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{log.action.toUpperCase()}</span>
                                    </TableCell>
                                    <TableCell>{log.module}</TableCell>
                                    <TableCell>{log.description}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}