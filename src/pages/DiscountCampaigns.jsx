import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User } from '@/entities/User';
import { withPermission } from '../components/common/PermissionGuard';
import DiscountCampaignManager from '../components/sales/DiscountCampaignManager';

function DiscountCampaignsPage() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <div className="w-full px-6 py-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Dashboard</span>
          <span>/</span>
          <span className="text-slate-900 font-medium">Discount Campaigns</span>
        </div>

        <DiscountCampaignManager currentUser={currentUser} />
      </div>
    </div>
  );
}

export default withPermission(DiscountCampaignsPage, 'sales', 'can_view');