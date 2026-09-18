import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import { colors, spacing } from '../components/theme';

const ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'SHOPPING', 'WAITING', 'DELIVERING'];
const MENU = [
  ['person-outline', 'แก้ไขข้อมูลส่วนตัว', 'จัดการชื่อ เบอร์โทร และห้องพัก', 'EditProfile'],
  ['star-outline', 'ประวัติรีวิว', 'ดูคะแนนที่ได้รับและเคยให้ไว้', 'ReviewHistory'],
  ['bicycle-outline', 'ประวัติการรับออเดอร์', 'งานรับหิ้วที่เสร็จสิ้นทั้งหมด', 'OrderHistory', { type: 'RUNNER' }],
  ['bag-check-outline', 'ประวัติการฝากซื้อ', 'ออเดอร์ฝากซื้อที่ผ่านมา', 'OrderHistory', { type: 'REQUESTER' }],
  ['bug-outline', 'รายงานปัญหาแอป', 'แจ้งข้อผิดพลาดหรือส่งข้อเสนอแนะ', 'AppIssue'],
];

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile, activeRole, switchRole, refreshProfile, systemRevision } = useAuth();
  const runner = activeRole === 'RUNNER';
  const accent = runner ? colors.runner : colors.primary;
  const dark = runner ? colors.runnerDark : colors.primaryDark;
  const soft = runner ? colors.softGreen : colors.softOrange;
  const [profileStats, setProfileStats] = useState({ runner_history: 0, requester_history: 0, active_runner_orders: 0, active_requester_orders: 0 });
  const [avatarUri, setAvatarUri] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const imageKey = `profile-image:${profile?.user_id || 'current'}`;

  const loadCount = useCallback(async () => {
    try {
      if (!profile?.user_id) return;
      const result = await api.get(`/api/users/${profile.user_id}/public`);
      setProfileStats(result.stats || {});
    } catch { /* retain the last successful totals */ }
  }, [profile?.user_id]);

  useEffect(() => { loadCount(); const timer = setInterval(loadCount, 300_000); return () => clearInterval(timer); }, [loadCount]);
  useEffect(() => { if (systemRevision) { loadCount(); refreshProfile().catch(() => {}); } }, [systemRevision, loadCount]);
  useEffect(() => {
    if (profile?.profile_image) {
      setAvatarUri(profile.profile_image);
      return;
    }
    AsyncStorage.getItem(imageKey).then(async (legacyUri) => {
      setAvatarUri(legacyUri);
      if (!legacyUri || Platform.OS !== 'web') return;
      try {
        const blob = await fetch(legacyUri).then((response) => response.blob());
        const sharedUri = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        await api.patch('/api/users/profile-image', { profile_image: sharedUri });
        setAvatarUri(sharedUri);
        await AsyncStorage.setItem(imageKey, sharedUri);
        await refreshProfile();
      } catch {
        // A stale local blob cannot be shared; choosing the image again replaces it.
      }
    });
  }, [imageKey, profile?.profile_image]);

  async function choosePhoto() {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .45, base64: true });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const asset = result.assets[0];
      let sharedUri = null;
      try {
        const resized = await manipulateAsync(asset.uri, [{ resize: { width: 512 } }], { compress: 0.62, format: SaveFormat.JPEG, base64: true });
        if (resized.base64) sharedUri = `data:image/jpeg;base64,${resized.base64}`;
      } catch {
        sharedUri = asset.base64 ? `data:${['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) ? asset.mimeType : 'image/jpeg'};base64,${asset.base64}` : null;
      }
      if (!sharedUri && Platform.OS === 'web') {
        const blob = await fetch(asset.uri).then((response) => response.blob());
        sharedUri = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
      if (!sharedUri) {
        Alert.alert('เปลี่ยนรูปไม่สำเร็จ', 'ไม่สามารถอ่านไฟล์รูปนี้ได้ กรุณาเลือกรูปอื่น');
        return;
      }
      try {
        await api.patch('/api/users/profile-image', { profile_image: sharedUri });
        setAvatarUri(sharedUri);
        await AsyncStorage.setItem(imageKey, sharedUri);
        await refreshProfile();
      } catch (error) {
        Alert.alert('เปลี่ยนรูปไม่สำเร็จ', error.message || 'กรุณาลองใหม่อีกครั้ง');
      }
    }
  }
  async function changeRole(nextRole) {
    if (switching || nextRole === activeRole) return;
    setSwitching(true);
    try { await switchRole(nextRole); }
    catch (error) { Alert.alert('เปลี่ยนโหมดไม่สำเร็จ', error.message || 'กรุณาลองใหม่อีกครั้ง'); }
    finally { setSwitching(false); }
  }

  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <View style={[styles.hero, { paddingTop: Math.max(insets.top + 18, 38), backgroundColor: accent }]}>
      <Pressable onPress={choosePhoto} style={styles.avatar}>
        {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{(profile?.name || 'ม')[0].toUpperCase()}</Text>}
        <View style={[styles.editDot, { backgroundColor: dark }]}><Ionicons name="camera" color={colors.white} size={13} /></View>
      </Pressable>
      <View style={styles.rolePill}><Ionicons name={runner ? 'bicycle-outline' : 'bag-handle-outline'} size={13} color={colors.white} /><Text style={styles.rolePillText}>{runner ? 'โหมดผู้รับหิ้ว' : 'โหมดผู้ฝากซื้อ'}</Text></View>
      <Text style={styles.name}>{profile?.name || 'ผู้ใช้ Hiu'}</Text>
      <Pressable onPress={choosePhoto} style={styles.photoHint}><Ionicons name="image-outline" size={13} color={colors.white} /><Text style={styles.photoHintText}>เปลี่ยนรูปโปรไฟล์</Text></Pressable>
      <View style={styles.statsRow}>
        <View style={styles.statTile}><Text style={styles.statNum}>{runner ? profileStats.active_runner_orders || 0 : profileStats.active_requester_orders || 0}</Text><Text style={styles.statTitle}>กำลังดำเนินการ</Text><Text style={styles.statLabel}>ออร์เดอร์ปัจจุบัน</Text></View>
        <View style={styles.statTile}><Text style={styles.statNum}>{profileStats.runner_history || 0}</Text><Text style={styles.statTitle}>ประวัติรับออร์เดอร์</Text><Text style={styles.statLabel}>รายการที่ผ่านมา</Text></View>
        <View style={styles.statTile}><Text style={styles.statNum}>{profileStats.requester_history || 0}</Text><Text style={styles.statTitle}>ประวัติฝากซื้อ</Text><Text style={styles.statLabel}>รายการที่ผ่านมา</Text></View>
      </View>
    </View>

    <View style={styles.body}>
      <View style={styles.modeCard}>
        <View style={styles.modeHeading}><View style={[styles.modeIcon, { backgroundColor: soft }]}><Ionicons name="swap-horizontal" size={19} color={accent} /></View><View style={{ flex: 1 }}><Text style={styles.modeOverline}>สลับโหมดการใช้งาน</Text><Text style={styles.modeTitle}>{runner ? 'ขณะนี้เป็นผู้รับหิ้ว (Runner)' : 'ขณะนี้เป็นผู้ฝากซื้อ (Requester)'}</Text></View>{switching ? <Text style={[styles.switching, { color: accent }]}>กำลังเปลี่ยน...</Text> : null}</View>
        <View style={styles.segment}>
          {[['REQUESTER', 'bag-handle-outline', 'Requester'], ['RUNNER', 'bicycle-outline', 'Runner']].map(([role, icon, label]) => {
            const active = activeRole === role;
            const roleColor = role === 'RUNNER' ? colors.runner : colors.primary;
            return <Pressable key={role} disabled={switching} onPress={() => changeRole(role)} style={({ pressed }) => [styles.segmentButton, active && { backgroundColor: roleColor }, pressed && !active && styles.pressed]}><Ionicons name={icon} size={16} color={active ? colors.white : colors.textSecondary} /><Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>{active ? <Ionicons name="checkmark-circle" size={15} color={colors.white} /> : null}</Pressable>;
          })}
        </View>
      </View>

      <View style={styles.menuCard}>{MENU.map(([icon, label, hint, screen, params], index) => <Pressable key={`${screen}-${label}`} onPress={() => navigation.navigate(screen, params)} style={({ pressed }) => [styles.menuRow, index && styles.menuBorder, pressed && styles.rowPressed]}>
        <View style={[styles.menuIcon, { backgroundColor: soft }]}><Ionicons name={icon} size={20} color={accent} /></View><View style={{ flex: 1 }}><Text style={styles.menuText}>{label}</Text><Text style={styles.menuHint}>{hint}</Text></View><View style={styles.chevron}><Ionicons name="chevron-forward" size={17} color={accent} /></View>
      </Pressable>)}</View>

      <Pressable onPress={() => setLogoutOpen(true)} style={({ pressed }) => [styles.logoutRow, pressed && styles.rowPressed]}><View style={styles.logoutSmallIcon}><Ionicons name="log-out-outline" size={20} color={colors.danger} /></View><View style={{ flex: 1 }}><Text style={styles.logoutLabel}>ออกจากระบบ</Text><Text style={styles.menuHint}>ออกจากบัญชีบนอุปกรณ์นี้</Text></View><Ionicons name="chevron-forward" size={18} color={colors.danger} /></Pressable>
      <Text style={styles.version}>Hiu v1.0.0 · หิ้วของให้กัน ง่าย ๆ ในหอพัก</Text>
    </View>

    <Modal visible={logoutOpen} transparent animationType="fade"><View style={styles.shade}><View style={styles.logoutCard}><View style={styles.logoutIcon}><Ionicons name="log-out-outline" size={27} color={colors.danger} /></View><Text style={styles.logoutTitle}>ออกจากระบบ?</Text><Text style={styles.logoutText}>คุณต้องเข้าสู่ระบบอีกครั้งเพื่อใช้งานแอป</Text><View style={styles.logoutActions}><Pressable onPress={() => setLogoutOpen(false)} style={styles.cancel}><Text style={styles.cancelText}>ยกเลิก</Text></Pressable><Pressable onPress={() => signOut(auth)} style={styles.logout}><Text style={styles.logoutTextButton}>ออกจากระบบ</Text></Pressable></View></View></View></Modal>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 30 }, hero: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 31, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  avatar: { width: 79, height: 79, borderRadius: 40, borderColor: 'rgba(255,255,255,.85)', borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, avatarImage: { width: 75, height: 75, borderRadius: 38 }, avatarText: { color: colors.white, fontWeight: '900', fontSize: 28 }, editDot: { position: 'absolute', right: -4, bottom: 2, height: 27, width: 27, borderRadius: 14, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.13)' }, rolePillText: { color: colors.white, fontSize: 10, fontWeight: '800' }, name: { color: colors.white, fontWeight: '900', fontSize: 22, marginTop: 6 }, photoHint: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 6 }, photoHintText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  statsRow: { width: '100%', flexDirection: 'row', gap: 8, marginTop: 17 }, statTile: { flex: 1, minHeight: 72, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.19)' }, statNum: { color: colors.white, fontWeight: '900', fontSize: 23 }, statTitle: { color: colors.white, fontSize: 10, fontWeight: '900', marginTop: 1, textAlign: 'center' }, statLabel: { color: 'rgba(255,255,255,.78)', fontSize: 8, marginTop: 2, textAlign: 'center' },
  body: { padding: spacing.md, gap: 14 }, modeCard: { padding: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, shadowColor: '#10213E', shadowOpacity: .05, shadowRadius: 8, elevation: 2 }, modeHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 }, modeIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, modeOverline: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' }, modeTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '900', marginTop: 2 }, switching: { fontSize: 9, fontWeight: '800' },
  segment: { flexDirection: 'row', gap: 7, marginTop: 13, padding: 4, borderRadius: 14, backgroundColor: colors.muted }, segmentButton: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11 }, segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900' }, segmentTextActive: { color: colors.white },
  menuCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, menuRow: { minHeight: 69, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, menuBorder: { borderTopWidth: 1, borderTopColor: colors.border }, menuIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, menuText: { color: colors.textPrimary, fontWeight: '900', fontSize: 13 }, menuHint: { color: colors.textSecondary, fontSize: 10, marginTop: 3 }, chevron: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  logoutRow: { minHeight: 66, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 18, borderWidth: 1, borderColor: '#FFD8DE', backgroundColor: colors.surface }, logoutSmallIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F2' }, logoutLabel: { color: colors.danger, fontWeight: '900', fontSize: 13 }, version: { textAlign: 'center', color: colors.textSecondary, fontSize: 10, marginTop: 2 }, pressed: { opacity: .8 }, rowPressed: { backgroundColor: colors.background },
  shade: { flex: 1, backgroundColor: 'rgba(15,23,42,.48)', alignItems: 'center', justifyContent: 'center', padding: 22 }, logoutCard: { width: '100%', maxWidth: 390, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 22, padding: 22 }, logoutIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFF0F2', alignItems: 'center', justifyContent: 'center' }, logoutTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '900', marginTop: 11 }, logoutText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 7 }, logoutActions: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 21 }, cancel: { flex: 1, alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, paddingVertical: 12 }, logout: { flex: 1, alignItems: 'center', backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 12 }, cancelText: { color: colors.textPrimary, fontWeight: '900' }, logoutTextButton: { color: colors.white, fontWeight: '900' },
});
