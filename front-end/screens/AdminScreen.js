import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import { colors } from '../components/theme';

const NAVY = '#182B57';
const NAVY_SOFT = '#EAF0FF';
const SKY = '#4F6FE8';

const REPORT_STATUS = {
  OPEN: { label: 'รอตรวจสอบ', color: colors.danger, soft: '#FFF0F2' },
  REVIEWING: { label: 'กำลังตรวจสอบ', color: '#D99000', soft: '#FFF7DE' },
  RESOLVED: { label: 'แก้ไขแล้ว', color: colors.runnerDark, soft: colors.softGreen },
};

const CATEGORIES = {
  LATE_DELIVERY: ['ส่งล่าช้า', 'time-outline'],
  ITEM_ISSUE: ['ปัญหาสินค้า', 'cube-outline'],
  PAYMENT_DISPUTE: ['ปัญหาค่าใช้จ่าย', 'wallet-outline'],
  BEHAVIOR: ['พฤติกรรมไม่เหมาะสม', 'person-remove-outline'],
  OTHER: ['อื่น ๆ', 'ellipsis-horizontal-outline'],
};

const ORDER_FLOW = [
  ['PENDING', 'รอยืนยัน', '#F0A000'],
  ['ACCEPTED', 'รับออเดอร์แล้ว', '#4F6FE8'],
  ['SHOPPING', 'กำลังซื้อ', '#8B5CF6'],
  ['WAITING', 'ได้รับของแล้ว', '#0EA5A4'],
  ['DELIVERING', 'กำลังนำส่ง', colors.runner],
];

function number(value) { return Number(value || 0); }
function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminScreen() {
  const { systemRevision } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reportFilter, setReportFilter] = useState('OPEN');
  const [updatingReport, setUpdatingReport] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      setData(await api.get(`/api/admin/overview${forceRefresh ? '?refresh=1' : ''}`));
      setLoadedAt(new Date());
    }
    catch (loadError) { console.log('Admin overview failed:', loadError.message); setError(loadError.message); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(false); }, [load]));
  useEffect(() => { if (systemRevision) load(true); }, [systemRevision, load]);

  async function updateReportStatus(reportId, status) {
    setUpdatingReport(reportId);
    try { await api.patch(`/api/admin/reports/${reportId}/status`, { status }); await load(); }
    catch (updateError) { setError(updateError.message); }
    finally { setUpdatingReport(null); }
  }

  const reports = useMemo(() => (data?.reports || []).filter((report) => report.status === reportFilter), [data?.reports, reportFilter]);

  if (!data && !error) return <View style={styles.loading}><View style={styles.loadingIcon}><Ionicons name="shield-checkmark" size={30} color={SKY} /></View><ActivityIndicator size="large" color={NAVY} /><Text style={styles.loadingText}>กำลังเตรียม Control Center...</Text></View>;
  if (!data) return <View style={styles.loading}><View style={styles.errorIcon}><Ionicons name="cloud-offline-outline" size={31} color={colors.danger} /></View><Text style={styles.errorTitle}>ยังโหลด Dashboard ไม่ได้</Text><Text style={styles.errorText}>{error}</Text><Text style={styles.errorHint}>ตรวจสอบการเชื่อมต่อ API แล้วลองใหม่อีกครั้ง</Text><Pressable style={({ pressed }) => [styles.retry, pressed && styles.pressed]} onPress={load}><Ionicons name="refresh" size={18} color={colors.white} /><Text style={styles.retryText}>ลองใหม่</Text></Pressable></View>;

  const stats = data.stats || {};
  const reportCount = number(stats.open_reports) + number(stats.reviewing_reports);
  const statusCounts = Object.fromEntries((data.order_statuses || []).map((item) => [item.status, number(item.count)]));
  const maxOrderStatus = Math.max(1, ...ORDER_FLOW.map(([status]) => statusCounts[status] || 0));
  const kpis = [
    { label: 'ผู้ใช้ทั้งหมด', value: number(stats.total_users), detail: 'บัญชีในชุมชน', icon: 'people-outline', color: SKY, soft: NAVY_SOFT },
    { label: 'รอบที่เปิดรับ', value: number(stats.open_slots), detail: `จากทั้งหมด ${number(stats.total_slots)} รอบ`, icon: 'storefront-outline', color: colors.runnerDark, soft: colors.softGreen },
    { label: 'ออเดอร์ปัจจุบัน', value: number(stats.active_orders), detail: `สำเร็จวันนี้ ${number(stats.completed_today)}`, icon: 'receipt-outline', color: colors.primary, soft: colors.softOrange },
    { label: 'คะแนนเฉลี่ย', value: number(stats.average_rating).toFixed(1), detail: `${number(stats.total_reviews)} รีวิว`, icon: 'star-outline', color: '#D99000', soft: '#FFF7DE' },
  ];
  const filters = [
    ['OPEN', 'รอตรวจ', number(stats.open_reports)],
    ['REVIEWING', 'กำลังตรวจ', number(stats.reviewing_reports)],
    ['RESOLVED', 'เสร็จสิ้น', number(stats.resolved_reports)],
  ];

  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} tintColor={NAVY} onRefresh={() => { setRefreshing(true); load(true); }} />}>
    <View style={styles.hero}>
      <View style={styles.heroOrbOne} /><View style={styles.heroOrbTwo} />
      <View style={styles.heroTop}><View style={styles.adminBadge}><Ionicons name="shield-checkmark" size={15} color="#BED0FF" /><Text style={styles.eyebrow}>HIU CONTROL CENTER</Text></View><Pressable accessibilityLabel="รีเฟรชข้อมูล" onPress={() => { setRefreshing(true); load(true); }} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}><Ionicons name="refresh" size={20} color={colors.white} /></Pressable></View>
      <Text style={styles.title}>Admin Dashboard</Text><Text style={styles.subtitle}>ดูภาพรวมระบบและจัดการสิ่งที่ต้องตรวจสอบจากที่เดียว</Text>
      <View style={styles.health}><View style={styles.healthDot} /><Text style={styles.healthText}>อัปเดตอัตโนมัติ</Text><Text style={styles.healthTime}>{loadedAt ? `ล่าสุด ${loadedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'กำลังอัปเดต'}</Text></View>
    </View>

    <View style={styles.body}>
      <View style={styles.attentionCard}><View style={styles.attentionIcon}><Ionicons name={reportCount ? 'notifications' : 'checkmark-circle'} size={25} color={reportCount ? colors.danger : colors.runner} /></View><View style={{ flex: 1 }}><Text style={styles.attentionOverline}>งานที่ต้องจัดการ</Text><Text style={styles.attentionTitle}>{reportCount ? `${reportCount} รายงานกำลังรอ Admin` : 'ไม่มีรายการค้างตรวจ'}</Text><Text style={styles.attentionText}>{reportCount ? `${number(stats.open_reports)} เรื่องใหม่ · ${number(stats.reviewing_reports)} เรื่องกำลังตรวจสอบ` : 'รายงานทั้งหมดได้รับการจัดการแล้ว'}</Text></View><View style={[styles.attentionNumber, !reportCount && styles.attentionNumberDone]}><Text style={[styles.attentionNumberText, !reportCount && styles.attentionNumberTextDone]}>{reportCount}</Text></View></View>

      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>ภาพรวมระบบ</Text><Text style={styles.sectionSubtitle}>ข้อมูลสำคัญของชุมชน Hiu</Text></View><Ionicons name="analytics-outline" size={20} color={SKY} /></View>
      <View style={styles.grid}>{kpis.map((item) => <View style={styles.stat} key={item.label}><View style={[styles.statIcon, { backgroundColor: item.soft }]}><Ionicons name={item.icon} size={21} color={item.color} /></View><Text style={styles.statValue}>{item.value}</Text><Text style={styles.statLabel}>{item.label}</Text><Text style={styles.statDetail}>{item.detail}</Text></View>)}</View>

      <View style={styles.operationCard}>
        <View style={styles.cardTitleRow}><View><Text style={styles.cardTitle}>สถานะออเดอร์ที่กำลังทำ</Text><Text style={styles.cardSubtitle}>ติดตามคอขวดในแต่ละขั้นตอน</Text></View><View style={styles.activeTotal}><Text style={styles.activeTotalValue}>{number(stats.active_orders)}</Text><Text style={styles.activeTotalLabel}>กำลังดำเนินการ</Text></View></View>
        <View style={styles.flowList}>{ORDER_FLOW.map(([status, label, color]) => { const count = statusCounts[status] || 0; return <View style={styles.flowRow} key={status}><View style={[styles.flowDot, { backgroundColor: color }]} /><Text style={styles.flowLabel}>{label}</Text><View style={styles.flowTrack}><View style={[styles.flowFill, { backgroundColor: color, width: `${Math.max(count ? 8 : 0, (count / maxOrderStatus) * 100)}%` }]} /></View><Text style={styles.flowCount}>{count}</Text></View>; })}</View>
        <View style={styles.slotSummary}><View style={styles.slotSummaryItem}><Text style={styles.slotSummaryValue}>{number(stats.full_slots)}</Text><Text style={styles.slotSummaryLabel}>รอบเต็ม</Text></View><View style={styles.slotDivider} /><View style={styles.slotSummaryItem}><Text style={styles.slotSummaryValue}>{number(stats.shopping_slots)}</Text><Text style={styles.slotSummaryLabel}>กำลังซื้อ</Text></View><View style={styles.slotDivider} /><View style={styles.slotSummaryItem}><Text style={styles.slotSummaryValue}>{number(stats.completed_slots)}</Text><Text style={styles.slotSummaryLabel}>รอบสำเร็จ</Text></View></View>
      </View>

      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>ศูนย์จัดการรายงาน</Text><Text style={styles.sectionSubtitle}>ตรวจสอบปัญหาที่ผู้ใช้แจ้งเข้ามา</Text></View><View style={styles.inboxIcon}><Ionicons name="file-tray-full-outline" size={20} color={colors.danger} /></View></View>
      <View style={styles.filters}>{filters.map(([status, label, count]) => { const active = reportFilter === status; return <Pressable key={status} onPress={() => setReportFilter(status)} style={[styles.filter, active && styles.filterActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text><View style={[styles.filterCount, active && styles.filterCountActive]}><Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text></View></Pressable>; })}</View>
      {error ? <View style={styles.inlineError}><Ionicons name="alert-circle-outline" size={17} color={colors.danger} /><Text style={styles.inlineErrorText}>{error}</Text><Pressable onPress={() => setError(null)}><Ionicons name="close" size={18} color={colors.danger} /></Pressable></View> : null}

      {reports.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="checkmark-done" size={28} color={colors.runner} /></View><Text style={styles.emptyTitle}>ไม่มีรายงานในหมวดนี้</Text><Text style={styles.emptyText}>เมื่อมีรายการใหม่ ระบบจะแสดงไว้ตรงนี้</Text></View> : reports.map((report) => {
        const category = CATEGORIES[report.category] || CATEGORIES.OTHER;
        const status = REPORT_STATUS[report.status] || REPORT_STATUS.OPEN;
        const busy = updatingReport === report.report_id;
        return <View style={styles.report} key={report.report_id}>
          <View style={styles.reportHead}><View style={styles.reporterAvatar}><Text style={styles.reporterInitial}>{(report.reporter_name || 'ผ')[0]}</Text></View><View style={{ flex: 1 }}><Text style={styles.reporter}>{report.reporter_name || 'ผู้ใช้'}</Text><Text style={styles.reportMeta}>รายงาน #{String(report.report_id).padStart(4, '0')}{report.order_id ? ` · ออเดอร์ #${report.order_id}` : ''}</Text></View><View style={[styles.status, { backgroundColor: status.soft }]}><View style={[styles.statusDot, { backgroundColor: status.color }]} /><Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text></View></View>
          <View style={styles.categoryRow}><View style={styles.categoryIcon}><Ionicons name={category[1]} size={16} color={colors.primary} /></View><Text style={styles.category}>{category[0]}</Text><Text style={styles.reportDate}>{formatDate(report.created_at)}</Text></View>
          <Text style={styles.description}>{report.description || 'ไม่ได้ระบุรายละเอียดเพิ่มเติม'}</Text>
          {report.status !== 'RESOLVED' && <Pressable disabled={busy} onPress={() => updateReportStatus(report.report_id, report.status === 'OPEN' ? 'REVIEWING' : 'RESOLVED')} style={({ pressed }) => [styles.reportAction, report.status === 'REVIEWING' && styles.resolveAction, busy && styles.actionDisabled, pressed && !busy && styles.pressed]}>{busy ? <ActivityIndicator size="small" color={colors.white} /> : <><Ionicons name={report.status === 'OPEN' ? 'eye-outline' : 'checkmark-done-outline'} size={18} color={colors.white} /><Text style={styles.reportActionText}>{report.status === 'OPEN' ? 'รับเรื่องตรวจสอบ' : 'ทำเครื่องหมายว่าแก้ไขแล้ว'}</Text></>}</Pressable>}
        </View>;
      })}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F3F6FA' }, content: { paddingBottom: 34 }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: '#F3F6FA' }, loadingIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: NAVY_SOFT, marginBottom: 16 }, loadingText: { color: colors.textSecondary, fontSize: 12, marginTop: 12, fontWeight: '700' }, errorIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F2' }, errorTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 20, marginTop: 13 }, errorText: { color: colors.danger, marginTop: 8, textAlign: 'center', fontWeight: '700' }, errorHint: { color: colors.textSecondary, marginTop: 7, textAlign: 'center', lineHeight: 20 }, retry: { marginTop: 18, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', gap: 7 }, retryText: { color: colors.white, fontWeight: '900' },
  hero: { minHeight: 205, paddingHorizontal: 19, paddingTop: 24, paddingBottom: 37, backgroundColor: NAVY, overflow: 'hidden' }, heroOrbOne: { position: 'absolute', width: 170, height: 170, borderRadius: 85, right: -65, top: -75, backgroundColor: 'rgba(91,123,225,.2)' }, heroOrbTwo: { position: 'absolute', width: 115, height: 115, borderRadius: 58, left: -48, bottom: -55, backgroundColor: 'rgba(255,255,255,.05)' }, heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.08)' }, eyebrow: { color: '#BED0FF', fontSize: 9, letterSpacing: .9, fontWeight: '900' }, refreshButton: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.12)' }, title: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 18 }, subtitle: { color: '#D7E1FA', fontSize: 12, lineHeight: 18, marginTop: 3 }, health: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginTop: 16 }, healthDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#54E58A', marginRight: 6 }, healthText: { color: '#DDFBE8', fontSize: 10, fontWeight: '900' }, healthTime: { color: '#91A6D3', fontSize: 9, marginLeft: 9 },
  body: { paddingHorizontal: 15 }, attentionCard: { marginTop: -22, padding: 14, minHeight: 92, borderRadius: 19, borderWidth: 1, borderColor: '#DDE4F1', backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 11, shadowColor: '#14264D', shadowOpacity: .1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, attentionIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF2F3' }, attentionOverline: { color: colors.textSecondary, fontSize: 9, fontWeight: '900' }, attentionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', marginTop: 2 }, attentionText: { color: colors.textSecondary, fontSize: 10, marginTop: 3 }, attentionNumber: { minWidth: 36, height: 36, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger }, attentionNumberDone: { backgroundColor: colors.softGreen }, attentionNumberText: { color: colors.white, fontSize: 15, fontWeight: '900' }, attentionNumberTextDone: { color: colors.runnerDark },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 11, paddingHorizontal: 2 }, sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' }, sectionSubtitle: { color: colors.textSecondary, fontSize: 10, marginTop: 2 }, inboxIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F2' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, stat: { width: '48.8%', minHeight: 145, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }, statIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, statValue: { color: colors.textPrimary, fontSize: 25, fontWeight: '900', marginTop: 9 }, statLabel: { color: colors.textPrimary, fontSize: 11, fontWeight: '900', marginTop: 1 }, statDetail: { color: colors.textSecondary, fontSize: 9, marginTop: 3 },
  operationCard: { marginTop: 13, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }, cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' }, cardSubtitle: { color: colors.textSecondary, fontSize: 9, marginTop: 2 }, activeTotal: { alignItems: 'flex-end' }, activeTotalValue: { color: NAVY, fontSize: 20, fontWeight: '900' }, activeTotalLabel: { color: colors.textSecondary, fontSize: 8 }, flowList: { marginTop: 16, gap: 11 }, flowRow: { flexDirection: 'row', alignItems: 'center' }, flowDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 }, flowLabel: { width: 87, color: colors.textPrimary, fontSize: 10, fontWeight: '700' }, flowTrack: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.muted }, flowFill: { height: '100%', borderRadius: 4 }, flowCount: { width: 25, textAlign: 'right', color: colors.textPrimary, fontSize: 11, fontWeight: '900' }, slotSummary: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.border }, slotSummaryItem: { flex: 1, alignItems: 'center' }, slotSummaryValue: { color: NAVY, fontSize: 15, fontWeight: '900' }, slotSummaryLabel: { color: colors.textSecondary, fontSize: 9, marginTop: 2 }, slotDivider: { width: 1, height: 28, backgroundColor: colors.border },
  filters: { flexDirection: 'row', gap: 6, padding: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.white, marginBottom: 11 }, filter: { flex: 1, minHeight: 42, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, filterActive: { backgroundColor: NAVY }, filterText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' }, filterTextActive: { color: colors.white }, filterCount: { minWidth: 21, height: 21, paddingHorizontal: 5, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted }, filterCountActive: { backgroundColor: 'rgba(255,255,255,.18)' }, filterCountText: { color: colors.textSecondary, fontSize: 9, fontWeight: '900' }, filterCountTextActive: { color: colors.white }, inlineError: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, marginBottom: 10, borderRadius: 11, backgroundColor: '#FFF0F2' }, inlineErrorText: { flex: 1, color: colors.danger, fontSize: 10, fontWeight: '700' },
  empty: { backgroundColor: colors.white, alignItems: 'center', paddingVertical: 40, borderRadius: 18, borderWidth: 1, borderColor: colors.border }, emptyIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softGreen }, emptyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', marginTop: 11 }, emptyText: { color: colors.textSecondary, fontSize: 10, marginTop: 3 }, report: { backgroundColor: colors.white, marginBottom: 10, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border }, reportHead: { flexDirection: 'row', alignItems: 'center' }, reporterAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: NAVY_SOFT, marginRight: 9 }, reporterInitial: { color: SKY, fontSize: 14, fontWeight: '900' }, reporter: { color: colors.textPrimary, fontWeight: '900', fontSize: 13 }, reportMeta: { color: colors.textSecondary, fontSize: 9, marginTop: 2 }, status: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 }, statusDot: { width: 6, height: 6, borderRadius: 3 }, statusText: { fontSize: 8, fontWeight: '900' }, categoryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 }, categoryIcon: { width: 29, height: 29, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, category: { color: colors.primaryDark, fontSize: 10, fontWeight: '900', marginLeft: 7 }, reportDate: { marginLeft: 'auto', color: colors.textSecondary, fontSize: 8 }, description: { color: colors.textPrimary, fontSize: 12, lineHeight: 18, marginTop: 9, padding: 10, borderRadius: 11, backgroundColor: colors.background }, reportAction: { minHeight: 43, marginTop: 11, borderRadius: 12, backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, resolveAction: { backgroundColor: colors.runnerDark }, reportActionText: { color: colors.white, fontSize: 11, fontWeight: '900' }, actionDisabled: { opacity: .55 }, pressed: { opacity: .8, transform: [{ scale: .98 }] },
});
