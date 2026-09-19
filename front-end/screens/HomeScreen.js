import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../client";
import { useAuth } from "../AuthContext";
import { colors, radii, spacing, typography } from "../components/theme";

const destinations = [
  "ทุกที่",
  "ร้านค้า",
  "โลตัสหน้ามอ",
  "เซ็นทรัลหาดใหญ่",
  "หาดใหญ่ใจกลาง",
  "โรงช้าง",
  "เซเว่นอีเลฟเว่น",
  "ร้านข้าวตัดต่อ",
  "ครัวจัง",
  "ตลาด Bizmall",
  "อื่นๆ",
];
const statusLabel = (s) =>
  ({ OPEN: "เปิดรับ", FULL: "เต็มแล้ว", SHOPPING: "กำลังซื้อ" })[s] || s;
const timeText = (date) =>
  date
    ? date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

function hasNotExpired(slot) {
  if (!slot.cut_off_time) return false;
  const cutOff = new Date(slot.cut_off_time).getTime();
  return Number.isFinite(cutOff) && cutOff > Date.now();
}

// The runner types a destination freely (for example “เซเว่น”), while the
// requester filter uses fuller labels. Treat common names as the same place.
function destinationKey(value = "") {
  const normalized = String(value).toLowerCase().replace(/[\s\-_/]/g, "");
  return normalized;
}

const destinationAliases = [
  ["ร้านค้า", "shop", "store"],
  ["โลตัสหน้ามอ", "โลตัส", "lotus"],
  ["เซ็นทรัลหาดใหญ่", "เซ็นทรัล", "central"],
  ["หาดใหญ่ใจกลาง", "ใจกลางหาดใหญ่", "downtownhatyai"],
  ["โรงช้าง", "โรงช้าง"],
  ["เซเว่นอีเลฟเว่น", "เซเว่น", "7eleven", "seveneleven"],
  ["ร้านข้าวตัดต่อ", "ข้าวตัดต่อ"],
  ["ครัวจัง"],
  ["ตลาดbizmall", "bizmall"],
];

function aliasGroup(value) {
  const key = destinationKey(value);
  return destinationAliases.find((aliases) =>
    aliases.some((alias) => key.includes(destinationKey(alias)) || destinationKey(alias).includes(key)),
  );
}

function destinationMatches(slotDestination, selectedDestination) {
  if (!selectedDestination || selectedDestination === "ทุกที่") return true;
  const slotKey = destinationKey(slotDestination);
  const filterKey = destinationKey(selectedDestination);
  if (slotKey.includes(filterKey) || filterKey.includes(slotKey)) return true;
  const selectedGroup = aliasGroup(selectedDestination);
  const slotGroup = aliasGroup(slotDestination);
  return !!selectedGroup && selectedGroup === slotGroup;
}

function Picker({ label, value, options, onChange, accent }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.pickerWrap}>
      <Text style={[styles.filterLabel, { color: accent }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
      >
        <Text style={styles.pickerText}>{value}</Text>
        <Ionicons name="chevron-down" size={17} color={colors.textPrimary} />
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalShade}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View style={styles.optionSheet}>
            <View style={[styles.sheetHeader, { backgroundColor: accent }]}>
              <View style={styles.sheetHeaderIcon}><Ionicons name="location" size={21} color={colors.white} /></View>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetTitle}>เลือกปลายทาง</Text>
                <Text style={styles.sheetSubtitle}>แตะเลือกพื้นที่ที่ต้องการค้นหารอบรับหิ้ว</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} style={styles.sheetClose}><Ionicons name="close" size={20} color={accent} /></Pressable>
            </View>
            <Text style={[styles.optionSectionLabel, { color: accent }]}>ปลายทางทั้งหมด</Text>
            <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.optionList}>
              <View style={styles.optionListInner}>
                {options.map((item) => {
                  const selected = item === value;
                  return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                      <Ionicons name={item === "ทุกที่" ? "apps-outline" : item === "อื่นๆ" ? "create-outline" : "storefront-outline"} size={17} color={selected ? colors.white : accent} />
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    <Ionicons name={selected ? "checkmark-circle" : "chevron-forward"} size={19} color={selected ? accent : colors.textSecondary} />
                  </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SlotCard({ slot, runner, onPress, onProfile }) {
  const used = Number(slot.current_orders || 0),
    max = Number(slot.max_orders || 1),
    remaining = Math.max(max - used, 0),
    full = slot.status === "FULL" || !remaining,
    accent = runner ? colors.runner : colors.primary;
  return (
    <Pressable
      onPress={full && !runner ? undefined : onPress}
      style={({ pressed }) => [
        styles.slot,
        full && !runner && { opacity: 0.72 },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatar}>
        {slot.runner_profile_image ? <Image source={{ uri: slot.runner_profile_image }} style={styles.slotAvatarImage} /> : <Text style={styles.avatarText}>{(slot.runner_name || "ม")[0]}</Text>}
      </View>
      <View style={styles.slotInfo}>
        <View style={styles.slotTop}>
          <Text style={styles.slotName}>
            {runner ? slot.destination : slot.runner_name || "Runner"}
          </Text>
          <Text
            style={[
              styles.badge,
              {
                color: full ? colors.danger : colors.success,
                backgroundColor: full ? "#FFE5E7" : "#E8F7EC",
              },
            ]}
          >
            {statusLabel(slot.status)}
          </Text>
        </View>
        {!runner && <Pressable onPress={(event) => { event.stopPropagation?.(); onProfile?.(); }} style={({ pressed }) => [styles.profileLink, pressed && styles.pressed]}><Ionicons name="person-circle-outline" size={15} color={colors.primary} /><Text style={styles.profileLinkText}>ดูโปรไฟล์และประวัติ</Text><Ionicons name="chevron-forward" size={13} color={colors.primary} /></Pressable>}
        <Text style={styles.meta}>
          🏪 {runner ? "รอบรับหิ้วของคุณ" : slot.destination}
        </Text>
        <Text style={styles.meta}>
          ◷{" "}
          {slot.cut_off_time
            ? new Date(slot.cut_off_time).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "ไม่ระบุเวลา"}
        </Text>
        <Text style={[styles.fee, { color: accent }]}>
          ♨ {Number(slot.fee || 0).toFixed(0)} บาท/ชิ้น　★{" "}
          {Number(slot.runner_rating || 0).toFixed(1)}
        </Text>
        <View style={styles.capacity}>
          <Text>
            รับแล้ว {used}/{max}
          </Text>
          <Text>{full ? "เต็มแล้ว" : `ว่าง ${remaining} ที่`}</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min((used / max) * 100, 100)}%`,
                backgroundColor: full ? colors.danger : accent,
              },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { profile, activeRole, switchRole, systemRevision } = useAuth();
  const insets = useSafeAreaInsets();
  const isRunner = activeRole === "RUNNER";
  const accent = isRunner ? colors.runner : colors.primary;
  const [slots, setSlots] = useState([]),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [searchDraft, setSearchDraft] = useState(""),
    [searchFocused, setSearchFocused] = useState(false),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("ALL"),
    [filtersOpen, setFiltersOpen] = useState(false),
    [destination, setDestination] = useState("ทุกที่"),
    [customDestination, setCustomDestination] = useState(""),
    [notBefore, setNotBefore] = useState(null),
    [timePickerOpen, setTimePickerOpen] = useState(false),
    [timeDraft, setTimeDraft] = useState(""),
    [timeFocused, setTimeFocused] = useState(false),
    [timeError, setTimeError] = useState(""),
    [avatarUri, setAvatarUri] = useState(null),
    [switching, setSwitching] = useState(false),
    [switchTarget, setSwitchTarget] = useState(null);
  const pop = useRef(new Animated.Value(0.7)).current;
  const imageKey = `profile-image:${profile?.user_id || "current"}`;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (profile?.profile_image) {
        setAvatarUri(profile.profile_image);
        return () => { active = false; };
      }
      AsyncStorage.getItem(imageKey)
        .then((uri) => { if (active) setAvatarUri(uri); })
        .catch(() => { if (active) setAvatarUri(null); });
      return () => { active = false; };
    }, [imageKey, profile?.profile_image]),
  );
  const load = useCallback(async (fresh = false) => {
    try {
      const r = await (fresh ? api.get : api.getCached)(
        isRunner ? "/api/slots/mine" : "/api/slots/available",
      );
      // Keep expired slots off the home screen even if a stale API response or
      // an already-open browser tab still contains them.
      setSlots((r.slots || []).filter(hasNotExpired));
    } catch (e) {
      console.log('Slot refresh failed; keeping the last successful list:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isRunner]);
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  useEffect(() => {
    const refreshTimer = setInterval(load, 300_000);
    return () => clearInterval(refreshTimer);
  }, [load]);
  useEffect(() => { if (systemRevision) load(true); }, [systemRevision, load]);
  const visible = useMemo(
    () =>
      slots.filter((s) => {
        if (!hasNotExpired(s)) return false;
        const text =
          `${s.runner_name || ""} ${s.destination || ""}`.toLowerCase();
        // A selected time is an exact cut-off-time filter. Previously this
        // used >=, so choosing 22:00 also returned 23:00 slots.
        const slotTime = new Date(s.cut_off_time);
        const timeOk =
          !notBefore ||
          (slotTime.getHours() === notBefore.getHours() &&
            slotTime.getMinutes() === notBefore.getMinutes());
        const selectedDestination = destination === "อื่นๆ" ? customDestination.trim() : destination;
        return (
          text.includes(query.toLowerCase()) &&
          (status === "ALL" || s.status === status) &&
          destinationMatches(s.destination, selectedDestination) &&
          timeOk
        );
      }),
    [slots, query, status, destination, customDestination, notBefore],
  );
  const clearFilters = () => {
    setDestination("ทุกที่");
    setCustomDestination("");
    setNotBefore(null);
  };
  const hasFilters =
    destination !== "ทุกที่" || !!notBefore;
  const submitSearch = () => {
    setQuery(searchDraft.trim());
    Keyboard.dismiss();
  };
  const clearSearch = () => {
    setSearchDraft("");
    setQuery("");
    Keyboard.dismiss();
  };
  const openClock = () => {
    setTimeError("");
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: notBefore || new Date(),
        mode: "time",
        onChange: (_, value) => value && setNotBefore(value),
      });
      return;
    }
    setTimeDraft(notBefore ? timeText(notBefore) : "");
    setTimePickerOpen(true);
  };
  const saveWebTime = () => {
    const rawTime = timeDraft.trim().replace(".", ":");
    const normalizedTime = /^\d{3,4}$/.test(rawTime)
      ? `${rawTime.slice(0, -2)}:${rawTime.slice(-2)}`
      : rawTime;
    const match = normalizedTime.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!match) {
      setTimeError("กรุณากรอกเวลาแบบ 24 ชั่วโมง เช่น 19:30");
      return;
    }
    const date = new Date();
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    setNotBefore(date);
    setTimePickerOpen(false);
  };
  async function changeMode() {
    const next = isRunner ? "REQUESTER" : "RUNNER";
    setSwitchTarget(next);
    setSwitching(true);
    pop.setValue(0.7);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true }).start();
    setTimeout(async () => {
      try {
        await switchRole(next);
      } catch {
        Alert.alert("สลับโหมดไม่สำเร็จ", "กรุณาลองใหม่");
      } finally {
        setSwitching(false);
        setSwitchTarget(null);
      }
    }, 1050);
  }
  const initial = (profile?.name || profile?.email || "U")[0].toUpperCase();
  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={accent}
          />
        }
      >
        <View
          style={[
            styles.hero,
            { backgroundColor: accent, paddingTop: insets.top + 10 },
          ]}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.room}>
                {profile?.dorm_name || "หอพัก"}
                {profile?.room_number ? `, ห้อง ${profile.room_number}` : ""}
              </Text>
              <Text style={styles.greeting}>
                สวัสดี, {profile?.name || "ผู้ใช้"}!
              </Text>
            </View>
            <View style={styles.heroIcons}>
              <Pressable
                onPress={changeMode}
                disabled={switching}
                accessibilityLabel="สลับโหมด"
                style={({ pressed, hovered }) => [
                  styles.round,
                  (pressed || hovered) && styles.iconActive,
                ]}
              >
                <Text style={styles.modeIcon}>{isRunner ? "👟" : "🛍️"}</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.getParent()?.navigate("Profile")}
                accessibilityLabel="ไปหน้าโปรไฟล์"
                style={({ pressed, hovered }) => [
                  styles.round,
                  (pressed || hovered) && styles.iconActive,
                ]}
              >
                {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.headerAvatar} /> : <Text style={styles.profileInitial}>{initial}</Text>}
              </Pressable>
            </View>
          </View>
          {isRunner ? (
            <View style={styles.runnerActionBlock}>
              <View style={styles.runnerActionHeading}>
                <View style={styles.runnerActionIcon}><Ionicons name="storefront" size={17} color={colors.runner} /></View>
                <View style={{ flex: 1 }}><Text style={styles.runnerActionTitle}>จัดการรอบรับหิ้ว</Text><Text style={styles.runnerActionSubtitle}>กำหนดปลายทาง เวลา และจำนวนออร์เดอร์</Text></View>
              </View>
              <Pressable
                onPress={() => navigation.navigate("CreateSlot")}
                style={({ pressed }) => [styles.create, pressed && styles.createPressed]}
              >
                <View style={styles.createIcon}><Ionicons name="add" color={colors.white} size={21} /></View>
                <View style={styles.createCopy}><Text style={styles.createText}>สร้างรอบรับหิ้วใหม่</Text><Text style={styles.createSubtitle}>เปิดรับคำขอจากเพื่อนในหอพัก</Text></View>
                <View style={styles.createArrow}><Ionicons name="arrow-forward" color={colors.runnerDark} size={18} /></View>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.searchBlock}>
                <View style={styles.searchHeading}>
                  <View style={styles.searchHeadingIcon}><Ionicons name="search" size={15} color={colors.primary} /></View>
                  <View><Text style={styles.searchTitle}>ค้นหารอบรับหิ้ว</Text><Text style={styles.searchSubtitle}>ค้นหาจากชื่อ Runner หรือชื่อร้านค้า</Text></View>
                </View>
                <View style={styles.search}>
                  <Ionicons name="search-outline" size={19} color={query ? colors.primary : colors.textSecondary} />
                  <TextInput
                    value={searchDraft}
                    onChangeText={setSearchDraft}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    onSubmitEditing={submitSearch}
                    returnKeyType="search"
                    placeholder="เช่น โลตัส, เซเว่น, ชื่อ Runner..."
                    placeholderTextColor={colors.textSecondary}
                    style={styles.searchInput}
                  />
                  {!!(searchDraft || query) && <Pressable accessibilityLabel="ล้างคำค้น" onPress={clearSearch} hitSlop={7} style={styles.searchClear}><Ionicons name="close" size={16} color={colors.textSecondary} /></Pressable>}
                  <Pressable accessibilityRole="button" accessibilityLabel="ค้นหา" onPress={submitSearch} style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}>
                    <Ionicons name="search" size={16} color={colors.white} />
                    <Text style={styles.searchButtonText}>ค้นหา</Text>
                  </Pressable>
                  <View pointerEvents="none" style={[styles.searchUnderline, searchFocused && styles.searchUnderlineFocused]} />
                </View>
              </View>
              <View style={styles.chips}>
                <Pressable
                  onPress={() => setFiltersOpen(!filtersOpen)}
                  style={({ pressed }) => [
                    styles.chip,
                    filtersOpen && styles.chipOn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name="filter"
                    size={14}
                    color={filtersOpen ? accent : colors.white}
                  />
                  <Text
                    style={[styles.chipText, filtersOpen && { color: accent }]}
                  >
                    ตัวกรอง{hasFilters ? " •" : ""}
                  </Text>
                  </Pressable>
                {[
                  ["ALL", "ทั้งหมด"],
                  ["OPEN", "เปิดรับ"],
                  ["FULL", "เต็มแล้ว"],
                ].map(([v, l]) => (
                  <Pressable
                    key={v}
                    onPress={() => setStatus(v)}
                    style={({ pressed }) => [
                      styles.chip,
                      status === v && styles.chipOn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        status === v && { color: accent },
                      ]}
                    >
                      {l}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </View>
        {filtersOpen && !isRunner && (
          <View style={styles.filters}>
            <View style={styles.filtersHeader}>
              <View style={styles.filtersHeaderIcon}><Ionicons name="options-outline" size={19} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={styles.filtersTitle}>ตัวกรองการค้นหา</Text><Text style={styles.filtersSubtitle}>เลือกปลายทางและเวลาที่สะดวก</Text></View>
              {hasFilters && <View style={styles.activeFilterBadge}><Text style={styles.activeFilterText}>ใช้งานอยู่</Text></View>}
            </View>
            <View style={styles.filterRow}>
              <Picker
                label="ปลายทาง"
                value={destination}
                options={destinations}
                accent={accent}
                onChange={(next) => {
                  setDestination(next);
                  if (next !== "อื่นๆ") setCustomDestination("");
                }}
              />
            </View>
            {destination === "อื่นๆ" && (
              <View style={styles.customDestinationWrap}>
                <Text style={[styles.filterLabel, { color: accent }]}>ระบุปลายทางหรือร้านค้า</Text>
                <TextInput
                  value={customDestination}
                  onChangeText={setCustomDestination}
                  placeholder="เช่น ร้านกาแฟหน้ามอ, Big C"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.customDestinationInput}
                />
              </View>
            )}
            <Text style={[styles.filterLabel, { color: accent }]}>เวลา</Text>
            <Pressable
              onPress={openClock}
              style={({ pressed }) => [
                styles.timePicker,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.timePickerCopy}><View style={styles.timePickerIcon}><Ionicons name="time-outline" color={colors.primary} size={18} /></View><Text style={[styles.pickerText, notBefore && styles.pickerTextActive]}>{notBefore ? `เวลา ${timeText(notBefore)} น.` : "เลือกเวลาปิดรับ"}</Text></View>
              <Ionicons name="chevron-forward" color={colors.textSecondary} size={18} />
            </Pressable>
            {hasFilters && (
              <Pressable onPress={clearFilters} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                <Ionicons name="refresh" size={16} color={colors.white} />
                <Text style={styles.clear}>ล้างตัวกรองทั้งหมด</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={styles.list}>
          <View style={styles.listTop}>
            <Text style={styles.listTitle}>
              {isRunner
                ? "สลอตของฉัน"
                : `สลอตที่เปิดรับอยู่ · ${visible.length} สลอต`}
            </Text>
            <Pressable
              onPress={() => { setRefreshing(true); load(true); }}
              style={({ pressed }) => [styles.reloadButton, pressed && styles.pressed]}
            >
              <Ionicons name="refresh" size={21} color={accent} />
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator
              color={accent}
              size="large"
              style={{ marginTop: 40 }}
            />
          ) : visible.length ? (
            visible.map((s) => (
              <SlotCard
                key={s.slot_id}
                slot={s}
                runner={isRunner}
                onProfile={() => navigation.navigate('PublicProfile', { userId: s.runner_id, initialProfile: { name: s.runner_name, profile_image: s.runner_profile_image, avg_rating: s.runner_rating } })}
                onPress={() =>
                  navigation.navigate(
                    isRunner ? "RunnerDashboard" : "PlaceOrder",
                    isRunner ? { slotId: s.slot_id } : { slot: s },
                  )
                }
              />
            ))
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{isRunner ? "👟" : "🛍️"}</Text>
              <Text style={styles.emptyTitle}>
                {isRunner ? "ยังไม่มีสลอต" : "ยังไม่มีรอบรับหิ้ว"}
              </Text>
              <Text style={styles.emptyText}>
                ลองรีเฟรชใหม่อีกครั้งในภายหลัง
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      {switching && (
        <View
          style={[
            styles.switchOverlay,
            { backgroundColor: switchTarget === 'REQUESTER' ? colors.primary : colors.runner },
          ]}
        >
          <Animated.View
            style={[styles.switchContent, { transform: [{ scale: pop }] }]}
          >
            <View style={styles.switchIcon}>
              <Text style={{ fontSize: 42 }}>{switchTarget === 'REQUESTER' ? "🛍️" : "👟"}</Text>
            </View>
            <Text style={styles.switchSmall}>กำลังสลับไปยัง</Text>
            <Text style={styles.switchTitle}>
              {switchTarget === 'REQUESTER' ? "โหมดฝากซื้อ" : "โหมดรับหิ้ว"}
            </Text>
            <Text style={styles.switchRole}>
              {switchTarget === 'REQUESTER' ? "Requester" : "Runner"}
            </Text>
            <Text style={styles.dots}>● ● ●</Text>
          </Animated.View>
        </View>
      )}
      <Modal
        transparent
        visible={timePickerOpen}
        animationType="fade"
        onRequestClose={() => setTimePickerOpen(false)}
      >
        <View style={styles.modalShade}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTimePickerOpen(false)} />
          <View style={[styles.optionSheet, styles.timeSheet]}>
            <View style={[styles.sheetHeader, { backgroundColor: colors.primary }]}>
              <View style={styles.sheetHeaderIcon}><Ionicons name="time" size={21} color={colors.white} /></View>
              <View style={styles.sheetHeaderCopy}><Text style={styles.sheetTitle}>ตั้งเวลา</Text></View>
              <Pressable onPress={() => setTimePickerOpen(false)} style={styles.sheetClose}><Ionicons name="close" size={20} color={colors.primary} /></Pressable>
            </View>
            <View style={styles.timeSheetBody}>
              <Text style={styles.timeFieldLabel}>เวลาปิดรับที่ต้องการค้นหา</Text>
              <Text style={styles.timeHint}>ระบบจะแสดงเฉพาะรอบที่ตรงกับเวลานี้</Text>
              <View style={[styles.timeInputWrap, timeError && styles.timeInputWrapError]}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <TextInput
                  value={timeDraft}
                  onChangeText={(value) => { setTimeDraft(value); setTimeError(""); }}
                  onFocus={() => setTimeFocused(true)}
                  onBlur={() => setTimeFocused(false)}
                  placeholder="19:30"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                  style={styles.timeInput}
                  autoFocus
                />
                <View pointerEvents="none" style={[styles.timeInputUnderline, timeFocused && styles.timeInputUnderlineFocused, timeError && styles.timeInputUnderlineError]} />
              </View>
              {timeError ? <View style={styles.timeErrorRow}><Ionicons name="alert-circle-outline" size={16} color={colors.danger} /><Text style={styles.timeErrorText}>{timeError}</Text></View> : null}
              <View style={styles.timeActions}>
                <Pressable onPress={() => setTimePickerOpen(false)} style={({ pressed }) => [styles.timeCancel, pressed && styles.pressed]}><Ionicons name="close-circle-outline" size={19} color={colors.primaryDark} /><Text style={styles.timeCancelText}>ยกเลิก</Text></Pressable>
                <Pressable onPress={saveWebTime} style={({ pressed }) => [styles.timeSave, pressed && styles.pressed]}><Text style={styles.timeSaveText}>ยืนยันเวลา</Text><Ionicons name="checkmark-circle" size={17} color={colors.white} /></Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xl },
  hero: { paddingHorizontal: 20, paddingBottom: 18 },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  room: { ...typography.caption, color: "#FFF5F0" },
  greeting: { ...typography.h2, color: colors.white, marginTop: 2 },
  heroIcons: { flexDirection: "row", gap: 8 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconActive: {
    transform: [{ scale: 1.12 }],
    backgroundColor: "rgba(255,255,255,.42)",
  },
  modeIcon: { fontSize: 20 },
  profileInitial: { color: colors.white, fontWeight: "900", fontSize: 15 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  searchBlock: {
    marginTop: 15,
    padding: 10,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.2)",
  },
  searchHeading: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  searchHeadingIcon: { width: 29, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  searchTitle: { color: colors.white, fontSize: 13, fontWeight: "900" },
  searchSubtitle: { color: "rgba(255,255,255,.82)", fontSize: 10, marginTop: 1 },
  search: {
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12,
    paddingRight: 5,
    overflow: "hidden",
  },
  searchInput: {
    flex: 1,
    marginLeft: 7,
    color: colors.textPrimary,
    fontSize: 13,
    height: "100%",
    outlineStyle: "none",
  },
  searchUnderline: { position: "absolute", left: 12, right: 78, bottom: 0, height: 2, backgroundColor: "transparent" },
  searchUnderlineFocused: { backgroundColor: colors.primary },
  searchClear: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.muted, marginRight: 5 },
  searchButton: { height: 40, paddingHorizontal: 12, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: colors.primaryDark, shadowColor: "#9C2D08", shadowOpacity: .18, shadowRadius: 4, elevation: 2 },
  searchButtonPressed: { opacity: .78, transform: [{ scale: .97 }] },
  searchButtonText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  chips: { flexDirection: "row", gap: 7, marginTop: 9 },
  chip: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,.2)",
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.18)",
  },
  chipOn: { backgroundColor: colors.white, borderColor: colors.white },
  chipText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  runnerActionBlock: { marginTop: 15, padding: 10, borderRadius: 18, backgroundColor: "rgba(255,255,255,.16)", borderWidth: 1, borderColor: "rgba(255,255,255,.2)" },
  runnerActionHeading: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  runnerActionIcon: { width: 29, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  runnerActionTitle: { color: colors.white, fontSize: 13, fontWeight: "900" },
  runnerActionSubtitle: { color: "rgba(255,255,255,.82)", fontSize: 10, marginTop: 1 },
  create: {
    minHeight: 58,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#027A35",
    shadowOpacity: .12,
    shadowRadius: 5,
    elevation: 2,
  },
  createPressed: { opacity: .82, transform: [{ scale: .985 }] },
  createIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.runner },
  createCopy: { flex: 1 },
  createText: { color: colors.runnerDark, fontWeight: "900", fontSize: 14 },
  createSubtitle: { color: colors.textSecondary, fontSize: 10, marginTop: 2 },
  createArrow: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.softGreen },
  filters: {
    margin: 13,
    marginBottom: 0,
    padding: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#FFD8C9",
    borderRadius: 18,
    shadowColor: "#A8421B",
    shadowOpacity: .07,
    shadowRadius: 8,
    elevation: 2,
  },
  filtersHeader: { flexDirection: "row", alignItems: "center", gap: 9, paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  filtersHeaderIcon: { width: 37, height: 37, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.softOrange },
  filtersTitle: { color: colors.primaryDark, fontSize: 15, fontWeight: "900" },
  filtersSubtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  activeFilterBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.softOrange },
  activeFilterText: { color: colors.primary, fontSize: 10, fontWeight: "900" },
  filterRow: { flexDirection: "row", gap: 10 },
  pickerWrap: { flex: 1 },
  filterLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "800",
    marginBottom: 6,
  },
  picker: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#FFC5AF",
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.softOrange,
  },
  pickerText: { ...typography.caption, color: colors.textSecondary, fontWeight: "700" },
  pickerTextActive: { color: colors.primaryDark, fontWeight: "900" },
  timePicker: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#FFC5AF",
    borderRadius: 13,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.softOrange,
  },
  timePickerCopy: { flexDirection: "row", alignItems: "center", gap: 9 },
  timePickerIcon: { width: 31, height: 31, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  customDestinationWrap: { marginTop: 13 },
  customDestinationInput: { height: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, color: colors.textPrimary, backgroundColor: "#FCFCFD", fontSize: 14 },
  clear: {
    color: colors.white,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "900",
  },
  clearButton: {
    marginTop: 12,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    elevation: 2,
  },
  modalShade: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.56)",
    justifyContent: "center",
    padding: 18,
  },
  optionSheet: {
    width: "100%",
    maxWidth: 410,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: "hidden",
    maxHeight: "88%",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 17 },
  sheetHeaderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.2)" },
  sheetHeaderCopy: { flex: 1 },
  sheetClose: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  sheetTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: colors.white,
  },
  sheetSubtitle: { color: "rgba(255,255,255,.88)", fontSize: 11, marginTop: 2 },
  optionSectionLabel: { fontSize: 12, fontWeight: "900", marginHorizontal: 16, marginTop: 15, marginBottom: 8 },
  optionList: { paddingHorizontal: 16, paddingBottom: 16 },
  optionListInner: { gap: 8 },
  option: { minHeight: 52, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.surface },
  optionSelected: { backgroundColor: colors.softOrange, borderColor: colors.primary, borderWidth: 1.5 },
  optionPressed: { opacity: 0.7, transform: [{ scale: .99 }] },
  optionIcon: { width: 33, height: 33, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.softOrange },
  optionIconSelected: { backgroundColor: colors.primary },
  optionText: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: "800" },
  optionTextSelected: { color: colors.primaryDark, fontWeight: "900" },
  timeSheet: { maxHeight: undefined },
  timeSheetBody: { padding: 16 },
  timeFieldLabel: { color: colors.primaryDark, fontSize: 13, fontWeight: "900" },
  timeHint: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  timeInputWrap: { height: 52, marginTop: 11, borderWidth: 1.5, borderColor: "#FFC5AF", borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.softOrange, overflow: "hidden" },
  timeInputWrapError: { borderColor: colors.danger, backgroundColor: "#FFF5F6" },
  timeInput: { flex: 1, height: "100%", color: colors.textPrimary, fontSize: 17, fontWeight: "800", outlineStyle: "none" },
  timeInputUnderline: { position: "absolute", left: 44, right: 13, bottom: 0, height: 2, backgroundColor: "transparent" },
  timeInputUnderlineFocused: { backgroundColor: colors.primary },
  timeInputUnderlineError: { backgroundColor: colors.danger },
  timeErrorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, paddingHorizontal: 2 },
  timeErrorText: { flex: 1, color: colors.danger, fontSize: 11, fontWeight: "700" },
  timeActions: { flexDirection: "row", gap: 9, marginTop: 15 },
  timeCancel: { flex: 1, height: 46, borderRadius: 11, borderWidth: 1.5, borderColor: colors.primary, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  timeCancelText: { color: colors.primaryDark, fontWeight: "900", fontSize: 13 },
  timeSave: { flex: 1.25, height: 46, borderRadius: 11, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  timeSaveText: { color: colors.white, fontWeight: "800", fontSize: 13 },
  list: { padding: 16 },
  listTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reloadButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.softOrange, alignItems: "center", justifyContent: "center" },
  listTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "800",
  },
  slot: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    shadowColor: "#536078",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4586F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: colors.white, fontWeight: "900", fontSize: 17 },
  slotAvatarImage: { width: 42, height: 42, borderRadius: 21 },
  slotInfo: { flex: 1 },
  slotTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slotName: { color: colors.textPrimary, fontWeight: "900", fontSize: 16 },
  profileLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6, marginBottom: 2, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: '#FFD1BF', backgroundColor: colors.softOrange },
  profileLinkText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  badge: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
    overflow: "hidden",
  },
  meta: { color: colors.textPrimary, fontSize: 13, marginTop: 3 },
  fee: { fontSize: 12, fontWeight: "800", marginTop: 7 },
  capacity: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },
  track: {
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: 5,
  },
  fill: { height: "100%" },
  empty: {
    alignItems: "center",
    paddingVertical: 55,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyEmoji: { fontSize: 35 },
  emptyTitle: {
    color: colors.textPrimary,
    fontWeight: "900",
    fontSize: 17,
    marginTop: 9,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13, marginTop: 5 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.86 },
  switchOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  switchContent: { alignItems: "center" },
  switchIcon: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  switchSmall: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 20,
  },
  switchTitle: {
    color: colors.white,
    fontSize: 27,
    fontWeight: "900",
    marginTop: 4,
  },
  switchRole: { color: colors.white, fontSize: 14, marginTop: 2 },
  dots: {
    color: "rgba(255,255,255,.75)",
    letterSpacing: 5,
    marginTop: 28,
    fontSize: 16,
  },
});
