export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  if (path.includes('dock/')) {
    const id = path.split('dock/').pop()?.split('?')[0];
    if (id) {
      console.log('[DeepLink] Redirecting to dock details:', id);
      return `/dock-details?id=${id}`;
    }
  }

  if (path.includes('hazard/')) {
    const id = path.split('hazard/').pop()?.split('?')[0];
    if (id) {
      console.log('[DeepLink] Redirecting to hazard details:', id);
      return `/hazard-details?id=${id}`;
    }
  }

  if (path.includes('route') || path.includes('navigate')) {
    console.log('[DeepLink] Redirecting to route planner');
    return '/route';
  }

  if (path.includes('hazards')) {
    console.log('[DeepLink] Redirecting to hazards list');
    return '/hazards';
  }

  if (path.includes('search')) {
    console.log('[DeepLink] Redirecting to search');
    return '/search';
  }

  if (path.includes('profile')) {
    console.log('[DeepLink] Redirecting to profile');
    return '/profile';
  }

  if (path.includes('report-hazard')) {
    console.log('[DeepLink] Redirecting to report hazard');
    return '/report-hazard';
  }

  if (path.includes('report-dock')) {
    console.log('[DeepLink] Redirecting to report dock');
    return '/report-dock';
  }

  console.log('[DeepLink] No matching route for path:', path, '— falling back to home');
  return '/';
}
