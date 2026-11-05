export interface SiteSettings {
  siteTitle: string;
  siteTagline: string;
  siteLogoIcon: string;
  contactEmail: string;
  footerCopyright: string;
  googleAdsClientId: string;
  googleAnalyticsIds: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: 'PulseNews',
  siteTagline: 'Ultra-Fast Minimalist News & Security Shield',
  siteLogoIcon: 'Zap',
  contactEmail: 'admin@pulsenews.com',
  footerCopyright: `© ${new Date().getFullYear()} PulseNews Press. All rights reserved.`,
  googleAdsClientId: 'ca-pub-3026550437424167',
  googleAnalyticsIds: 'G-QKS1ZF0QYS'
};

export const getSiteSettings = (): SiteSettings => {
  const saved = localStorage.getItem('tintuc_site_settings_v1');
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
  }
  return DEFAULT_SETTINGS;
};

export const saveSiteSettings = (settings: SiteSettings): SiteSettings => {
  localStorage.setItem('tintuc_site_settings_v1', JSON.stringify(settings));
  window.dispatchEvent(new Event('site_settings_updated'));
  return settings;
};
