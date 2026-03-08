import { Hazard, TruckProfile } from '@/types';
import { ThemeColors } from '@/constants/colors';

export function getHazardColor(
  hazard: Hazard,
  profile: TruckProfile,
  colors: ThemeColors,
): string {
  const hasClearance = hazard.clearanceHeight < 90;
  const heightBlocked = hasClearance && hazard.clearanceHeight < profile.height;
  const weightBlocked = hazard.weightLimit ? profile.weight > hazard.weightLimit : false;
  const widthBlocked = hazard.widthLimit ? profile.width > hazard.widthLimit : false;
  if (heightBlocked || weightBlocked || widthBlocked) return colors.danger;
  if (hasClearance && hazard.clearanceHeight < profile.height + 0.3) return colors.warning;
  return colors.success;
}

export function getHazardStatusLabel(
  hazard: Hazard,
  profile: TruckProfile,
): 'BLOCKED' | 'TIGHT' | 'CLEAR' {
  const hasClearance = hazard.clearanceHeight < 90;
  const heightBlocked = hasClearance && hazard.clearanceHeight < profile.height;
  const weightBlocked = hazard.weightLimit ? profile.weight > hazard.weightLimit : false;
  const widthBlocked = hazard.widthLimit ? profile.width > hazard.widthLimit : false;
  if (heightBlocked || weightBlocked || widthBlocked) return 'BLOCKED';
  if (hasClearance && hazard.clearanceHeight < profile.height + 0.3) return 'TIGHT';
  return 'CLEAR';
}
