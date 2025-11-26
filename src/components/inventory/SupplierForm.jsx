import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function SupplierForm({ supplier, onSubmit, onCancel, onManualPayment }) {
    const [formData, setFormData] = useState(supplier || {
        supplier_name: '',
        contact_person: '',
        contact_phone: '',
        contact_email: '',
        supplier_type: 'distributor',
        department: 'both',
        rating: 5,
        payment_terms_description: 'Net 30 Days',
        average_lead_time_days: 7,
        minimum_order_quantity: 1,
        credit_limit_amount: 0,
        status: 'active',
        address: { street: '', city: '', district: '', postal_code: '', country: 'Bangladesh' },
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-2">
            <Card>
                <CardHeader><CardTitle className="text-lg">Business Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Supplier Type *</Label>
                            <Select value={formData.supplier_type} onValueChange={(value) => setFormData({ ...formData, supplier_type: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                                    <SelectItem value="distributor">Distributor</SelectItem>
                                    <SelectItem value="wholesaler">Wholesaler</SelectItem>
                                    <SelectItem value="publisher">Publisher</SelectItem>
                                    <SelectItem value="local_vendor">Local Vendor</SelectItem>
                                    <SelectItem value="international">International</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Department *</Label>
                            <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="boibari">📚 Boibari</SelectItem>
                                    <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com</SelectItem>
                                    <SelectItem value="both">Both Departments</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Rating</Label>
                             <Select value={formData.rating?.toString() || '5'} onValueChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                                    <SelectItem value="4">⭐⭐⭐⭐ Good</SelectItem>
                                    <SelectItem value="3">⭐⭐⭐ Average</SelectItem>
                                    <SelectItem value="2">⭐⭐ Below Average</SelectItem>
                                    <SelectItem value="1">⭐ Poor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Payment Terms</Label>
                            <Input value={formData.payment_terms_description || ''} onChange={(e) => setFormData({ ...formData, payment_terms_description: e.target.value })} placeholder="e.g., Net 30, COD" />
                        </div>
                        <div>
                            <Label>Average Delivery Time (Days)</Label>
                            <Input type="number" min="0" value={formData.average_lead_time_days || 0} onChange={(e) => setFormData({ ...formData, average_lead_time_days: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div>
                            <Label>Minimum Order Quantity</Label>
                            <Input type="number" min="1" value={formData.minimum_order_quantity || 1} onChange={(e) => setFormData({ ...formData, minimum_order_quantity: parseInt(e.target.value) || 1 })} />
                        </div>
                        <div>
                            <Label>Credit Limit Amount (BDT)</Label>
                            <Input type="number" min="0" value={formData.credit_limit_amount || 0} onChange={(e) => setFormData({ ...formData, credit_limit_amount: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                    <SelectItem value="under_review">Under Review</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between items-center sticky bottom-0 bg-white p-4 border-t">
                <div>
                    {supplier && (
                        <Button type="button" variant="outline" onClick={() => onManualPayment(supplier)}>
                            <DollarSign className="w-4 h-4 mr-2" />
                            Manual Payment
                        </Button>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit" className="bg-violet-600 hover:bg-violet-700">{supplier ? 'Update Supplier' : 'Add Supplier'}</Button>
                </div>
            </div>
        </form>
    );
}