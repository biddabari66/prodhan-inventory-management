import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, Mail, MapPin, Edit, Star, Package, ShoppingCart, DollarSign,
  Building2, Clock, CreditCard, X, Copy, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierDetailSheet({ supplier, stats, purchaseOrders, onClose, onEdit }) {
  if (!supplier) return null;

  const st = stats || {};
  const products = st.productDetails || [];
  const categories = st.categories ? Array.from(st.categories) : [];
  const addr = supplier.address || {};

  const copyPhone = () => { navigator.clipboard.writeText(supplier.contact_phone); toast.success('Phone copied!'); };

  const RatingStars = ({ rating }) => (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= (rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );

  const getStatusColor = (status) => {
    const c = { active: 'bg-emerald-100 text-emerald-700', inactive: 'bg-slate-100 text-slate-600', blocked: 'bg-red-100 text-red-700', under_review: 'bg-amber-100 text-amber-700' };
    return c[status] || c.active;
  };

  return (
    <Dialog open={!!supplier} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl font-bold">{supplier.supplier_name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{supplier.supplier_name}</h2>
                <p className="text-red-100 text-sm">{supplier.supplier_code} • {supplier.supplier_type?.replace('_', ' ')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${getStatusColor(supplier.status)} text-xs`}>{supplier.status?.replace('_', ' ')}</Badge>
                  <RatingStars rating={supplier.rating} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onEdit} className="text-white hover:bg-white/20"><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20"><X className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Products', value: st.productCount || 0, icon: Package },
              { label: 'PO Orders', value: st.totalOrders || 0, icon: ShoppingCart },
              { label: 'Total Value', value: `৳${Math.round(st.totalValue || 0).toLocaleString('en-IN')}`, icon: DollarSign },
              { label: 'Categories', value: categories.length, icon: Building2 },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-red-200 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(90vh-240px)]">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-11 px-6">
              <TabsTrigger value="info" className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-none">Info</TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-none">Products ({st.productCount || 0})</TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 rounded-none">Orders ({purchaseOrders?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="p-6 space-y-5 mt-0">
              {/* Contact */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contact Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400">Contact Person</p>
                      <p className="text-sm font-medium text-slate-900">{supplier.contact_person}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100" onClick={copyPhone}>
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400">Phone</p>
                      <p className="text-sm font-medium text-slate-900">{supplier.contact_phone}</p>
                    </div>
                    <Copy className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  {supplier.contact_email && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400">Email</p>
                        <p className="text-sm font-medium text-slate-900 truncate">{supplier.contact_email}</p>
                      </div>
                    </div>
                  )}
                  {(addr.street || addr.city) && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400">Address</p>
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {[addr.street, addr.city, addr.district].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Business */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Business Details</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Payment Terms', value: supplier.payment_terms?.replace(/_/g, ' '), icon: CreditCard },
                    { label: 'Lead Time', value: `${supplier.delivery_time_days || '—'} days`, icon: Clock },
                    { label: 'Credit Limit', value: `৳${(supplier.credit_limit || 0).toLocaleString('en-IN')}`, icon: DollarSign },
                    { label: 'Min Order Qty', value: supplier.minimum_order_quantity || '—', icon: Package },
                    { label: 'Department', value: supplier.department?.replace(/_/g, ' '), icon: Building2 },
                    { label: 'Last Order', value: st.lastOrderDate?.split('T')[0] || '—', icon: Calendar },
                  ].map((item, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-[10px] text-slate-400 uppercase font-medium">{item.label}</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5 capitalize">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories served */}
              {categories.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Categories Served</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}
                  </div>
                </div>
              )}

              {supplier.notes && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{supplier.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="products" className="mt-0">
              {products.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No products linked to this supplier</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Purchase Price</TableHead>
                        <TableHead className="text-right">Sell Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm max-w-[200px] truncate">{p.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.category || '—'}</Badge></TableCell>
                          <TableCell className="text-right">
                            <span className={`font-semibold text-sm ${p.stock <= 0 ? 'text-red-500' : p.stock < 10 ? 'text-amber-500' : 'text-emerald-600'}`}>{p.stock}</span>
                          </TableCell>
                          <TableCell className="text-right text-sm">৳{(p.price || 0).toLocaleString('en-IN')}</TableCell>
                          <TableCell className="text-right text-sm">৳{(p.sellingPrice || 0).toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders" className="mt-0">
              {(!purchaseOrders || purchaseOrders.length === 0) ? (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No purchase orders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>PO #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.sort((a, b) => (b.order_date || '').localeCompare(a.order_date || '')).slice(0, 50).map(po => (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium text-sm">{po.po_number}</TableCell>
                          <TableCell className="text-sm text-slate-600">{po.order_date?.split('T')[0]}</TableCell>
                          <TableCell className="text-sm">{po.order_items?.length || 0} items</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${
                              ['completed', 'received'].includes(po.order_status) ? 'bg-emerald-100 text-emerald-700' :
                              ['pending', 'draft'].includes(po.order_status) ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{po.order_status?.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold">৳{(po.total_amount || 0).toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}