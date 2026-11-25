export type Role = 'USER' | 'ADMIN';
export type LinkStatus = 'ACTIVE' | 'EXPIRED' | 'DISABLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface LinkOwner {
  id: string;
  name: string;
  email: string;
}

export interface LinkItem {
  id: string;
  ownerId: string | null;
  originalUrl: string;
  slug: string;
  shortUrl: string;
  status: LinkStatus;
  isGuest?: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { clicks: number };
  clickCount: number;
  isCached?: boolean;
  owner?: LinkOwner;
}

export interface TimeSeriesPoint {
  timestamp: string;
  label: string;
  clicks: number;
}

export interface ReferrerStat {
  referrer: string;
  count: number;
}

export interface DeviceStat {
  deviceType: string;
  count: number;
}

export interface RegionStat {
  region: string;
  count: number;
}

export interface RecentClickItem {
  id: string;
  clickedAt: string;
  referrer: string;
  deviceType: string;
  region: string;
}

export interface TopLinkStat {
  id: string;
  slug: string;
  shortUrl: string;
  originalUrl: string;
  status: LinkStatus;
  clicks: number;
  createdAt: string;
}

export interface RecentActivityItem {
  id: string;
  linkId: string;
  slug: string;
  shortUrl: string;
  originalUrl: string;
  clickedAt: string;
  referrer: string;
  deviceType: string;
  region: string;
}

export interface OverviewAnalyticsResponse {
  granularity: 'day' | 'hour';
  summary: {
    totalLinks: number;
    activeLinks: number;
    expiredLinks: number;
    disabledLinks: number;
    totalClicks: number;
    uniqueVisitors: number;
  };
  insights: {
    topChannel: ReferrerStat | null;
    topLink: TopLinkStat | null;
    peakEngagement: TimeSeriesPoint | null;
  };
  clicksOverTime: TimeSeriesPoint[];
  topLinks: TopLinkStat[];
  referrers: ReferrerStat[];
  devices: DeviceStat[];
  regions: RegionStat[];
  recentActivity: RecentActivityItem[];
}

export interface AnalyticsResponse {
  link: {
    id: string;
    slug: string;
    shortUrl: string;
    originalUrl: string;
    status: LinkStatus;
    expiresAt: string | null;
    createdAt: string;
  };
  granularity: 'day' | 'hour';
  totalClicks: number;
  uniqueVisitors: number;
  clicksOverTime: TimeSeriesPoint[];
  referrers: ReferrerStat[];
  devices: DeviceStat[];
  regions: RegionStat[];
  recentClicks: RecentClickItem[];
}

export interface HealthResponse {
  status: string;
  service: string;
  publicBaseUrl?: string;
  database: string;
  cacheMode: string;
  cachedSlugs: number;
  timestamp: string;
}
