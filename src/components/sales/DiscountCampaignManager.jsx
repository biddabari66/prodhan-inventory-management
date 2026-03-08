import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Tag, Calendar, Percent, Truck, Package, Edit, Trash2, Gift, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const CAMPAIGN_TYPES = {
  percentage: { label: 'Percentage Discount', icon: Percent, color: 'bg-blue-100 text-blue-700' },
  fixed_amount: { label: 'Fixed Amount Off', icon: Tag, color: 'bg-green-100 text-green-700' },
  free_delivery: { label: 'Free Delivery', icon: Truck, color: 'bg-purple-100 text-purple-700' },
  buy_x_free_delivery: { label: 'Buy X+ Free Delivery', icon: Package, color: 'bg-orange-100 text-orange-700' },
  combo: { label: 'Combo Offer', icon: Gift, color: 'bg-pink-100 text-pink-700' },
};

const emptyCampaign = {
  campaign_name: '',
  campaign_type: 'percentage',
  discount_value: 0,
  max_discount_amount: 0,
  min_order_amount: 0,
  min_items_count: 0,
  free_delivery: false,
  applicable_products: [],
  applicable_categories: [],
  coupon_code: '',
  start_date: format(new Date(), 'yyyy-MM-dd'),
  end_date: '',
  is_active: true,
  usage_limit: 0,
  priority: 0,
  description: '',
  internal_notes: '',
};

export default function DiscountCampaignManager({ currentUser }) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState(emptyCampaign);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['discount-campaigns'],
    queryFn: () => base44.entities.DiscountCampaign.list('-created_date', 100),
    staleTime: 60000,
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingCampaign) {
        return base44.entities.DiscountCampaign.update(editingCampaign.id, data);
      }
      return base44.entities.DiscountCampaign.create({
        ...data,
        created_by_name: currentUser?.full_name || 'Admin',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['discount-campaigns']);
      toast.success(editingCampaign ? 'Campaign updated!' : 'Campaign created!');
      setIsFormOpen(false);
      setEditingCampaign(null);
      setFormData(emptyCampaign);
    },
    onError: (err) => toast.error('Failed: ' + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DiscountCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['discount-campaigns']);
      toast.success('Campaign deleted');
      setDeleteConfirmOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.DiscountCampaign.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['discount-campaigns']),
  });

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      campaign_name: campaign.campaign_name || '',
      campaign_type: campaign.campaign_type || 'percentage',
      discount_value: campaign.discount_value || 0,
      max_discount_amount: campaign.max_discount_amount || 0,
      min_order_amount: campaign.min_order_amount || 0,
      min_items_count: campaign.min_items_count || 0,
      free_delivery: campaign.free_delivery || false,
      applicable_products: campaign.applicable_products || [],
      applicable_categories: campaign.applicable_categories || [],
      coupon_code: campaign.coupon_code || '',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      is_active: campaign.is_active ?? true,
      usage_limit: campaign.usage_limit || 0,
      priority: campaign.priority || 0,
      description: campaign.description || '',
      internal_notes: campaign.internal_notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.campaign_name || !formData.start_date || !formData.end_date) {
      toast.error('Please fill campaign name, start and end dates');
      return;
    }
    saveMutation.mutate(formData);
  };

  const getCampaignStatus = (campaign) => {
    if (!campaign.is_active) return { label: 'Inactive', class: 'bg-slate-100 text-slate-600' };
    if (campaign.end_date < todayStr) return { label: 'Expired', class: 'bg-red-100 text-red-700' };
    if (campaign.start_date > todayStr) return { label: 'Scheduled', class: 'bg-blue-100 text-blue-700' };
    return { label: 'Active', class: 'bg-green-100 text-green-700' };
  };

  const activeCampaigns = campaigns.filter(c => c.is_active && c.start_date <= todayStr && c.end_date >= todayStr);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Discount & Offer Campaigns
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Create festival offers, combo deals, and promotional campaigns
          </p>
        </div>
        <Button
          onClick={() => { setEditingCampaign(null); setFormData(emptyCampaign); setIsFormOpen(true); }}
          className="bg-red-600 hover:bg-red-700 gap-2"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </Button>
      </div>

      {/* Active Campaigns Banner */}
      {activeCampaigns.length > 0 && (
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">{activeCampaigns.length} Active Campaign(s) Running</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeCampaigns.map(c => (
                <Badge key={c.id} className="bg-green-600 text-white px-3 py-1">
                  {c.campaign_name}
                  {c.campaign_type === 'percentage' && ` — ${c.discount_value}% off`}
                  {c.campaign_type === 'fixed_amount' && ` — ৳${c.discount_value} off`}
                  {c.free_delivery && ' + Free Delivery'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaigns Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="pl-6">Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Used</TableHead>
                <TableHead className="text-center pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    <Tag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No campaigns created yet</p>
                  </TableCell>
                </TableRow>
              ) : campaigns.map(campaign => {
                const status = getCampaignStatus(campaign);
                const typeInfo = CAMPAIGN_TYPES[campaign.campaign_type] || CAMPAIGN_TYPES.percentage;
                const TypeIcon = typeInfo.icon;
                return (
                  <TableRow key={campaign.id} className="hover:bg-slate-50">
                    <TableCell className="pl-6">
                      <div>
                        <p className="font-semibold text-slate-900">{campaign.campaign_name}</p>
                        {campaign.coupon_code && (
                          <Badge variant="outline" className="mt-1 text-xs font-mono">
                            Code: {campaign.coupon_code}
                          </Badge>
                        )}
                        {campaign.description && (
                          <p className="text-xs text-slate-500 mt-0.5 max-w-[200px] truncate">{campaign.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${typeInfo.color} gap-1`}>
                        <TypeIcon className="w-3 h-3" />
                        {typeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {campaign.campaign_type === 'percentage' && (
                          <span className="font-bold text-blue-600">{campaign.discount_value}%</span>
                        )}
                        {campaign.campaign_type === 'fixed_amount' && (
                          <span className="font-bold text-green-600">৳{campaign.discount_value}</span>
                        )}
                        {campaign.max_discount_amount > 0 && (
                          <p className="text-xs text-slate-500">Max: ৳{campaign.max_discount_amount}</p>
                        )}
                        {campaign.free_delivery && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs mt-1">Free Delivery</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {campaign.min_order_amount > 0 && (
                          <p>Min order: ৳{campaign.min_order_amount}</p>
                        )}
                        {campaign.min_items_count > 0 && (
                          <p>Min items: {campaign.min_items_count}+</p>
                        )}
                        {(!campaign.min_order_amount && !campaign.min_items_count) && (
                          <p className="text-slate-400">No conditions</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p>{campaign.start_date}</p>
                        <p className="text-slate-400">to {campaign.end_date}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${status.class} rounded-full px-3`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {campaign.usage_count || 0}
                      {campaign.usage_limit > 0 && <span className="text-slate-400 font-normal">/{campaign.usage_limit}</span>}
                    </TableCell>
                    <TableCell className="text-center pr-6">
                      <div className="flex items-center justify-center gap-1">
                        <Switch
                          checked={campaign.is_active}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: campaign.id, is_active: checked })}
                        />
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(campaign)} className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setCampaignToDelete(campaign); setDeleteConfirmOpen(true); }} className="h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Campaign Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={formData.campaign_name}
                  onChange={e => setFormData({ ...formData, campaign_name: e.target.value })}
                  placeholder="e.g., EID Mubarak Offer 2026"
                  required
                />
              </div>
              <div>
                <Label>Campaign Type *</Label>
                <Select value={formData.campaign_type} onValueChange={v => setFormData({ ...formData, campaign_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAMPAIGN_TYPES).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {formData.campaign_type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (৳)'}
                </Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={e => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                  placeholder={formData.campaign_type === 'percentage' ? 'e.g., 10' : 'e.g., 200'}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Discount Cap (৳)</Label>
                <Input
                  type="number"
                  value={formData.max_discount_amount}
                  onChange={e => setFormData({ ...formData, max_discount_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 2000 (0 = no cap)"
                />
                <p className="text-xs text-slate-500 mt-1">Leave 0 for no maximum limit</p>
              </div>
              <div>
                <Label>Minimum Order Amount (৳)</Label>
                <Input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={e => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 500"
                />
              </div>
              <div>
                <Label>Minimum Items Count</Label>
                <Input
                  type="number"
                  value={formData.min_items_count}
                  onChange={e => setFormData({ ...formData, min_items_count: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 2 for 'buy 2+ get free delivery'"
                />
              </div>
              <div className="flex items-end gap-3 pb-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.free_delivery}
                    onCheckedChange={v => setFormData({ ...formData, free_delivery: v })}
                  />
                  <Label className="cursor-pointer">Free Delivery</Label>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Coupon Code (Optional)</Label>
                <Input
                  value={formData.coupon_code}
                  onChange={e => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                  placeholder="e.g., EID2026"
                />
                <p className="text-xs text-slate-500 mt-1">Leave blank for auto-apply</p>
              </div>
              <div>
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  value={formData.usage_limit}
                  onChange={e => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })}
                  placeholder="0 = unlimited"
                />
              </div>
            </div>

            <div>
              <Label>Public Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., EID special! Get 10% off up to ৳2000 on all orders. Buy 2 products, get free delivery!"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{campaignToDelete?.campaign_name}". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(campaignToDelete?.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}