import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star } from 'lucide-react';

const defaultForm = {
  supplier_name: '', supplier_code: '', contact_person: '', contact_phone: '',
  contact_email: '', alternate_phone: '', supplier_type: 'distributor',
  address: { street: '', city: '', district: '', postal_code: '', country: 'Bangladesh' },
  payment_terms: 'cod', credit_limit: 0, delivery_time_days: 7, minimum_order_quantity: 1,
  department: 'prodhan_com_e_commerce', rating: 5, status: 'active',
  bank_details: { bank_name: '', account_number: '', account_name: '', branch: '', routing_number: '' },
  notes: ''
};

export default function SupplierForm({ supplier, onSubmit, onCancel }) {
  const [form, setForm] = useState(supplier ? { ...defaultForm, ...supplier, address: { ...defaultForm.address, ...(supplier.address || {}) }, bank_details: { ...defaultForm.bank_details, ...(supplier.bank_details || {}) } } : defaultForm);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = (e) => { e.preventDefault(); onSubmit(form); };
  const setAddr = (k, v) => setForm({ ...form, address: { ...form.address, [k]: v } });
  const setBank = (k, v) => setForm({ ...form, bank_details: { ...form.bank_details, [k]: v } });

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[72vh] overflow-y-auto pr-1 mt-4">
      {/* Basic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-medium text-slate-500">Supplier Name *</Label>
          <Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Supplier Code</Label>
          <Input value={form.supplier_code} onChange={(e) => setForm({ ...form, supplier_code: e.target.value })} placeholder="Auto-generated" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Contact Person *</Label>
          <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Primary Phone *</Label>
          <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Email</Label>
          <Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Alternate Phone</Label>
          <Input value={form.alternate_phone} onChange={(e) => setForm({ ...form, alternate_phone: e.target.value })} className="mt-1" />
        </div>
      </div>

      {/* Business */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div>
          <Label className="text-xs font-medium text-slate-500">Supplier Type *</Label>
          <Select value={form.supplier_type} onValueChange={(v) => setForm({ ...form, supplier_type: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
          <Label className="text-xs font-medium text-slate-500">Department *</Label>
          <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prodhan_com_e_commerce">🛒 Prodhan.com</SelectItem>
              <SelectItem value="boibari">📚 Boibari</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Rating</Label>
          <div className="flex items-center gap-1 mt-2 h-9">
            {[1, 2, 3, 4, 5].map(i => (
              <button key={i} type="button" onMouseEnter={() => setHoverRating(i)} onMouseLeave={() => setHoverRating(0)}
                onClick={() => setForm({ ...form, rating: i })}>
                <Star className={`w-6 h-6 transition-colors ${i <= (hoverRating || form.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Payment Terms</Label>
          <Select value={form.payment_terms} onValueChange={(v) => setForm({ ...form, payment_terms: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cod">Cash on Delivery</SelectItem>
              <SelectItem value="net_15">Net 15 Days</SelectItem>
              <SelectItem value="net_30">Net 30 Days</SelectItem>
              <SelectItem value="net_60">Net 60 Days</SelectItem>
              <SelectItem value="advance_payment">Advance Payment</SelectItem>
              <SelectItem value="consignment">Consignment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Lead Time (Days)</Label>
          <Input type="number" min="0" value={form.delivery_time_days} onChange={(e) => setForm({ ...form, delivery_time_days: parseInt(e.target.value) || 0 })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-500">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Address */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Address</p>
        <Textarea value={form.address.street} onChange={(e) => setAddr('street', e.target.value)} placeholder="Street address" rows={2} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input value={form.address.city} onChange={(e) => setAddr('city', e.target.value)} placeholder="City" />
          <Input value={form.address.district} onChange={(e) => setAddr('district', e.target.value)} placeholder="District" />
          <Input value={form.address.postal_code} onChange={(e) => setAddr('postal_code', e.target.value)} placeholder="Postal Code" />
          <Input value={form.address.country} onChange={(e) => setAddr('country', e.target.value)} placeholder="Country" />
        </div>
      </div>

      {/* Bank */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Bank Details <span className="text-slate-400 font-normal">(optional)</span></p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input value={form.bank_details.bank_name} onChange={(e) => setBank('bank_name', e.target.value)} placeholder="Bank Name" />
          <Input value={form.bank_details.account_name} onChange={(e) => setBank('account_name', e.target.value)} placeholder="Account Name" />
          <Input value={form.bank_details.account_number} onChange={(e) => setBank('account_number', e.target.value)} placeholder="Account Number" />
          <Input value={form.bank_details.branch} onChange={(e) => setBank('branch', e.target.value)} placeholder="Branch" />
        </div>
      </div>

      {/* Notes */}
      <div className="pt-4 border-t border-slate-100">
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-white pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-red-600 hover:bg-red-700">{supplier ? 'Update' : 'Add Supplier'}</Button>
      </div>
    </form>
  );
}