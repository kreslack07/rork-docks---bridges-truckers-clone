import { useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { usePersistedQuery } from '@/hooks/usePersistedQuery';

const VERIFICATIONS_KEY = 'community_verifications';
const REPORTS_KEY = 'community_reports';

export interface HazardVerification {
  id: string;
  hazardId: string;
  userId: string;
  userName: string;
  status: 'confirmed' | 'disputed' | 'updated';
  newClearanceHeight?: number;
  comment: string;
  timestamp: number;
}

export interface CommunityReport {
  id: string;
  hazardId: string;
  userId: string;
  userName: string;
  reportType: 'removed' | 'changed' | 'dangerous' | 'inaccurate';
  description: string;
  timestamp: number;
  upvotes: number;
  upvotedBy: string[];
}

export const [CommunityProvider, useCommunity] = createContextHook(() => {
  const verificationsPersisted = usePersistedQuery<HazardVerification[]>({
    key: VERIFICATIONS_KEY,
    queryKey: ['communityVerifications'],
    defaultValue: [],
  });

  const reportsPersisted = usePersistedQuery<CommunityReport[]>({
    key: REPORTS_KEY,
    queryKey: ['communityReports'],
    defaultValue: [],
  });

  const { updateValue: updateVerifications } = verificationsPersisted;
  const { updateValue: updateReports } = reportsPersisted;

  const addVerification = useCallback((
    hazardId: string,
    userId: string,
    userName: string,
    status: HazardVerification['status'],
    comment: string,
    newClearanceHeight?: number,
  ) => {
    const newVerification: HazardVerification = {
      id: `ver_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      hazardId,
      userId,
      userName,
      status,
      comment,
      newClearanceHeight,
      timestamp: Date.now(),
    };

    updateVerifications(prev => {
      return [newVerification, ...prev].slice(0, 200);
    });

    console.log('[Community] Verification added:', newVerification.id, status);
    return newVerification;
  }, [updateVerifications]);

  const addReport = useCallback((
    hazardId: string,
    userId: string,
    userName: string,
    reportType: CommunityReport['reportType'],
    description: string,
  ) => {
    const newReport: CommunityReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      hazardId,
      userId,
      userName,
      reportType,
      description,
      timestamp: Date.now(),
      upvotes: 0,
      upvotedBy: [],
    };

    updateReports(prev => {
      return [newReport, ...prev].slice(0, 200);
    });

    console.log('[Community] Report added:', newReport.id, reportType);
    return newReport;
  }, [updateReports]);

  const upvoteReport = useCallback((reportId: string, userId: string) => {
    updateReports(prev => {
      return prev.map(r => {
        if (r.id === reportId && !r.upvotedBy.includes(userId)) {
          return {
            ...r,
            upvotes: r.upvotes + 1,
            upvotedBy: [...r.upvotedBy, userId],
          };
        }
        return r;
      });
    });
  }, [updateReports]);

  const verificationsByHazard = useMemo(() => {
    const map = new Map<string, HazardVerification[]>();
    for (const v of verificationsPersisted.value) {
      const existing = map.get(v.hazardId);
      if (existing) {
        existing.push(v);
      } else {
        map.set(v.hazardId, [v]);
      }
    }
    return map;
  }, [verificationsPersisted.value]);

  const getVerificationsForHazard = useCallback((hazardId: string) => {
    return verificationsByHazard.get(hazardId) ?? [];
  }, [verificationsByHazard]);

  const reportsByHazard = useMemo(() => {
    const map = new Map<string, CommunityReport[]>();
    for (const r of reportsPersisted.value) {
      const existing = map.get(r.hazardId);
      if (existing) {
        existing.push(r);
      } else {
        map.set(r.hazardId, [r]);
      }
    }
    return map;
  }, [reportsPersisted.value]);

  const getReportsForHazard = useCallback((hazardId: string) => {
    return reportsByHazard.get(hazardId) ?? [];
  }, [reportsByHazard]);

  const getVerificationCount = useCallback((hazardId: string) => {
    return (verificationsByHazard.get(hazardId) ?? []).length;
  }, [verificationsByHazard]);

  const getConfirmedCount = useCallback((hazardId: string) => {
    return (verificationsByHazard.get(hazardId) ?? []).filter(v => v.status === 'confirmed').length;
  }, [verificationsByHazard]);

  const getDisputedCount = useCallback((hazardId: string) => {
    return (verificationsByHazard.get(hazardId) ?? []).filter(v => v.status === 'disputed').length;
  }, [verificationsByHazard]);

  const hasUserVerified = useCallback((hazardId: string, userId: string) => {
    return (verificationsByHazard.get(hazardId) ?? []).some(v => v.userId === userId);
  }, [verificationsByHazard]);

  return useMemo(() => ({
    verifications: verificationsPersisted.value,
    reports: reportsPersisted.value,
    addVerification,
    addReport,
    upvoteReport,
    getVerificationsForHazard,
    getReportsForHazard,
    getVerificationCount,
    getConfirmedCount,
    getDisputedCount,
    hasUserVerified,
  }), [
    verificationsPersisted.value,
    reportsPersisted.value,
    addVerification,
    addReport,
    upvoteReport,
    getVerificationsForHazard,
    getReportsForHazard,
    getVerificationCount,
    getConfirmedCount,
    getDisputedCount,
    hasUserVerified,
  ]);
});
