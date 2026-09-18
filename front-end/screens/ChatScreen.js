import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import { colors, spacing } from '../components/theme';

export default function ChatScreen({ route }) {
  const { order } = route.params;
  const { firebaseUser, activeRole, refreshUnread } = useAuth();
  const runner = activeRole === 'RUNNER';
  const accent = runner ? colors.runner : colors.primary;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [closed, setClosed] = useState(['COMPLETED', 'REJECTED'].includes(order.order_status));
  const listRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    try {
      const result = await api.get(`/api/chats/${order.order_id}`);
      setMessages(result.messages || []);
      setClosed(['COMPLETED', 'REJECTED'].includes(result.order_status));
      setError(null);
      refreshUnread();
    } catch (loadError) {
      if (!silent) setError(loadError.message);
    } finally { setLoading(false); }
  }, [order.order_id, refreshUnread]);

  useFocusEffect(useCallback(() => {
    load();
    const timer = setInterval(() => load(true), 8_000);
    return () => clearInterval(timer);
  }, [load]));

  async function send() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true); setError(null);
    try {
      const { message } = await api.post(`/api/chats/${order.order_id}`, { text: value });
      setMessages((current) => [...current, message]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (sendError) { setError(sendError.message); }
    finally { setSending(false); }
  }

  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
    <View style={styles.header}><View style={[styles.avatar, { backgroundColor: runner ? colors.softGreen : colors.softOrange }]}><Ionicons name="chatbubbles" size={20} color={accent} /></View><View style={{ flex: 1 }}><Text style={styles.title}>{runner ? order.requester_name || 'ผู้ฝากซื้อ' : order.runner_name || 'ผู้รับหิ้ว'}</Text><Text style={styles.subtitle}>แชทออเดอร์ #{String(order.order_id).padStart(4, '0')}</Text></View>{closed ? <View style={styles.closedBadge}><Ionicons name="lock-closed" size={11} color={colors.textSecondary} /><Text style={styles.closedBadgeText}>สิ้นสุดแล้ว</Text></View> : null}</View>
    {error ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={17} color={colors.danger} /><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => load()}><Text style={[styles.retry, { color: accent }]}>ลองใหม่</Text></Pressable></View> : null}
    {loading ? <ActivityIndicator style={{ flex: 1 }} color={accent} /> : <FlatList ref={listRef} data={messages} keyExtractor={(item) => item.message_id} contentContainerStyle={styles.list} onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })} ListEmptyComponent={<View style={styles.empty}><Ionicons name="chatbubble-ellipses-outline" size={38} color={accent} /><Text style={styles.emptyTitle}>เริ่มพูดคุยเกี่ยวกับออเดอร์นี้</Text><Text style={styles.emptyText}>ใช้แชทสำหรับแจ้งรายละเอียดสินค้าและเวลาส่ง</Text></View>} renderItem={({ item }) => { const mine = item.sender_id === firebaseUser?.uid; const time = item.created_at ? new Date(item.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''; return <View style={[styles.bubble, mine ? [styles.mine, { backgroundColor: accent }] : styles.theirs]}><Text style={[styles.message, mine && styles.mineText]}>{item.text}</Text>{mine ? <View style={styles.receiptRow}><Ionicons name={item.read_at ? 'checkmark-done' : 'checkmark'} size={12} color="rgba(255,255,255,.82)" /><Text style={[styles.time, styles.mineTime]}>{item.read_at ? 'อ่านแล้ว' : 'ส่งแล้ว'}{time ? ` · ${time}` : ''}</Text></View> : <Text style={styles.time}>{time}</Text>}</View>; }} />}
    {closed ? <View style={styles.closedComposer}><Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} /><View><Text style={styles.closedTitle}>การสนทนาสิ้นสุดแล้ว</Text><Text style={styles.closedText}>ดูข้อความเดิมได้ แต่ไม่สามารถส่งข้อความใหม่ได้</Text></View></View> : <View style={styles.composer}><TextInput value={text} onChangeText={setText} maxLength={500} multiline placeholder="พิมพ์ข้อความ..." placeholderTextColor={colors.textSecondary} style={styles.input} /><Pressable disabled={!text.trim() || sending} onPress={send} style={[styles.send, { backgroundColor: accent }, (!text.trim() || sending) && styles.disabled]}>{sending ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="send" size={19} color={colors.white} />}</Pressable></View>}
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }, avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, title: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' }, subtitle: { color: colors.textSecondary, fontSize: 10, marginTop: 2 }, closedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.muted }, closedBadgeText: { color: colors.textSecondary, fontSize: 9, fontWeight: '900' },
  list: { padding: spacing.md, flexGrow: 1 }, bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, marginBottom: 8 }, mine: { alignSelf: 'flex-end', borderBottomRightRadius: 4 }, theirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, message: { color: colors.textPrimary, fontSize: 13, lineHeight: 19 }, mineText: { color: colors.white }, time: { color: colors.textSecondary, fontSize: 8, marginTop: 4, alignSelf: 'flex-end' }, mineTime: { color: 'rgba(255,255,255,.82)', marginTop: 0 }, receiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 90 }, emptyTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900', marginTop: 12 }, emptyText: { color: colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center' }, error: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: '#FFF1F3' }, errorText: { flex: 1, color: colors.danger, fontSize: 10 }, retry: { fontSize: 10, fontWeight: '900' }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, padding: 11, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }, input: { flex: 1, maxHeight: 100, minHeight: 44, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.textPrimary, outlineStyle: 'none' }, send: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: .45 },
  closedComposer: { minHeight: 67, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.muted }, closedTitle: { color: colors.textPrimary, fontSize: 11, fontWeight: '900' }, closedText: { color: colors.textSecondary, fontSize: 9, marginTop: 2 },
});
