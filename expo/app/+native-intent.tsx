import { logger } from '@/utils/logger';

export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  void initial;
  const url = path.toLowerCase();

  const dockIdMatch = path.match(/dock[s]?\/([\w-]+)/i);
  if (dockIdMatch && dockIdMatch[1] && dockIdMatch[1] !== 'report') {
    const id = dockIdMatch[1].split('?')[0];
    logger.log('[DeepLink] Redirecting to dock details:', id);
    return `/dock-details?id=${id}`;
  }

  const hazardIdMatch = path.match(/hazard[s]?\/([\w-]+)/i);
  if (hazardIdMatch && hazardIdMatch[1] && hazardIdMatch[1] !== 'report') {
    const id = hazardIdMatch[1].split('?')[0];
    logger.log('[DeepLink] Redirecting to hazard details:', id);
    return `/hazard-details?id=${id}`;
  }

  if (url.includes('report-hazard') || url.includes('report_hazard')) {
    logger.log('[DeepLink] Redirecting to report hazard');
    return '/report-hazard';
  }

  if (url.includes('report-dock') || url.includes('report_dock')) {
    logger.log('[DeepLink] Redirecting to report dock');
    return '/report-dock';
  }

  if (url.includes('route') || url.includes('navigate') || url.includes('directions')) {
    logger.log('[DeepLink] Redirecting to route planner');
    return '/(tabs)/route';
  }

  if (url.includes('hazards') || url.includes('bridges') || url.includes('clearance')) {
    logger.log('[DeepLink] Redirecting to hazards list');
    return '/(tabs)/hazards';
  }

  if (url.includes('favourites') || url.includes('favorites') || url.includes('bookmarks')) {
    logger.log('[DeepLink] Redirecting to favourites');
    return '/favourites';
  }

  if (url.includes('search') || url.includes('find')) {
    logger.log('[DeepLink] Redirecting to search');
    return '/search';
  }

  if (url.includes('profile') || url.includes('settings') || url.includes('account')) {
    logger.log('[DeepLink] Redirecting to profile');
    return '/(tabs)/profile';
  }

  if (url.includes('about') || url.includes('changelog')) {
    logger.log('[DeepLink] Redirecting to about');
    return '/about';
  }

  if (url.includes('fleet')) {
    logger.log('[DeepLink] Redirecting to fleet management');
    return '/fleet-manage';
  }

  logger.log('[DeepLink] No matching route for path:', path, '— falling back to home');
  return '/';
}
