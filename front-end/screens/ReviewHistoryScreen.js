import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import ProfilePageHeader from '../components/ProfilePageHeader';
import AnimatedToggle from '../components/AnimatedToggle';
import { colors, spacing } from '../components/theme';

export default function ReviewHistoryScreen({ navigation }) {
  const { activeRole, systemRevision } = useAuth();
  const runner = activeRole === 'RUNNER';
  const accent = runner ? colors.runner : colors.primary;
  const soft = runner ? colors.softGreen : colors.softOrange;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(null);

  const load = useCallback(async (showFullLoader = false, fresh = false, silent = false) => {
    if (showFullLoader) setLoading(true);
    else if (!silent) setRefreshing(true);
    if (!silent) setError(null);
    try {
      const { reviews: data } = await (fresh ? api.get : api.getCached)('/api/reviews/mine');
      setReviews(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.log('Review history failed:', loadError.message);
      setReviews((current) => {
        if (!current.length) setError(loadError.message || 'ไม่สามารถโหลดประวัติรีวิวได้');
        return current;
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(false, true, true); }, [load]));
  useEffect(() => { if (systemRevision) load(false, true, true); }, [systemRevision, load]);

  async function togglePrivacy(review) {
    if (updatingPrivacy) return;
    setUpdatingPrivacy(review.review_id);
    const nextAnonymous = !review.is_anonymous;
    setReviews((current) => current.map((item) => item.review_id === review.review_id ? { ...item, is_anonymous: nextAnonymous } : item));
    try {
      await api.patch(`/api/reviews/${review.review_id}/privacy`, { is_anonymous: nextAnonymous });
    } catch (privacyError) {
      setReviews((current) => current.map((item) => item.review_id === review.review_id ? { ...item, is_anonymous: review.is_anonymous } : item));
      setError(privacyError.message || 'เปลี่ยนการแสดงชื่อไม่สำเร็จ');
    } finally { setUpdatingPrivacy(null); }
  }

  const visibleReviews = useMemo(
    () => reviews.filter((review) => runner ? review.review_type === 'RECEIVED' : review.review_type === 'GIVEN'),
    [reviews, runner]
  );

  return <View style={styles.page}>
    <ProfilePageHeader navigation={navigation} icon="star-outline" title="ประวัติรีวิว" subtitle={runner ? 'ดูความคิดเห็นและคะแนนที่คุณได้รับ' : 'ย้อนดูคะแนนที่คุณเคยให้ผู้รับหิ้ว'} />
    {loading ? <View style={styles.loading}><ActivityIndicator color={accent} /><Text style={styles.loadingText}>กำลังโหลดประวัติรีวิว...</Text></View> :
      <FlatList contentContainerStyle={styles.content} data={visibleReviews} keyExtractor={(item) => String(item.review_id)} refreshing={refreshing} onRefresh={() => load(false)}
        ListHeaderComponent={<><View style={[styles.summary, { backgroundColor: soft }]}><View style={[styles.summaryIcon, { backgroundColor: accent }]}><Ionicons name="chatbubbles-outline" size={20} color={colors.white} /></View><View style={{ flex: 1 }}><Text style={[styles.summaryCount, { color: accent }]}>{visibleReviews.length} รีวิว</Text><Text style={styles.summaryText}>{runner ? 'ความคิดเห็นจากผู้ฝากซื้อทั้งหมด' : 'ความคิดเห็นที่คุณส่งให้ผู้รับหิ้ว'}</Text></View></View>{error ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => load(false)}><Text style={[styles.retryText, { color: accent }]}>ลองใหม่</Text></Pressable></View> : null}</>}
        ListEmptyComponent={<View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: soft }]}><Ionicons name="star-outline" size={30} color={accent} /></View><Text style={styles.emptyTitle}>ยังไม่มีประวัติรีวิว</Text><Text style={styles.emptyText}>เมื่อมีการให้คะแนน รายการจะแสดงที่หน้านี้</Text><Pressable onPress={load} style={[styles.reload, { borderColor: accent }]}><Ionicons name="refresh" size={15} color={accent} /><Text style={[styles.reloadText, { color: accent }]}>โหลดอีกครั้ง</Text></Pressable></View>}
        renderItem={({ item }) => {
          const received = item.review_type === 'RECEIVED';
          return <View style={[styles.card, { borderLeftColor: accent }]}>
            <View style={styles.cardTop}><View style={[styles.avatar, { backgroundColor: soft }]}><Ionicons name={item.is_anonymous ? 'eye-off-outline' : received ? 'person-outline' : 'paper-plane-outline'} size={19} color={accent} /></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{received ? `รีวิวจาก ${item.is_anonymous ? 'ผู้ใช้งานไม่ระบุตัวตน' : item.reviewer_name || 'ผู้ใช้งาน'}` : `คุณให้คะแนน ${item.runner_name || 'ผู้รับหิ้ว'}`}</Text><Text style={styles.meta} numberOfLines={1}>{item.item_name || 'ออเดอร์'} · {item.destination || 'ไม่ระบุปลายทาง'}</Text></View><View style={[styles.typeBadge, { backgroundColor: soft }]}><Text style={[styles.typeText, { color: accent }]}>{item.is_anonymous ? 'ไม่ระบุชื่อ' : received ? 'ได้รับ' : 'ให้ไว้'}</Text></View></View>
            <View style={styles.scoreRow}><Text style={styles.stars}>{'★'.repeat(item.rating_score)}<Text style={styles.dimStars}>{'★'.repeat(5 - item.rating_score)}</Text></Text><Text style={styles.score}>{item.rating_score}.0</Text></View>
            <View style={styles.commentBox}>{item.comment ? <Text style={styles.comment}>“{item.comment}”</Text> : <Text style={styles.noComment}>ไม่มีความคิดเห็นเพิ่มเติม</Text>}</View>
            {!received && <Pressable disabled={updatingPrivacy === item.review_id} onPress={() => togglePrivacy(item)} style={({ pressed }) => [styles.privacyControl, item.is_anonymous && styles.privacyControlAnonymous, pressed && styles.pressed]}><View style={[styles.privacyControlIcon, { backgroundColor: soft }]}><Ionicons name={item.is_anonymous ? 'eye-off-outline' : 'person-outline'} size={17} color={accent} /></View><View style={{ flex: 1 }}><Text style={styles.privacyControlTitle}>{item.is_anonymous ? 'ปิดชื่ออยู่' : 'เปิดชื่ออยู่'}</Text><Text style={styles.privacyControlHint}>แตะเพื่อ{item.is_anonymous ? 'แสดงชื่อของคุณ' : 'ไม่เปิดเผยชื่อ'} · เปลี่ยนได้ทุกเมื่อ</Text></View><AnimatedToggle active={item.is_anonymous} accent={accent} disabled={updatingPrivacy === item.review_id} /></Pressable>}
          </View>;
        }} />}
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.md, paddingBottom: 36 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, loadingText: { color: colors.textSecondary, fontSize: 12 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 11, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFD5DB', backgroundColor: '#FFF4F5' }, errorText: { flex: 1, color: colors.danger, fontSize: 11, fontWeight: '700' }, retryText: { fontSize: 11, fontWeight: '900' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 17, marginBottom: 14 }, summaryIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, summaryCount: { fontSize: 15, fontWeight: '900' }, summaryText: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  card: { padding: 15, marginBottom: 11, borderRadius: 18, borderWidth: 1, borderLeftWidth: 4, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: '#10213E', shadowOpacity: .04, shadowRadius: 6, elevation: 1 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, cardTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 13 }, meta: { color: colors.textSecondary, fontSize: 10, marginTop: 3 }, typeBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 }, typeText: { fontSize: 9, fontWeight: '900' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 }, stars: { color: colors.secondary, fontSize: 18, letterSpacing: 1 }, dimStars: { color: colors.border }, score: { color: colors.textPrimary, fontSize: 12, fontWeight: '900' }, commentBox: { marginTop: 10, padding: 11, borderRadius: 12, backgroundColor: colors.background }, comment: { color: colors.textPrimary, fontSize: 12, lineHeight: 18 }, noComment: { color: colors.textSecondary, fontSize: 11 },
  privacyControl: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10, padding: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, privacyControlAnonymous: { borderColor: '#FFD0BD', backgroundColor: '#FFF9F6' }, privacyControlIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, privacyControlTitle: { color: colors.textPrimary, fontSize: 11, fontWeight: '900' }, privacyControlHint: { color: colors.textSecondary, fontSize: 9, marginTop: 2 }, pressed: { opacity: .78, transform: [{ scale: .98 }] },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.surface }, emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 17, marginTop: 12 }, emptyText: { color: colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center' }, reload: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 16, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1 }, reloadText: { fontSize: 11, fontWeight: '900' },
});
