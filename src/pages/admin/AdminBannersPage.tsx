import React from 'react';
import { PromoBannerSettings } from '../../components/admin/PromoBannerSettings';
import { SEOHead } from '../../components/SEOHead';

export const AdminBannersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <SEOHead
        title="Promotional Banners - Admin Dashboard | KUD online store"
        description="Manage 1080x1080 promotional banners, flash sale videos, countdown timers and carousel scheduling."
      />
      <PromoBannerSettings />
    </div>
  );
};
