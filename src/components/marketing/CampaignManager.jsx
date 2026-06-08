import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { erp } from '@/api/erpClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Megaphone, Target, DollarSign, Package, Search,
  TrendingUp, AlertTriangle, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const toBDTDate = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date);
};

export default function CampaignManager({ onCampaignCreated }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  const [campaign, setCampaign] = useState({
    ad_type: 'single_product',
    period_type: 'daily',
    spend_date: toBDTDate(),
    total_spend_usd: 0,
    usd_to_bdt_rate: 120,
    platform: 'facebook',
    campaign_name: '',
    notes: ''
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['campaign-inventory'],
    queryFn: () => erp.entities.Inventory.filter({ department: 'prodhan_com_e_commerce' }),
    staleTime: 5 * 60 * 1000
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data) => {
      if (!data.campaign_name) throw new Error('Campaign name is required');
      if (!data.total_spend_usd || data.total_spend_usd <= 0) throw new Error('Spend amount must be greater than 0');
      
      const totalSpendBDT = data.total_spend_usd * data.usd_to_bdt_rate;
      const perProductSpend = selectedProducts.length > 0 ? totalSpendBDT / selectedProducts.length : 0;
      
      // Ensure ad_type is valid for the entity
      const adType = selectedProducts.length > 1 ? 'combo_ad' : 'single_product';
      
      const productsList = selectedProducts.map(id => {
        const inv = inventory.find(i => i.id === id);
        return {
          inventory_id: id,
          product_name: inv?.item_name || 'Unknown',
          allocated_spend_bdt: perProductSpend
        };
      });
      
      return erp.entities.AdSpend.create({
        ad_type: data.ad_type === 'multiple_products' ? 'multiple_products' : adType,
        period_type: data.period_type || 'daily',
        spend_date: data.spend_date,
        total_spend_usd: data.total_spend_usd,
        usd_to_bdt_rate: data.usd_to_bdt_rate,
        total_spend_bdt: totalSpendBDT,
        platform: data.platform,
        campaign_name: data.campaign_name,
        notes: data.notes || '',
        products: productsList
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ad-spends']);
      toast.success('Campaign created successfully');
      setIsOpen(false);
      resetForm();
      onCampaignCreated?.();
    },
    onError: (error) => {
      toast.error('Failed to create campaign: ' + (error.message || 'Unknown error'));
    }
  });

  const resetForm = () => {
    setCampaign({
      ad_type: 'single_product',
      period_type: 'daily',
      spend_date: toBDTDate(),
      total_spend_usd: 0,
      usd_to_bdt_rate: 120,
      platform: 'facebook',
      campaign_name: '',
      notes: ''
    });
    setSelectedProducts([]);
    setSearchTerm('');
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return inventory.slice(0, 20);
    const query = searchTerm.toLowerCase();
    return inventory.filter(p => 
      p.item_name?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [inventory, searchTerm]);

  const toggleProduct = (id) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const totalSpendBDT = (campaign.total_spend_usd || 0) * (campaign.usd_to_bdt_rate || 120);
  const perProductSpend = selectedProducts.length > 0 ? totalSpendBDT / selectedProducts.length : 0;

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="bg-pink-600 hover:bg-pink-700">
        <Plus className="w-4 h-4 mr-2" />
        Create Campaign
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Create Marketing Campaign
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); createCampaignMutation.mutate(campaign); }} className="space-y-6">
            {/* Campaign Type */}
            <div className="space-y-3">
              <Label className="font-semibold">Campaign Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'single_product', label: 'Single Product', icon: Package },
                  { value: 'combo_ad', label: 'Combo/Bundle', icon: Target },
                  { value: 'multiple_products', label: 'Multiple Products', icon: Megaphone }
                ].map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setCampaign({...campaign, ad_type: type.value})}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      campaign.ad_type === type.value 
                        ? 'border-pink-500 bg-pink-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <type.icon className={`w-6 h-6 ${campaign.ad_type === type.value ? 'text-pink-600' : 'text-slate-500'}`} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Campaign Name *</Label>
                <Input
                  required
                  value={campaign.campaign_name}
                  onChange={(e) => setCampaign({...campaign, campaign_name: e.target.value})}
                  placeholder="Summer Sale 2024"
                />
              </div>
              <div>
                <Label>Platform *</Label>
                <Select value={campaign.platform} onValueChange={(v) => setCampaign({...campaign, platform: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="facebook">📘 Facebook</SelectItem>
                    <SelectItem value="instagram">📸 Instagram</SelectItem>
                    <SelectItem value="google">🔍 Google Ads</SelectItem>
                    <SelectItem value="tiktok">🎵 TikTok</SelectItem>
                    <SelectItem value="youtube">▶️ YouTube</SelectItem>
                    <SelectItem value="other">📢 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget */}
            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
              <Label className="font-semibold">Budget Details</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Spend Date</Label>
                  <Input 
                    type="date" 
                    value={campaign.spend_date} 
                    onChange={(e) => setCampaign({...campaign, spend_date: e.target.value})} 
                  />
                </div>
                <div>
                  <Label className="text-xs">Amount (USD)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={campaign.total_spend_usd} 
                    onChange={(e) => setCampaign({...campaign, total_spend_usd: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-xs">USD → BDT Rate</Label>
                  <Input 
                    type="number"
                    value={campaign.usd_to_bdt_rate} 
                    onChange={(e) => setCampaign({...campaign, usd_to_bdt_rate: parseFloat(e.target.value) || 120})}
                  />
                </div>
              </div>
              <div className="p-3 bg-pink-100 rounded-lg flex justify-between items-center">
                <span className="font-medium text-pink-800">Total in BDT:</span>
                <span className="text-xl font-bold text-pink-700">৳{totalSpendBDT.toLocaleString()}</span>
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Select Products</Label>
                <Badge variant="outline">{selectedProducts.length} selected</Badge>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg max-h-48 overflow-y-auto">
                {filteredProducts.map(product => (
                  <div 
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 border-b last:border-b-0 ${
                      selectedProducts.includes(product.id) ? 'bg-pink-50' : ''
                    }`}
                  >
                    <input type="checkbox" readOnly checked={selectedProducts.includes(product.id)} className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.item_name}</p>
                      <p className="text-xs text-slate-500">{product.category} • ৳{product.selling_price}</p>
                    </div>
                    {selectedProducts.includes(product.id) && (
                      <Badge className="bg-pink-100 text-pink-800">৳{perProductSpend.toFixed(0)}</Badge>
                    )}
                  </div>
                ))}
              </div>

              {selectedProducts.length > 1 && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <strong>Note:</strong> Budget (৳{totalSpendBDT.toLocaleString()}) will be split equally across {selectedProducts.length} products 
                  (৳{perProductSpend.toFixed(0)} each)
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label>Campaign Notes</Label>
              <Textarea
                value={campaign.notes}
                onChange={(e) => setCampaign({...campaign, notes: e.target.value})}
                placeholder="Additional campaign details..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button 
                type="submit" 
                className="bg-pink-600 hover:bg-pink-700"
                disabled={createCampaignMutation.isPending}
              >
                {createCampaignMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" />Create Campaign</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}