import { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal, FlatList, SafeAreaView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ChevronDown, Search, X, Check } from "lucide-react-native";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "@/lib/countries";
import { useTheme, fonts, radius, spacing } from "@/lib/theme";

/**
 * Clean phone field: [ 🇸🇳 +221 ⌄ | national number ].
 * `onChangeE164` emits the full number (dial code + digits) for the parent.
 */
export function PhoneInput({
  value,
  onChangeE164,
  focused,
  onFocus,
  onBlur,
  placeholder,
}: {
  value: string;
  onChangeE164: (full: string, national: string, country: Country) => void;
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  const colors = useTheme((s) => s.colors);
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [national, setNational] = useState(value);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  function setNumber(raw: string) {
    const digits = raw.replace(/[^\d]/g, "");
    setNational(digits);
    onChangeE164(`${country.dial}${digits}`, digits, country);
  }

  function pick(c: Country) {
    Haptics.selectionAsync();
    setCountry(c);
    setPickerOpen(false);
    setSearch("");
    onChangeE164(`${c.dial}${national}`, national, c);
  }

  return (
    <>
      <View
        style={[
          styles.field,
          { backgroundColor: colors.bgCard, borderColor: focused ? colors.primary : colors.border },
          focused && { borderWidth: 1.5 },
        ]}
      >
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setPickerOpen(true); }}
          style={[styles.codeBtn, { borderRightColor: colors.border }]}
          testID="phone-country"
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={[styles.dial, { color: colors.textPrimary }]}>{country.dial}</Text>
          <ChevronDown size={15} color={colors.textMuted} strokeWidth={2.4} />
        </Pressable>
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder={placeholder ?? "77 123 45 67"}
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          value={national}
          onChangeText={setNumber}
          onFocus={onFocus}
          onBlur={onBlur}
          testID="signup-phone"
        />
      </View>

      {/* Country picker */}
      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={[styles.sheetHead, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Pays / Country</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10} testID="phone-picker-close">
                <X size={24} color={colors.textPrimary} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={[styles.searchBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Search size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Rechercher…"
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(c) => c.code}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                const on = item.code === country.code;
                return (
                  <Pressable
                    onPress={() => pick(item)}
                    style={[styles.row, { borderBottomColor: colors.border }]}
                    testID={`country-${item.code}`}
                  >
                    <Text style={styles.rowFlag}>{item.flag}</Text>
                    <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.rowDial, { color: colors.textMuted }]}>{item.dial}</Text>
                    {on ? <Check size={18} color={colors.primary} strokeWidth={2.6} /> : null}
                  </Pressable>
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", borderRadius: radius.lg, borderWidth: 1, height: 56, overflow: "hidden" },
  codeBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: spacing.md, height: "100%", borderRightWidth: 1 },
  flag: { fontSize: 20 },
  dial: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  input: { flex: 1, fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium, height: "100%", paddingHorizontal: spacing.lg },
  sheet: { flex: 1 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1 },
  sheetTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, margin: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg, height: 48, borderRadius: radius.lg, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: fonts.sizes.base },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  rowFlag: { fontSize: 26 },
  rowName: { flex: 1, fontSize: fonts.sizes.base, fontWeight: fonts.weights.medium },
  rowDial: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold },
});
