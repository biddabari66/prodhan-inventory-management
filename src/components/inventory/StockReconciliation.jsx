import React, { useState, useEffect } from 'react';
import { Inventory } from '@/entities/Inventory';
import { InventoryMovement } from '@/entities/InventoryMovement';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardCheck, AlertTriangle, CheckCircle, X, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function StockReconciliation({ onReconciliationComplete }) {
    const [inventory, setInventory] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReconciling, setIsReconciling] = useState(false);
    const [physicalCounts, setPhysicalCounts] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [inventoryData, user] = await Promise.all([
                Inventory.list().catch(() => []),
                User.me().catch(() => null)
            ]);
            
            setInventory(Array.isArray(inventoryData) ? inventoryData : []);
            setCurrentUser(user);
            
            // Initialize physical counts with current stock
            const initialCounts = {};
            if (Array.isArray(inventoryData)) {
                inventoryData.forEach(item => {
                    if (item && item.id) {
                        initialCounts[item.id] = {
                            physical_count: item.current_stock || 0,
                            notes: ''
                        };
                    }
                });
            }
            setPhysicalCounts(initialCounts);
        } catch (error) {
            console.error('Error loading reconciliation data:', error);
            toast.error('Failed to load inventory data');
            setInventory([]);
            setPhysicalCounts({});
        } finally {
            setIsLoading(false);
        }
    };

    const updatePhysicalCount = (itemId, field, value) => {
        setPhysicalCounts(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                [field]: field === 'physical_count' ? parseInt(value) || 0 : value
            }
        }));
    };

    const calculateDiscrepancies = () => {
        if (!Array.isArray(inventory) || !physicalCounts) return [];
        
        const discrepancyList = [];
        
        inventory.forEach(item => {
            if (!item || !item.id) return;
            
            const physicalCount = physicalCounts[item.id]?.physical_count || 0;
            const systemCount = item.current_stock || 0;
            const variance = physicalCount - systemCount;
            
            if (variance !== 0) {
                discrepancyList.push({
                    item,
                    systemCount,
                    physicalCount,
                    variance,
                    valueVariance: variance * (item.purchase_price || 0),
                    notes: physicalCounts[item.id]?.notes || ''
                });
            }
        });
        
        return discrepancyList;
    };

    const handleReconcile = async () => {
        if (!currentUser) {
            toast.error('User not authenticated');
            return;
        }

        const discrepancies = calculateDiscrepancies();
        
        if (discrepancies.length === 0) {
            toast.info('No discrepancies found. Stock is accurate.');
            return;
        }

        setIsReconciling(true);
        try {
            const reconciliationPromises = discrepancies.map(async (discrepancy) => {
                // Update inventory stock
                await Inventory.update(discrepancy.item.id, {
                    current_stock: discrepancy.physicalCount
                });

                // Log the adjustment
                await InventoryMovement.create({
                    inventory_item_id: discrepancy.item.id,
                    movement_type: 'adjustment',
                    quantity: discrepancy.variance,
                    reference_type: 'adjustment',
                    reference_id: 'reconciliation',
                    reference_number: `REC-${Date.now()}`,
                    unit_cost: discrepancy.item.purchase_price || 0,
                    total_value: discrepancy.valueVariance,
                    performed_by: currentUser.id,
                    notes: `Stock reconciliation: ${discrepancy.notes || 'Physical count adjustment'}`,
                    movement_date: new Date().toISOString().split('T')[0],
                    balance_after: discrepancy.physicalCount
                });
            });

            await Promise.all(reconciliationPromises);
            
            toast.success(`Reconciliation completed! ${discrepancies.length} items adjusted.`);
            
            if (onReconciliationComplete) {
                onReconciliationComplete();
            }
            
            // Reload data to refresh the view
            await loadData();
            
        } catch (error) {
            console.error('Reconciliation error:', error);
            toast.error('Failed to complete reconciliation');
        } finally {
            setIsReconciling(false);
        }
    };

    const getVarianceColor = (variance) => {
        if (variance > 0) return 'text-green-600';
        if (variance < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getVarianceBadgeColor = (variance) => {
        if (variance > 0) return 'bg-green-100 text-green-800';
        if (variance < 0) return 'bg-red-100 text-red-800';
        return 'bg-gray-100 text-gray-800';
    };

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                <p className="mt-2 text-muted-foreground">Loading stock reconciliation...</p>
            </div>
        );
    }

    if (!Array.isArray(inventory) || inventory.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4" />
                <p>No inventory items found for reconciliation.</p>
            </div>
        );
    }

    const pendingDiscrepancies = calculateDiscrepancies();

    return (
        <Card className="premium-card">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                            <ClipboardCheck className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle>Stock Reconciliation</CardTitle>
                            <p className="text-sm text-muted-foreground">Compare physical counts with system records</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {pendingDiscrepancies.length > 0 && (
                            <Badge className="bg-orange-100 text-orange-800">
                                {pendingDiscrepancies.length} Discrepancies
                            </Badge>
                        )}
                        <Button 
                            onClick={handleReconcile}
                            disabled={isReconciling || pendingDiscrepancies.length === 0}
                            className="btn-primary"
                        >
                            {isReconciling ? (
                                <>
                                    <Save className="w-4 h-4 mr-2 animate-spin" />
                                    Reconciling...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Complete Reconciliation
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>System Count</TableHead>
                                <TableHead>Physical Count</TableHead>
                                <TableHead>Variance</TableHead>
                                <TableHead>Value Impact</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inventory.map((item) => {
                                if (!item || !item.id) return null;
                                
                                const systemCount = item.current_stock || 0;
                                const physicalCount = physicalCounts[item.id]?.physical_count || 0;
                                const variance = physicalCount - systemCount;
                                const valueImpact = variance * (item.purchase_price || 0);

                                return (
                                    <TableRow key={item.id} className={variance !== 0 ? 'bg-orange-50' : ''}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{item.item_name}</p>
                                                <p className="text-sm text-muted-foreground">{item.category}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{systemCount}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={physicalCount}
                                                onChange={(e) => updatePhysicalCount(item.id, 'physical_count', e.target.value)}
                                                className="w-24"
                                                min="0"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getVarianceBadgeColor(variance)}>
                                                <span className={getVarianceColor(variance)}>
                                                    {variance > 0 ? '+' : ''}{variance}
                                                </span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={getVarianceColor(valueImpact)}>
                                                ৳{Math.abs(valueImpact).toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Textarea
                                                placeholder="Reconciliation notes..."
                                                value={physicalCounts[item.id]?.notes || ''}
                                                onChange={(e) => updatePhysicalCount(item.id, 'notes', e.target.value)}
                                                className="min-h-[60px] text-xs"
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {pendingDiscrepancies.length > 0 && (
                    <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <h4 className="font-semibold text-orange-800">Pending Reconciliation Summary</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="font-medium">Total Discrepancies:</p>
                                <p className="text-lg font-bold text-orange-600">{pendingDiscrepancies.length}</p>
                            </div>
                            <div>
                                <p className="font-medium">Total Value Impact:</p>
                                <p className="text-lg font-bold">
                                    ৳{Math.abs(pendingDiscrepancies.reduce((sum, d) => sum + d.valueVariance, 0)).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium">Items Over/Under:</p>
                                <p className="text-lg">
                                    <span className="text-green-600">+{pendingDiscrepancies.filter(d => d.variance > 0).length}</span>
                                    {' / '}
                                    <span className="text-red-600">-{pendingDiscrepancies.filter(d => d.variance < 0).length}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}