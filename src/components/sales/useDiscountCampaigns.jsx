import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

/**
 * Hook to fetch active discount campaigns and calculate applicable discounts for an order.
 * 
 * Returns:
 * - campaigns: all active campaigns
 * - calculateDiscount(orderItems, subtotal, couponCode): { discountAmount, freeDelivery, appliedCampaigns }
 */
export function useDiscountCampaigns() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { data: allCampaigns = [] } = useQuery({
    queryKey: ['discount-campaigns-active'],
    queryFn: () => base44.entities.DiscountCampaign.filter({ is_active: true }, '-priority', 50),
    staleTime: 60000,
  });

  // Only campaigns valid today
  const activeCampaigns = useMemo(() => {
    return allCampaigns.filter(c => c.start_date <= todayStr && c.end_date >= todayStr);
  }, [allCampaigns, todayStr]);

  const calculateDiscount = (orderItems = [], subtotal = 0, couponCode = '') => {
    let totalDiscount = 0;
    let freeDelivery = false;
    const appliedCampaigns = [];
    const totalItemCount = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    for (const campaign of activeCampaigns) {
      // Check usage limit
      if (campaign.usage_limit > 0 && (campaign.usage_count || 0) >= campaign.usage_limit) continue;

      // If campaign has a coupon code, only apply if code matches
      if (campaign.coupon_code && campaign.coupon_code !== couponCode?.toUpperCase()) continue;

      // Check min order amount
      if (campaign.min_order_amount > 0 && subtotal < campaign.min_order_amount) continue;

      // Check min items count
      if (campaign.min_items_count > 0 && totalItemCount < campaign.min_items_count) continue;

      // Check product applicability
      if (campaign.applicable_products?.length > 0) {
        const hasMatchingProduct = orderItems.some(item =>
          campaign.applicable_products.includes(item.inventory_id)
        );
        if (!hasMatchingProduct) continue;
      }

      // Calculate discount based on type
      let campaignDiscount = 0;

      switch (campaign.campaign_type) {
        case 'percentage':
          campaignDiscount = (subtotal * (campaign.discount_value || 0)) / 100;
          if (campaign.max_discount_amount > 0) {
            campaignDiscount = Math.min(campaignDiscount, campaign.max_discount_amount);
          }
          break;

        case 'fixed_amount':
          campaignDiscount = campaign.discount_value || 0;
          break;

        case 'free_delivery':
          freeDelivery = true;
          break;

        case 'buy_x_free_delivery':
          if (totalItemCount >= (campaign.min_items_count || 2)) {
            freeDelivery = true;
          }
          // Also apply discount if set
          if (campaign.discount_value > 0) {
            campaignDiscount = campaign.campaign_type === 'percentage'
              ? (subtotal * campaign.discount_value) / 100
              : campaign.discount_value;
          }
          break;

        case 'combo':
          if (totalItemCount >= (campaign.min_items_count || 2)) {
            campaignDiscount = campaign.discount_value || 0;
            if (campaign.free_delivery) freeDelivery = true;
          }
          break;
      }

      // Apply free delivery flag from campaign
      if (campaign.free_delivery) freeDelivery = true;

      if (campaignDiscount > 0 || freeDelivery) {
        totalDiscount += campaignDiscount;
        appliedCampaigns.push({
          id: campaign.id,
          name: campaign.campaign_name,
          type: campaign.campaign_type,
          discount: campaignDiscount,
          freeDelivery: campaign.free_delivery,
          description: campaign.description,
        });
      }
    }

    return {
      discountAmount: Math.round(totalDiscount),
      freeDelivery,
      appliedCampaigns,
    };
  };

  return { activeCampaigns, calculateDiscount };
}

/**
 * Get the latest purchase price for a product from Purchase Orders.
 * Falls back to the inventory's purchase_price if no PO found.
 */
export function usePurchasePriceResolver(purchaseOrders = []) {
  // Build a map of inventory_id -> latest unit_price from POs
  const purchasePriceMap = useMemo(() => {
    const map = {};
    // Sort POs by date descending to get latest prices first
    const sorted = [...purchaseOrders].sort((a, b) => (b.order_date || '').localeCompare(a.order_date || ''));
    
    for (const po of sorted) {
      if (!['received', 'completed', 'partially_received', 'in_production'].includes(po.order_status)) continue;
      for (const item of po.order_items || []) {
        if (item.inventory_id && item.unit_price && !map[item.inventory_id]) {
          map[item.inventory_id] = item.unit_price;
        }
      }
    }
    return map;
  }, [purchaseOrders]);

  const getPurchasePrice = (inventoryItem) => {
    if (!inventoryItem) return 0;
    // Priority: PO price > inventory purchase_price > 0
    return purchasePriceMap[inventoryItem.id] || inventoryItem.purchase_price || 0;
  };

  return { purchasePriceMap, getPurchasePrice };
}