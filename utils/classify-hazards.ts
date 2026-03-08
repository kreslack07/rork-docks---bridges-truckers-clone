import { Hazard } from '@/types';

export interface HazardClassification {
  blocked: Hazard[];
  tight: Hazard[];
  safe: Hazard[];
}

export function classifyHazards(
  hazards: Hazard[],
  truckHeight: number,
  truckWeight?: number,
  truckWidth?: number,
): HazardClassification {
  const blocked: Hazard[] = [];
  const tight: Hazard[] = [];
  const safe: Hazard[] = [];

  for (const h of hazards) {
    const hasClearance = h.clearanceHeight < 90;
    const heightBlocked = hasClearance && h.clearanceHeight < truckHeight;
    const weightBlocked = truckWeight && h.weightLimit ? truckWeight > h.weightLimit : false;
    const widthBlocked = truckWidth && h.widthLimit ? truckWidth > h.widthLimit : false;

    if (heightBlocked || weightBlocked || widthBlocked) {
      blocked.push(h);
    } else if (hasClearance && h.clearanceHeight < truckHeight + 0.3) {
      tight.push(h);
    } else {
      safe.push(h);
    }
  }

  return { blocked, tight, safe };
}

export type HazardBlockReason = 'height' | 'weight' | 'width';

export function getHazardBlockReasons(
  hazard: Hazard,
  truckHeight: number,
  truckWeight?: number,
  truckWidth?: number,
): HazardBlockReason[] {
  const reasons: HazardBlockReason[] = [];

  if (hazard.clearanceHeight < 90 && hazard.clearanceHeight < truckHeight) {
    reasons.push('height');
  }
  if (truckWeight && hazard.weightLimit && truckWeight > hazard.weightLimit) {
    reasons.push('weight');
  }
  if (truckWidth && hazard.widthLimit && truckWidth > hazard.widthLimit) {
    reasons.push('width');
  }

  return reasons;
}
