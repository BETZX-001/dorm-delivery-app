import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../client';
import StarRating from '../components/StarRating';
import PrimaryButton from '../components/PrimaryButton';
import AnimatedToggle from '../components/AnimatedToggle';
import { colors, spacing } from '../components/theme';

const RATING_TEXT = ['', 'ควรปรับปรุง', 'พอใช้', 'ดี', 'ดีมาก', 'ยอดเยี่ยม'];

export default function ReviewScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { order } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  function handleSubmit() {
    if (rating < 1) { setError('กรุณาแตะดาวเพื่อให้คะแนน'); return; }
    setError(null); setConfirming(true);
  }
  async function confirmSubmit() {
    setSubmitting(true);
    try {
      const { runner_new_avg_rating } = await api.post('/api/reviews', { order_id: order.order_id, rating_score: rating, comment: comment || null, is_anonymous: anonymous });
      setConfirming(false);
      setResult({ success: true, message: `ขอบคุณสำหรับคะแนน! คะแนนเฉลี่ยของผู้รับหิ้วคือ ${Number(runner_new_avg_rating).toFixed(1)}` });
    } catch (err) {
      setConfirming(false);
      const alreadyReviewed = /already been reviewed|ได้รับการรีวิวแล้ว/i.test(err.message || '');
      setResult({ success: false, alreadyReviewed, message: alreadyReviewed ? 'ออร์เดอร์นี้ส่งคะแนนไปแล้ว คุณสามารถดูได้จากหน้าประวัติรีวิว' : err.message || 'กรุณาลองใหม่อีกครั้ง' });
    } finally { setSubmitting(false); }
  }

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <View style={styles.backIcon}><Ionicons name="arrow-back" size={19} color={colors.primaryDark} /></View><Text style={styles.backText}>กลับหน้าออเดอร์</Text>
        </Pressable>
        <View style={styles.heroRow}><View style={styles.heroIcon}><Ionicons name="star" size={25} color={colors.secondary} /></View><View style={{ flex: 1 }}><Text style={styles.heroTitle}>ให้คะแนนผู้รับหิ้ว</Text><Text style={styles.heroSubtitle}>ทุกความคิดเห็นช่วยพัฒนาบริการให้ดีขึ้น</Text></View></View>
      </View>

      <View style={styles.body}>
        <View style={styles.orderCard}>
          <View style={styles.orderIcon}><Ionicons name="bag-handle-outline" size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><Text style={styles.eyebrow}>ออเดอร์ที่ได้รับแล้ว</Text><Text style={styles.itemName}>{order.item_name}</Text>{order.destination ? <Text style={styles.meta}><Ionicons name="location-outline" size={13} color={colors.textSecondary} /> {order.destination}</Text> : null}</View>
          <View style={styles.doneBadge}><Ionicons name="checkmark" size={13} color={colors.runnerDark} /><Text style={styles.doneText}>สำเร็จ</Text></View>
        </View>

        <View style={[styles.ratingCard, rating > 0 && styles.ratingCardActive]}>
          <View style={styles.sectionIcon}><Ionicons name="sparkles-outline" size={19} color={colors.primary} /></View>
          <Text style={styles.prompt}>การรับหิ้วครั้งนี้เป็นอย่างไรบ้าง?</Text>
          <Text style={styles.ratingHint}>{rating ? `${RATING_TEXT[rating]} · ${rating} ดาว` : 'แตะดาวเพื่อเลือกคะแนน'}</Text>
          <View style={styles.starsWrap}><StarRating value={rating} onChange={(value) => { setRating(value); setError(null); }} size={31} /></View>
          <View style={styles.ratingScale}><Text style={styles.scaleText}>ควรปรับปรุง</Text><View style={styles.scaleLine} /><Text style={styles.scaleText}>ยอดเยี่ยม</Text></View>
          {error ? <View style={styles.errorRow}><Ionicons name="alert-circle-outline" size={15} color={colors.danger} /><Text style={styles.error}>{error}</Text></View> : null}
        </View>

        <View style={styles.commentCard}>
          <View style={styles.sectionHeading}><View style={styles.smallIcon}><Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.primary} /></View><View><Text style={styles.sectionTitle}>ความคิดเห็นเพิ่มเติม</Text><Text style={styles.sectionSubtitle}>ไม่บังคับ แต่มีประโยชน์กับผู้รับหิ้วมาก</Text></View></View>
          <TextInput value={comment} onChangeText={setComment} multiline maxLength={300} placeholder="เล่าความประทับใจ หรือสิ่งที่อยากให้ปรับปรุง..." placeholderTextColor={colors.textSecondary} style={styles.commentInput} textAlignVertical="top" />
          <Text style={styles.counter}>{comment.length}/300</Text>
        </View>
        <Pressable onPress={() => setAnonymous((value) => !value)} style={[styles.privacyCard, anonymous && styles.privacyCardActive]}>
          <View style={styles.privacyIcon}><Ionicons name={anonymous ? 'eye-off-outline' : 'person-outline'} size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><Text style={styles.privacyTitle}>{anonymous ? 'ไม่แสดงชื่อของฉัน' : 'แสดงชื่อของฉัน'}</Text><Text style={styles.privacyHint}>{anonymous ? 'ผู้รับหิ้วจะเห็นว่าเป็น “ผู้ใช้งานไม่ระบุตัวตน”' : 'ผู้รับหิ้วจะเห็นชื่อโปรไฟล์ของคุณ'}</Text></View>
          <AnimatedToggle active={anonymous} accent={colors.primary} />
        </Pressable>
      </View>
    </ScrollView>

    <View style={styles.footer}><PrimaryButton label={rating ? `ส่งคะแนน ${rating} ดาว` : 'เลือกดาวเพื่อส่งคะแนน'} onPress={handleSubmit} loading={submitting} disabled={!rating} /></View>
    <Modal visible={confirming || !!result} transparent animationType="fade" onRequestClose={() => !submitting && (result ? setResult(null) : setConfirming(false))}>
      <View style={styles.modalShade}><View style={styles.modalCard}>
        <View style={[styles.modalIcon, result && !result.success && styles.modalIconError]}><Ionicons name={result ? (result.success ? 'checkmark-circle-outline' : 'alert-circle-outline') : 'star'} size={30} color={result && !result.success ? colors.danger : colors.primary} /></View>
        <Text style={styles.modalTitle}>{result ? (result.success ? 'ส่งคะแนนสำเร็จ' : result.alreadyReviewed ? 'ให้คะแนนออร์เดอร์นี้แล้ว' : 'ส่งคะแนนไม่สำเร็จ') : 'ยืนยันการให้คะแนน?'}</Text>
        <Text style={styles.modalMessage}>{result ? result.message : `คุณให้ผู้รับหิ้ว ${rating} ดาว · ${RATING_TEXT[rating]}`}</Text>
        {result ? <Pressable onPress={() => result.success || result.alreadyReviewed ? navigation.goBack() : setResult(null)} style={styles.modalConfirm}><Text style={styles.modalConfirmText}>{result.success || result.alreadyReviewed ? 'กลับหน้าออเดอร์' : 'ลองใหม่'}</Text></Pressable> : <View style={styles.modalActions}><Pressable disabled={submitting} onPress={() => setConfirming(false)} style={styles.modalCancel}><Text style={styles.modalCancelText}>แก้ไข</Text></Pressable><Pressable disabled={submitting} onPress={confirmSubmit} style={[styles.modalConfirm, styles.modalConfirmInRow]}><Text style={styles.modalConfirmText}>{submitting ? 'กำลังส่ง...' : 'ยืนยันส่งคะแนน'}</Text></Pressable></View>}
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, scroll: { paddingBottom: 104 },
  hero: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingBottom: 23, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  back: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7, paddingLeft: 7, paddingRight: 12, marginBottom: 17, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.96)' },
  backIcon: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, backText: { color: colors.primaryDark, fontSize: 13, fontWeight: '900' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, heroIcon: { width: 51, height: 51, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }, heroTitle: { color: colors.white, fontSize: 24, fontWeight: '900' }, heroSubtitle: { color: 'rgba(255,255,255,.87)', fontSize: 12, marginTop: 3 },
  body: { padding: spacing.md, gap: 14 }, orderCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#FFD8C9', shadowColor: '#A8421B', shadowOpacity: .06, shadowRadius: 8, elevation: 2 }, orderIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '800' }, itemName: { color: colors.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 2 }, meta: { color: colors.textSecondary, fontSize: 11, marginTop: 3 }, doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.softGreen }, doneText: { color: colors.runnerDark, fontSize: 10, fontWeight: '900' },
  ratingCard: { alignItems: 'center', padding: 20, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, ratingCardActive: { borderColor: '#FFD2C0' }, sectionIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange, marginBottom: 9 }, prompt: { color: colors.textPrimary, fontSize: 17, fontWeight: '900', textAlign: 'center' }, ratingHint: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 5 }, starsWrap: { width: '100%', marginTop: 17, paddingVertical: 5 }, ratingScale: { width: '94%', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }, scaleText: { color: colors.textSecondary, fontSize: 9, fontWeight: '700' }, scaleLine: { flex: 1, height: 1, backgroundColor: colors.border }, errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }, error: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  commentCard: { padding: 15, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }, smallIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' }, sectionSubtitle: { color: colors.textSecondary, fontSize: 10, marginTop: 2 }, commentInput: { minHeight: 105, padding: 13, paddingBottom: 27, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FCFCFD', color: colors.textPrimary, fontSize: 13, outlineStyle: 'none' }, counter: { alignSelf: 'flex-end', color: colors.textSecondary, fontSize: 10, marginTop: -21, marginRight: 10, marginBottom: 7 },
  privacyCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, privacyCardActive: { borderColor: '#FFC6AE', backgroundColor: '#FFF8F5' }, privacyIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, privacyTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900' }, privacyHint: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  footer: { padding: 12, paddingBottom: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }, pressed: { opacity: .82, transform: [{ scale: .98 }] },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.48)', alignItems: 'center', justifyContent: 'center', padding: 22 }, modalCard: { width: '100%', maxWidth: 390, padding: 22, borderRadius: 22, alignItems: 'center', backgroundColor: colors.surface }, modalIcon: { width: 55, height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.softOrange }, modalIconError: { backgroundColor: '#FFF0F2' }, modalTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '900', marginTop: 12 }, modalMessage: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 7 }, modalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 21 }, modalCancel: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background }, modalCancelText: { color: colors.textPrimary, fontWeight: '900' }, modalConfirm: { marginTop: 21, minWidth: 150, alignItems: 'center', paddingHorizontal: 17, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary }, modalConfirmInRow: { flex: 1.3, minWidth: 0, marginTop: 0 }, modalConfirmText: { color: colors.white, fontWeight: '900' },
});
