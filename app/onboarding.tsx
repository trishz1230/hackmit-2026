import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/Handwriting';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clampLevelCount, MAX_LEVELS, MIN_LEVELS } from '../lib/levels';
import { formatPhone, isValidPhone } from '../lib/phone';
import { useApp } from '../lib/store';
import { paper, radius, spacing } from '../lib/theme';
import { CADENCE_LABELS, type Cadence } from '../lib/types';

const CODE_LENGTH = 6;

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { group, createGroup, joinGroup, isLive, error, dismissError } = useApp();
  const { mode: picked } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'create' | 'join'>(picked === 'join' ? 'join' : 'create');
  const [myName, setMyName] = useState('');
  const [phone, setPhone] = useState('');
  const [cadence, setCadence] = useState<Cadence>('daily');
  const [familyName, setFamilyName] = useState('');
  const [reward, setReward] = useState('');
  const [levels, setLevels] = useState('10');
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [working, setWorking] = useState(false);
  const [priorGroupId, setPriorGroupId] = useState<string | null>(null);

  // Any family already in the store belongs to a previous session, so the invite
  // code screen waits for a different one rather than flashing the old family.
  const fresh = group && group.id !== priorGroupId ? group : null;

  useEffect(() => {
    if (working && mode === 'join' && fresh) router.replace('/avatar?next=family');
  }, [working, mode, fresh, router]);

  useEffect(() => {
    if (working && error) setWorking(false);
  }, [working, error]);

  if (working && mode === 'create' && !fresh) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.logo}>One moment</Text>
        <Text style={styles.tagline}>Setting up your family…</Text>
      </View>
    );
  }

  if (working && mode === 'create' && fresh) {
    const created = fresh;
    return (
      <View style={styles.wrap}>
        <Text style={styles.logo}>You&apos;re in</Text>
        <Text style={styles.tagline}>Share this code with the family — they pick “Join a family”.</Text>
        <Text style={styles.bigCode}>{created.joinCode}</Text>
        <Text style={styles.summary}>
          {created.goal} levels to “{created.rewardText}” · one level every{' '}
          {CADENCE_LABELS[created.cadence]}
        </Text>
        <Pressable style={styles.cta} onPress={() => router.replace('/avatar?next=family')}>
          <Text style={styles.ctaText}>Now make a you</Text>
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
    setPriorGroupId(group?.id ?? null);
    dismissError();
    setWorking(true);
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
      style={styles.page}
      contentContainerStyle={[styles.wrap, { paddingBottom: spacing.lg + insets.bottom }]}
    >
      <Text style={styles.logo}>btw</Text>
      <Text style={styles.tagline}>
        by the way! just between us, your family misses you &lt;3
      </Text>

      <View style={styles.toggle}>
        {(['join', 'create'] as const).map((m) => (
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
        placeholderTextColor={paper.muted}
      />
      {nameMissing && <Text style={styles.error}>Your name is required.</Text>}

      <Text style={styles.label}>Phone (optional, for the call button)</Text>
      <TextInput
        style={[styles.input, phoneBad && styles.inputBad]}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="123 456 7890"
        placeholderTextColor={paper.muted}
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
            placeholderTextColor={paper.muted}
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
            placeholderTextColor={paper.muted}
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
            placeholderTextColor={paper.muted}
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
            placeholderTextColor={paper.muted}
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
  page: { backgroundColor: paper.page },
  wrap: {
    padding: spacing.lg,
    paddingTop: 72,
    gap: spacing.sm,
    backgroundColor: paper.page,
    flexGrow: 1,
  },
  logo: { fontSize: 38, color: paper.ink },
  tagline: { fontSize: 16, color: paper.muted, marginBottom: spacing.lg, lineHeight: 22 },
  toggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: paper.field,
  },
  toggleBtnActive: { backgroundColor: paper.button },
  toggleText: { color: paper.muted, fontSize: 17 },
  toggleTextActive: { color: paper.ink },
  label: { fontSize: 15, color: paper.muted, marginTop: spacing.sm },
  input: {
    backgroundColor: paper.field,
    borderWidth: 1,
    borderColor: paper.line,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 17,
    color: paper.ink,
  },
  inputBad: { borderColor: '#b3261e' },
  picker: { flexDirection: 'row', gap: spacing.xs },
  pickerBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: paper.line,
    backgroundColor: paper.field,
    alignItems: 'center',
  },
  pickerBtnActive: { backgroundColor: paper.button, borderColor: paper.buttonOn },
  pickerText: { color: paper.muted, fontSize: 16 },
  pickerTextActive: { color: paper.ink },
  code: { letterSpacing: 4, fontSize: 22 },
  bigCode: {
    fontSize: 42,
    letterSpacing: 8,
    color: paper.ink,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  summary: { fontSize: 16, color: paper.muted, textAlign: 'center', lineHeight: 22 },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: paper.button,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: paper.ink, fontSize: 19 },
  error: { marginTop: spacing.md, fontSize: 14, color: '#b3261e', lineHeight: 19 },
  demoNote: { marginTop: spacing.md, fontSize: 13, color: paper.muted, lineHeight: 18 },
});
