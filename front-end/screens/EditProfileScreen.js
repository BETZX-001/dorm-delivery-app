import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../client';
import { useAuth } from '../AuthContext';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import ProfilePageHeader from '../components/ProfilePageHeader';
import GenderSelector from '../components/GenderSelector';
import { colors, spacing } from '../components/theme';

export default function EditProfileScreen({ navigation }) {
  const { profile, refreshProfile, activeRole } = useAuth();
  const runner = activeRole === 'RUNNER';
  const accent = runner ? colors.runner : colors.primary;
  const soft = runner ? colors.softGreen : colors.softOrange;
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [gender, setGender] = useState(profile?.gender || 'UNSPECIFIED');
  const [dormName, setDormName] = useState(profile?.dorm_name || '');
  const [room, setRoom] = useState(profile?.room_number || '');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim() || !dormName.trim()) return Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อและหอพัก');
    setLoading(true);
    try { await api.patch('/api/users/me', { name: name.trim(), phone: phone.trim(), gender, dorm_name: dormName.trim(), room_number: room.trim() }); await refreshProfile(); navigation.goBack(); }
    catch (error) { Alert.alert('บันทึกไม่สำเร็จ', error.message); }
    finally { setLoading(false); }
  }

  return <View style={styles.page}>
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <ProfilePageHeader navigation={navigation} icon="person-outline" title="แก้ไขข้อมูลส่วนตัว" subtitle="ข้อมูลนี้ช่วยให้การรับและส่งออเดอร์ถูกต้อง" />
      <View style={styles.body}>
        <View style={[styles.notice, { borderColor: accent, backgroundColor: soft }]}><View style={[styles.noticeIcon, { backgroundColor: colors.white }]}><Ionicons name={runner ? 'bicycle-outline' : 'bag-handle-outline'} size={19} color={accent} /></View><View style={{ flex: 1 }}><Text style={[styles.noticeTitle, { color: accent }]}>{runner ? 'ข้อมูลสำหรับโหมด Runner' : 'ข้อมูลสำหรับโหมด Requester'}</Text><Text style={styles.noticeText}>กรุณาตรวจสอบเบอร์โทร หอพัก และเลขห้องให้เป็นปัจจุบัน</Text></View></View>
        <View style={styles.card}>
          <View style={styles.section}><View style={[styles.sectionIcon, { backgroundColor: soft }]}><Ionicons name="person-circle-outline" size={20} color={accent} /></View><View><Text style={styles.sectionTitle}>ข้อมูลติดต่อ</Text><Text style={styles.sectionHint}>ชื่อและเบอร์โทรที่ใช้ในออเดอร์</Text></View></View>
          <FormInput label="ชื่อที่แสดง" value={name} onChangeText={setName} placeholder="ชื่อของคุณ" />
          <FormInput label="เบอร์โทรศัพท์" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="เช่น 08x-xxx-xxxx" />
          <GenderSelector value={gender} onChange={setGender} accent={accent} soft={soft} />
          <View style={styles.divider} />
          <View style={styles.section}><View style={[styles.sectionIcon, { backgroundColor: soft }]}><Ionicons name="business-outline" size={20} color={accent} /></View><View><Text style={styles.sectionTitle}>ที่พักและจุดส่ง</Text><Text style={styles.sectionHint}>ช่วยให้ค้นหาห้องของคุณได้ง่ายขึ้น</Text></View></View>
          <FormInput label="หอพัก" value={dormName} onChangeText={setDormName} placeholder="เช่น หอ 1" />
          <FormInput label="เลขห้อง" value={room} onChangeText={setRoom} placeholder="เช่น 101" />
        </View>
      </View>
    </ScrollView>
    <View style={styles.footer}><PrimaryButton tone={runner ? 'runner' : 'requester'} label="บันทึกข้อมูลส่วนตัว" onPress={save} loading={loading} /></View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, scroll: { paddingBottom: 104 }, body: { padding: spacing.md, gap: 14 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 16 }, noticeIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, noticeTitle: { fontSize: 12, fontWeight: '900' }, noticeText: { color: colors.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 2 },
  card: { padding: 16, borderRadius: 21, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, section: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 }, sectionIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' }, sectionHint: { color: colors.textSecondary, fontSize: 10, marginTop: 2 }, divider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
  footer: { padding: 12, paddingBottom: 14, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
