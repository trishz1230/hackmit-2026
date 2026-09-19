import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clampLevelCount, MAX_LEVELS, MIN_LEVELS } from '../lib/levels';
import { formatPhone, isValidPhone } from '../lib/phone';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';
import { CADENCE_LABELS, type Cadence } from '../lib/types';

const CODE_LENGTH = 6;

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { group, createGroup, joinGroup, isLive, error } = useApp();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [myName, setMyName] = useState('');
  const [phone, setPhone] = useState('');
  const [cadence, setCadence] = useState<Cadence>('daily');
  const [familyName, setFamilyName] = useState('');
  const [reward, setReward] = useState('');
  const [levels, setLevels] = useState('10');
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // The family only exists once the backend answers, so the invite code screen
  // (and the hop to the feed) waits for it rather than navigating optimistically.
  useEffect(() => {
    if (submitted && mode === 'join' && group) router.replace('/');
  }, [submitted, mode, group, router]);

  if (submitted && mode === 'create' && group) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.logo}>You&apos;re in</Text>
        <Text style={styles.tagline}>Share this code with the family — they pick “Join a family”.</Text>
        <Text style={styles.bigCode}>{group.joinCode}</Text>
        <Text style={styles.summary}>
          {group.goal} levels to “{group.rewardText}” · one level every {CADENCE_LABELS[group.cadence]}
        </Text>
        <Pressable style={styles.cta} onPress={() => router.replace('/')}>
          <Text style={styles.ctaText}>Go to the map</Text>
        </Pressable>
      </View>
    );
  }

  const trimmedCode = code.trim();
  const nameMissing = submitted && !myName.trim();
  const codeMissing = submitted && mode === 'join' && !trimmedCode;
  const codeTooShort = submitted && mode === 'join' && trimmedCode.length > 0 && trimmedCode.length !== CODE_LENGTH;
  const rewardMissing = submitted && mode === 'create' && !reward.trim();
  const phoneBad = submitted && phone.trim().length > 0 && !isValidPhone(phone);

  const submit = () => {
    setSubmitted(true);
    if (!myName.trim()) return;
    if (phone.trim() && !isValidPhone(phone)) return;
    if (mode === 'create' && !reward.trim()) return;
    if (mode === 'join' && trimmedCode.length !== CODE_LENGTH) return;
    const who = myName.trim();
    const tel = phone.trim() ? formatPhone(phone) : undefined;
    if (mode === 'create') {
      createGroup({
        myName: who,
        familyName: familyName.trim() || undefined,
        phone: tel,
        cadence,
        rewardText: reward.trim(),
        goal: clampLevelCount(Number(levels)),
      });
    } else {
      joinGroup({ myName: who, phone: tel, code: trimmedCode.toUpperCase() });
    }
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.wrap, { paddingBottom: spacing.lg + insets.bottom }]}
    >
      <Text style={styles.logo}>FamStreak</Text>
      <Text style={styles.tagline}>
        One task per level. Everyone posts, or the whole family&apos;s streak resets.
      </Text>

      <View style={styles.toggle}>
        {(['create', 'join'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
              {m === 'create' ? 'Create a family' : 'Join a family'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Your name</Text>
      <TextInput
        style={[styles.input, nameMissing && styles.inputBad]}
        value={myName}
        onChangeText={setMyName}
        placeholder="Alex"
        placeholderTextColor={colors.muted}
      />
      {nameMissing && <Text style={styles.error}>Your name is required.</Text>}

      <Text style={styles.label}>Phone (optional, for the call button)</Text>
      <TextInput
        style={[styles.input, phoneBad && styles.inputBad]}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="123 456 7890"
        placeholderTextColor={colors.muted}
      />
      {phoneBad && <Text style={styles.error}>Enter a 10-digit phone number.</Text>}

      {mode === 'create' ? (
        <>
          <Text style={styles.label}>Family name (optional)</Text>
          <TextInput
            style={styles.input}
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="No.1 Family"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>What does one level equal?</Text>
          <View style={styles.picker}>
            {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => (
              <Pressable
                key={c}
                onPress={() => setCadence(c)}
                style={[styles.pickerBtn, cadence === c && styles.pickerBtnActive]}
              >
                <Text style={[styles.pickerText, cadence === c && styles.pickerTextActive]}>
                  {CADENCE_LABELS[c]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Reward</Text>
          <TextInput
            style={[styles.input, rewardMissing && styles.inputBad]}
            value={reward}
            onChangeText={setReward}
            placeholder="Pizza Night"
            placeholderTextColor={colors.muted}
          />
          {rewardMissing && (
            <Text style={styles.error}>Pick what the family is working toward.</Text>
          )}
          <Text style={styles.label}>Levels to the reward ({MIN_LEVELS}–{MAX_LEVELS})</Text>
          <TextInput
            style={styles.input}
            value={levels}
            onChangeText={setLevels}
            keyboardType="number-pad"
            placeholder="10"
            placeholderTextColor={colors.muted}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Group code</Text>
          <TextInput
            style={[styles.input, styles.code, (codeMissing || codeTooShort) && styles.inputBad]}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            maxLength={CODE_LENGTH}
            placeholder="FAM123"
            placeholderTextColor={colors.muted}
          />
          {codeMissing && <Text style={styles.error}>Enter the family&apos;s code to join.</Text>}
          {codeTooShort && (
            <Text style={styles.error}>Codes are {CODE_LENGTH} characters.</Text>
          )}
        </>
      )}

      <Pressable style={styles.cta} onPress={submit}>
        <Text style={styles.ctaText}>{mode === 'create' ? 'Create family' : 'Join family'}</Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {!isLive && (
        <Text style={styles.demoNote}>
          Demo mode — the rest of the family is scripted. Add Supabase keys in
          lib/supabase.ts to play with real people.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.lg, paddingTop: 72, gap: spacing.sm },
  logo: { fontSize: 34, fontWeight: '800', color: colors.accent },
  tagline: { fontSize: 15, color: colors.muted, marginBottom: spacing.lg, lineHeight: 21 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.card },
  toggleText: { color: colors.muted, fontWeight: '600' },
  toggleTextActive: { color: colors.text },
  label: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputBad: { borderColor: '#b3261e' },
  picker: { flexDirection: 'row', gap: spacing.xs },
  pickerBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  pickerBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pickerText: { color: colors.muted, fontWeight: '600' },
  pickerTextActive: { color: colors.text },
  code: { letterSpacing: 4, fontSize: 20, fontWeight: '700' },
  bigCode: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 8,
    color: colors.accent,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  summary: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { marginTop: spacing.md, fontSize: 13, color: '#b3261e', lineHeight: 18 },
  demoNote: { marginTop: spacing.md, fontSize: 12, color: colors.muted, lineHeight: 17 },
});
