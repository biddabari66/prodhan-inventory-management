import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Target, Plus, Trash2, DollarSign, TrendingUp, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import SearchableProductSelect from '../common/SearchableProductSelect';

export default function AdSpendTracker() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [formData, setFormData] = useState({
    ad_type: 'single_product',
    period_type: 'daily',
    spend_date: format(new Date(), 'yyyy-MM-dd'),
    total_spend_usd: 0,
    usd_to_bdt_rate: 120,
    platform: 'facebook',
    campaign_name: '',
    notes: ''
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' })
  });

  const { data: adSpends = [] } = useQuery({
    queryKey: ['adSpends'],
    queryFn: () => base44.entities.AdSpend.list('-spend_date', 500)
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const totalBDT = data.total_spend_usd * data.usd_to_bdt_rate;
      const allocatedPerProduct = data.ad_type === 'combo_ad' 
        ? totalBDT / selectedProducts.length 
        : totalBDT;
      
      const productsData = selectedProducts.map(p => {
        const item = inventory.find(i => i.id === p);
        return {
          inventory_id: p,
          product_name: item?.item_name || 'Unknown',
          allocated_spend_bdt: allocatedPerProduct
        };
      });

      return base44.entities.AdSpend.create({
        ...data,
        total_spend_bdt: totalBDT,
        products: productsData,
        created_by_id: currentUser?.id,
        created_by_name: currentUser?.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adSpends']);
      toast.success('Ad spend recorded!');
      handleClose();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AdSpend.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adSpends']);
      toast.success('Deleted successfully');
    }
  });

  const handleClose = () => {
    setIsAddOpen(false);
    setSelectedProducts([]);
    setFormData({
      ad_type: 'single_product',
      period_type: 'daily',
      spend_date: format(new Date(), 'yyyy-MM-dd'),
      total_spend_usd: 0,
      usd_to_bdt_rate: 120,
      platform: 'facebook',
      campaign_name: '',
      notes: ''
    });
  };

  const handleAddProduct = (productId) => {
    if (formData.ad_type === 'single_product') {
      setSelectedProducts([productId]);
    } else {
      if (!selectedProducts.includes(productId)) {
        setSelectedProducts([...selectedProducts, productId]);
      }
    }
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p !== productId));
  };

  const handleSubmit = () => {
    if (selectedProducts.length === 0) {
      toast.error('Select at least one product');
      return;
    }
    createMutation.mutate(formData);
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalUSD = adSpends.reduce((sum, a) => sum + (a.total_spend_usd || 0), 0);
    const totalBDT = adSpends.reduce((sum, a) => sum + (a.total_spend_bdt || 0), 0);
    return { totalUSD, totalBDT, count: adSpends.length };
  }, [adSpends]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Ad Spend Tracking</h2>
            <p className="text-sm text-slate-600">Track advertising costs by product or combo</p>
          </div>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-2" />Add Ad Spend
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totals.count}</p>
            <p className="text-xs text-slate-500 uppercase">Total Ad Campaigns</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">${totals.totalUSD.toFixed(2)}</p>
            <p className="text-xs text-slate-500 uppercase">Total Spent (USD)</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">৳{totals.totalBDT.toLocaleString()}</p>
            <p className="text-xs text-slate-500 uppercase">Total Spent (BDT)</p>
          </CardContent>
        </Card>
      </div>

      {/* Ad Spend List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b">
          <CardTitle>Recent Ad Spends</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {adSpends.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No ad spends recorded yet</p>
              </div>
            ) : (
              adSpends.map(spend => (
                <div key={spend.id} className="p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={spend.ad_type === 'combo_ad' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                          {spend.ad_type === 'combo_ad' ? '🎯 Combo Ad' : '📦 Single Product'}
                        </Badge>
                        <Badge variant="outline">{spend.period_type}</Badge>
                        <Badge variant="outline">{spend.platform}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-slate-600">
                          <strong>Date:</strong> {format(new Date(spend.spend_date), 'MMM dd, yyyy')}
                        </p>
                        {spend.campaign_name && (
                          <p className="text-sm text-slate-600">
                            <strong>Campaign:</strong> {spend.campaign_name}
                          </p>
                        )}
                        <p className="text-sm font-semibold text-red-600">
                          ${spend.total_spend_usd} USD = ৳{spend.total_spend_bdt?.toLocaleString()} BDT
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {spend.products?.map((p, idx) => {
                            const item = inventory.find(i => i.id === p.inventory_id);
                            return (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {p.product_name} • ৳{p.allocated_spend_bdt?.toFixed(2)}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(spend.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Ad Spend Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Ad Spend</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ad Type</Label>
                <Select 
                  value={formData.ad_type} 
                  onValueChange={(v) => {
                    setFormData({...formData, ad_type: v});
                    setSelectedProducts([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_product">Single Product Ad</SelectItem>
                    <SelectItem value="combo_ad">Combo Ad (Multiple Products)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Period Type</Label>
                <Select value={formData.period_type} onValueChange={(v) => setFormData({...formData, period_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Spend Date</Label>
                <Input
                  type="date"
                  value={formData.spend_date}
                  onChange={(e) => setFormData({...formData, spend_date: e.target.value})}
                />
              </div>
              <div>
                <Label>Platform</Label>
                <Select value={formData.platform} onValueChange={(v) => setFormData({...formData, platform: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Spend (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total_spend_usd}
                    onChange={(e) => setFormData({...formData, total_spend_usd: parseFloat(e.target.value) || 0})}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <Label>USD to BDT Rate</Label>
                <Input
                  type="number"
                  value={formData.usd_to_bdt_rate}
                  onChange={(e) => setFormData({...formData, usd_to_bdt_rate: parseFloat(e.target.value) || 120})}
                />
              </div>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-semibold text-red-900">
                Total in BDT: ৳{(formData.total_spend_usd * formData.usd_to_bdt_rate).toLocaleString()}
              </p>
              {selectedProducts.length > 0 && formData.ad_type === 'combo_ad' && (
                <p className="text-xs text-red-700 mt-1">
                  Per Product: ৳{((formData.total_spend_usd * formData.usd_to_bdt_rate) / selectedProducts.length).toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <Label>Select Products {formData.ad_type === 'combo_ad' ? '(Multiple)' : '(Single)'}</Label>
              <SearchableProductSelect
                inventory={inventory}
                value=""
                onValueChange={handleAddProduct}
                placeholder="Search and select products..."
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedProducts.map(p => {
                  const item = inventory.find(i => i.id === p);
                  return (
                    <Badge key={p} className="bg-blue-100 text-blue-800 gap-2">
                      {item?.item_name}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-600"
                        onClick={() => handleRemoveProduct(p)}
                      />
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Campaign Name (Optional)</Label>
              <Input
                value={formData.campaign_name}
                onChange={(e) => setFormData({...formData, campaign_name: e.target.value})}
                placeholder="Campaign or ad set name..."
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={selectedProducts.length === 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Target className="w-4 h-4 mr-2" />Record Ad Spend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}