import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import {
  CircleCheck as CheckCircle2,
  XCircle,
  RefreshCw,
  ThumbsUp,
  MessageSquare,
  Send,
  User,
  Shield,
  Ruler,
  AlertTriangle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '@/constants/colors';
import { Hazard } from '@/types';
import { HazardVerification, CommunityReport } from '@/context/CommunityContext';

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface CommunitySectionProps {
  hazard: Hazard;
  colors: ThemeColors;
  isAuthenticated: boolean;
  userId: string | undefined;
  userDisplayName: string | undefined;
  verifications: HazardVerification[];
  reports: CommunityReport[];
  confirmedCount: number;
  disputedCount: number;
  userHasVerified: boolean;
  addVerification: (
    hazardId: string,
    userId: string,
    userName: string,
    status: HazardVerification['status'],
    comment: string,
    newClearanceHeight?: number,
  ) => void;
  addReport: (
    hazardId: string,
    userId: string,
    userName: string,
    reportType: CommunityReport['reportType'],
    description: string,
  ) => void;
  upvoteReport: (reportId: string, userId: string) => void;
}

export default function CommunitySection({
  hazard,
  colors,
  isAuthenticated,
  userId,
  userDisplayName,
  verifications,
  reports,
  confirmedCount,
  disputedCount,
  userHasVerified,
  addVerification,
  addReport,
  upvoteReport,
}: CommunitySectionProps) {
  const [showVerifyForm, setShowVerifyForm] = useState<boolean>(false);
  const [showReportForm, setShowReportForm] = useState<boolean>(false);
  const [verifyComment, setVerifyComment] = useState<string>('');
  const [verifyHeight, setVerifyHeight] = useState<string>('');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [reportType, setReportType] = useState<CommunityReport['reportType']>('inaccurate');

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleVerify = useCallback((status: HazardVerification['status']) => {
    if (!isAuthenticated || !userId || !userDisplayName) {
      Alert.alert('Sign In Required', 'Please sign in to verify hazard data.');
      return;
    }

    const heightNum = verifyHeight ? parseFloat(verifyHeight) : undefined;
    addVerification(
      hazard.id,
      userId,
      userDisplayName,
      status,
      verifyComment || `${status === 'confirmed' ? 'Confirmed' : status === 'disputed' ? 'Disputed' : 'Updated'} clearance data`,
      heightNum,
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowVerifyForm(false);
    setVerifyComment('');
    setVerifyHeight('');
  }, [isAuthenticated, userId, userDisplayName, hazard.id, verifyComment, verifyHeight, addVerification]);

  const handleReport = useCallback(() => {
    if (!isAuthenticated || !userId || !userDisplayName) {
      Alert.alert('Sign In Required', 'Please sign in to submit a report.');
      return;
    }
    if (!reportDesc.trim()) {
      Alert.alert('Required', 'Please describe the issue.');
      return;
    }

    addReport(hazard.id, userId, userDisplayName, reportType, reportDesc);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowReportForm(false);
    setReportDesc('');
  }, [isAuthenticated, userId, userDisplayName, hazard.id, reportType, reportDesc, addReport]);

  const handleUpvote = useCallback((reportId: string) => {
    if (!isAuthenticated || !userId) {
      Alert.alert('Sign In Required', 'Please sign in to upvote.');
      return;
    }
    upvoteReport(reportId, userId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isAuthenticated, userId, upvoteReport]);

  const reportTypes: { key: CommunityReport['reportType']; label: string }[] = [
    { key: 'inaccurate', label: 'Inaccurate' },
    { key: 'changed', label: 'Changed' },
    { key: 'removed', label: 'Removed' },
    { key: 'dangerous', label: 'Dangerous' },
  ];

  return (
    <>
      <View style={styles.communitySection}>
        <View style={styles.communitySectionHeader}>
          <Shield size={16} color={colors.primary} />
          <Text style={styles.communitySectionTitle}>Community Verification</Text>
        </View>

        <View style={styles.verifyStatsRow}>
          <View style={styles.verifyStat}>
            <CheckCircle2 size={16} color={colors.success} />
            <Text style={[styles.verifyStatNum, { color: colors.success }]}>{confirmedCount}</Text>
            <Text style={styles.verifyStatLabel}>Confirmed</Text>
          </View>
          <View style={styles.verifyStatDivider} />
          <View style={styles.verifyStat}>
            <XCircle size={16} color={colors.danger} />
            <Text style={[styles.verifyStatNum, { color: colors.danger }]}>{disputedCount}</Text>
            <Text style={styles.verifyStatLabel}>Disputed</Text>
          </View>
          <View style={styles.verifyStatDivider} />
          <View style={styles.verifyStat}>
            <MessageSquare size={16} color={colors.textSecondary} />
            <Text style={styles.verifyStatNum}>{reports.length}</Text>
            <Text style={styles.verifyStatLabel}>Reports</Text>
          </View>
        </View>

        {!userHasVerified && isAuthenticated && !showVerifyForm && (
          <View style={styles.verifyActions}>
            <TouchableOpacity
              style={[styles.verifyBtn, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}
              onPress={() => handleVerify('confirmed')}
              activeOpacity={0.7}
            >
              <CheckCircle2 size={16} color={colors.success} />
              <Text style={[styles.verifyBtnText, { color: colors.success }]}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.verifyBtn, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '30' }]}
              onPress={() => handleVerify('disputed')}
              activeOpacity={0.7}
            >
              <XCircle size={16} color={colors.danger} />
              <Text style={[styles.verifyBtnText, { color: colors.danger }]}>Dispute</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.verifyBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
              onPress={() => setShowVerifyForm(true)}
              activeOpacity={0.7}
            >
              <RefreshCw size={16} color={colors.primary} />
              <Text style={[styles.verifyBtnText, { color: colors.primary }]}>Update</Text>
            </TouchableOpacity>
          </View>
        )}

        {userHasVerified && (
          <View style={styles.alreadyVerifiedBadge}>
            <CheckCircle2 size={14} color={colors.success} />
            <Text style={styles.alreadyVerifiedText}>You have verified this hazard</Text>
          </View>
        )}

        {!isAuthenticated && (
          <Text style={styles.signInPrompt}>Sign in to verify or report this hazard</Text>
        )}

        {showVerifyForm && (
          <View style={styles.inlineForm}>
            <Text style={styles.inlineFormTitle}>Update Clearance</Text>
            <View style={styles.inlineInputRow}>
              <Ruler size={14} color={colors.textMuted} />
              <TextInput
                style={styles.inlineInput}
                placeholder="New height (metres)"
                placeholderTextColor={colors.textMuted}
                value={verifyHeight}
                onChangeText={setVerifyHeight}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.inlineInputRow}>
              <MessageSquare size={14} color={colors.textMuted} />
              <TextInput
                style={styles.inlineInput}
                placeholder="Comment (optional)"
                placeholderTextColor={colors.textMuted}
                value={verifyComment}
                onChangeText={setVerifyComment}
              />
            </View>
            <View style={styles.inlineFormActions}>
              <TouchableOpacity style={styles.inlineCancel} onPress={() => setShowVerifyForm(false)}>
                <Text style={styles.inlineCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.inlineSubmit} onPress={() => handleVerify('updated')}>
                <Send size={14} color={colors.white} />
                <Text style={styles.inlineSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {verifications.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Recent Verifications</Text>
          {verifications.slice(0, 5).map((v) => (
            <View key={v.id} style={styles.verificationItem}>
              <View style={[styles.verificationDot, {
                backgroundColor: v.status === 'confirmed' ? colors.success : v.status === 'disputed' ? colors.danger : colors.primary,
              }]} />
              <View style={styles.verificationContent}>
                <View style={styles.verificationHeader}>
                  <User size={10} color={colors.textMuted} />
                  <Text style={styles.verificationUser}>{v.userName}</Text>
                  <Text style={styles.verificationTime}>{formatTimestamp(v.timestamp)}</Text>
                </View>
                <Text style={styles.verificationStatus}>
                  {v.status === 'confirmed' ? 'Confirmed data' : v.status === 'disputed' ? 'Disputed data' : `Updated to ${v.newClearanceHeight?.toFixed(1) ?? '?'}m`}
                </Text>
                {v.comment && <Text style={styles.verificationComment}>{v.comment}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      {isAuthenticated && (
        <View style={styles.reportSection}>
          {!showReportForm ? (
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => setShowReportForm(true)}
              activeOpacity={0.7}
            >
              <AlertTriangle size={14} color={colors.warning} />
              <Text style={styles.reportBtnText}>Report an Issue</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.inlineForm}>
              <Text style={styles.inlineFormTitle}>Report Issue</Text>
              <View style={styles.reportTypeRow}>
                {reportTypes.map((rt) => (
                  <TouchableOpacity
                    key={rt.key}
                    style={[styles.reportTypeChip, reportType === rt.key && styles.reportTypeChipActive]}
                    onPress={() => setReportType(rt.key)}
                  >
                    <Text style={[styles.reportTypeText, reportType === rt.key && styles.reportTypeTextActive]}>
                      {rt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.inlineInputRow}>
                <MessageSquare size={14} color={colors.textMuted} />
                <TextInput
                  style={styles.inlineInput}
                  placeholder="Describe the issue..."
                  placeholderTextColor={colors.textMuted}
                  value={reportDesc}
                  onChangeText={setReportDesc}
                  multiline
                />
              </View>
              <View style={styles.inlineFormActions}>
                <TouchableOpacity style={styles.inlineCancel} onPress={() => setShowReportForm(false)}>
                  <Text style={styles.inlineCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.inlineSubmit} onPress={handleReport}>
                  <Send size={14} color={colors.white} />
                  <Text style={styles.inlineSubmitText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {reports.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Community Reports</Text>
          {reports.slice(0, 5).map((r) => (
            <View key={r.id} style={styles.reportItem}>
              <View style={styles.reportItemHeader}>
                <View style={styles.reportTypeBadge}>
                  <Text style={styles.reportTypeBadgeText}>{r.reportType.toUpperCase()}</Text>
                </View>
                <Text style={styles.reportItemUser}>{r.userName}</Text>
                <Text style={styles.reportItemTime}>{formatTimestamp(r.timestamp)}</Text>
              </View>
              <Text style={styles.reportItemDesc}>{r.description}</Text>
              <TouchableOpacity
                style={styles.upvoteBtn}
                onPress={() => handleUpvote(r.id)}
                activeOpacity={0.7}
              >
                <ThumbsUp size={12} color={r.upvotedBy.includes(userId ?? '') ? colors.primary : colors.textMuted} />
                <Text style={[styles.upvoteText, r.upvotedBy.includes(userId ?? '') && { color: colors.primary }]}>
                  {r.upvotes}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  communitySection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  communitySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  communitySectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  verifyStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyStat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  verifyStatNum: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  verifyStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  verifyStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  verifyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  alreadyVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: colors.success + '10',
    borderRadius: 8,
  },
  alreadyVerifiedText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  signInPrompt: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  inlineForm: {
    backgroundColor: colors.elevated,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  inlineFormTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 10,
  },
  inlineFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  inlineCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  inlineCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  inlineSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  inlineSubmitText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  verificationItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  verificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  verificationContent: {
    flex: 1,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verificationUser: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  verificationTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginLeft: 'auto',
  },
  verificationStatus: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  verificationComment: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  reportSection: {
    marginBottom: 12,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.warning + '12',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.warning + '25',
  },
  reportBtnText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  reportTypeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  reportTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportTypeChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  reportTypeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reportTypeTextActive: {
    color: colors.primary,
  },
  reportItem: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  reportItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportTypeBadge: {
    backgroundColor: colors.warning + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reportTypeBadgeText: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '700' as const,
  },
  reportItemUser: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reportItemTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginLeft: 'auto',
  },
  reportItemDesc: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.elevated,
  },
  upvoteText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
});
