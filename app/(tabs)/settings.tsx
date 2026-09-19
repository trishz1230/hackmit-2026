import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { KeyboardScreen } from '../../components/KeyboardScreen';
import { formatPhone, isValidPhone } from '../../lib/phone';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';
import { CADENCE_LABELS, type Cadence } from '../../lib/types';

function DemoToggle({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={onPress}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.pill, on && styles.pillOn]}>
        <Text style={[styles.pillText, on && styles.pillTextOn]}>{on ? 'ON' : 'OFF'}</Text>
      </View>
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const {
    group,
    members,
    me,
    updateProfile,
    updateSettings,
    leaveGroup,
    simulateMissedDay,
    missedReset,
    periodWaived,
    setPeriodWaived,
    cadencePendingOn,
    proposeCadence,
    approveCadence,
    cancelCadenceChange,
  } = useApp();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone ?? '');
  const [saved, setSaved] = useState(false);
  const [familyName, setFamilyName] = useState(group?.name ?? '');
  const [editingFamily, setEditingFamily] = useState(false);
  const phoneBad = phone.trim().length > 0 && !isValidPhone(phone);

  useEffect(() => {
    setName(me.name);
    setPhone(me.phone ?? '');
  }, [me.name, me.phone]);

  useEffect(() => {
    if (group) setFamilyName(group.name);
  }, [group?.name]);

  const saveFamilyName = () => {
    if (!group || !familyName.trim()) return;
    updateSettings({
      rewardText: group.rewardText,
      goal: group.goal,
      name: familyName.trim(),
    });
    setEditingFamily(false);
  };

  if (!group) return <Redirect href="/onboarding" />;

  return (
    <KeyboardScreen contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Family name</Text>
        {editingFamily ? (
          <>
            <TextInput
              style={styles.input}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="No.1 Family"
              placeholderTextColor={colors.muted}
              autoFocus
              onSubmitEditing={saveFamilyName}
            />
            <View style={styles.row}>
              <Pressable style={[styles.cta, styles.grow]} onPress={saveFamilyName}>
                <Text style={styles.ctaText}>Save</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={() => {
                  setFamilyName(group.name);
                  setEditingFamily(false);
                }}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.family}>{group.name}</Text>
            <Pressable onPress={() => setEditingFamily(true)}>
              <Text style={styles.edit}>Edit</Text>
            </Pressable>
          </>
        )}
        <Text style={styles.label}>Invite code</Text>
        <Text style={styles.code}>{group.joinCode}</Text>
        <Text style={styles.meta}>
          {group.rewardText} · {group.goal} levels · 1 level = {CADENCE_LABELS[group.cadence]}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setSaved(false);
          }}
        />
        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          style={[styles.input, phoneBad && styles.inputBad]}
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            setSaved(false);
          }}
          keyboardType="phone-pad"
          placeholder="123 456 7890"
          placeholderTextColor={colors.muted}
        />
        {phoneBad && <Text style={styles.error}>Enter a 10-digit phone number.</Text>}
        <Pressable
          style={[styles.cta, phoneBad && styles.ctaDisabled]}
          disabled={phoneBad}
          onPress={() => {
            updateProfile({ name, phone: phone.trim() ? formatPhone(phone) : undefined });
            setSaved(true);
          }}
        >
          <Text style={styles.ctaText}>{saved ? 'Saved' : 'Save profile'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Level frequency</Text>
        <View style={styles.picker}>
          {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => {
            const active = (group.pendingCadence ?? group.cadence) === c;
            return (
              <Pressable
                key={c}
                onPress={() => proposeCadence(c)}
                style={[styles.pickerBtn, active && styles.pickerBtnActive]}
              >
                <Text style={[styles.pickerText, active && styles.pickerTextActive]}>
                  {CADENCE_LABELS[c]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {group.pendingCadence ? (
          <View style={styles.vote}>
            <Text style={styles.voteTitle}>
              Change to {CADENCE_LABELS[group.pendingCadence]} &middot;{' '}
              {group.cadenceApprovals.length} of {members.length} approved
            </Text>
            <Text style={styles.meta}>
              Still waiting on {cadencePendingOn.map((m) => m.name).join(', ')}. Until then the
              family stays on {CADENCE_LABELS[group.cadence]}.
            </Text>
            {group.cadenceApprovals.includes(me.id) ? null : (
              <Pressable style={styles.cta} onPress={approveCadence}>
                <Text style={styles.ctaText}>Approve the change</Text>
              </Pressable>
            )}
            <Pressable onPress={cancelCadenceChange}>
              <Text style={styles.cancel}>Cancel this change</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Members</Text>
        {members.map((m) => (
          <Text key={m.id} style={styles.member}>
            {m.avatar} {m.name}
            {m.id === me.id ? ' (you)' : ''}
            {m.phone ? ` · ${m.phone}` : ''}
          </Text>
        ))}
      </View>

      <Pressable style={styles.demo} onPress={() => router.push('/settings')}>
        <Text style={styles.demoText}>Reward & level goal</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.label}>Demo switches</Text>
        <DemoToggle
          label="Someone missed a day"
          on={missedReset}
          onPress={simulateMissedDay}
        />
        <DemoToggle
          label="End this period now"
          on={periodWaived}
          onPress={() => setPeriodWaived(!periodWaived)}
        />
      </View>

      <Pressable
        style={styles.leave}
        onPress={() => {
          leaveGroup();
          router.replace('/');
        }}
      >
        <Text style={styles.leaveText}>Leave family</Text>
      </Pressable>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  family: { fontSize: 20, fontWeight: '800', color: colors.text },
  code: { fontSize: 28, fontWeight: '900', letterSpacing: 3, color: colors.accent },
  meta: { fontSize: 13, color: colors.muted },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  cta: {
    marginTop: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  row: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  grow: { flex: 1 },
  secondary: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  secondaryText: { color: colors.muted, fontWeight: '700' },
  edit: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  ctaText: { color: '#fff', fontWeight: '700' },
  inputBad: { borderColor: '#D64545' },
  error: { color: '#D64545', fontSize: 13 },
  member: { fontSize: 16, color: colors.text, paddingVertical: 2 },
  picker: { flexDirection: 'row', gap: spacing.xs },
  pickerBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  pickerBtnActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  pickerText: { color: colors.muted, fontWeight: '600' },
  pickerTextActive: { color: colors.text },
  vote: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  voteTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cancel: { textAlign: 'center', color: colors.muted, fontWeight: '700', paddingTop: spacing.xs },
  leave: { alignItems: 'center', paddingVertical: spacing.sm },
  leaveText: { color: colors.accent, fontWeight: '700' },
  demo: { alignItems: 'center', paddingVertical: spacing.sm },
  demoText: { color: colors.muted, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleLabel: { color: colors.text, fontWeight: '600', flex: 1, paddingRight: spacing.sm },
  pill: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { color: colors.muted, fontWeight: '800' },
  pillTextOn: { color: '#fff' },
});
