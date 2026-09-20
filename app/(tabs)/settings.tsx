import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/Handwriting';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AVATAR_SIZE } from '../../components/AvatarButton';
import { AvatarFace } from '../../components/AvatarFace';
import { HistoryGrid } from '../../components/HistoryGrid';
import { KeyboardScreen } from '../../components/KeyboardScreen';
import { historyDays } from '../../lib/history';
import { MAX_LEVELS, MIN_LEVELS } from '../../lib/levels';
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
    posts,
    hangoutPosts,
    tasks,
    updateProfile,
    updateSettings,
    leaveGroup,
    simulateMissedDay,
    missedReset,
    periodWaived,
    setPeriodWaived,
    pending,
    cadencePendingOn,
    proposeCadence,
    approveCadence,
    cancelCadenceChange,
    loading,
    error,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone ?? '');
  const [editingProfile, setEditingProfile] = useState(false);
  const [familyName, setFamilyName] = useState(group?.name ?? '');
  const [editingFamily, setEditingFamily] = useState(false);
  const [editingCadence, setEditingCadence] = useState(false);
  const [editingReward, setEditingReward] = useState(false);
  const [reward, setReward] = useState(group?.rewardText ?? '');
  const [levels, setLevels] = useState(String(group?.goal ?? 10));
  const phoneBad = phone.trim().length > 0 && !isValidPhone(phone);
  // A family can't aim for fewer levels than it has already cleared.
  const levelFloor = Math.max(MIN_LEVELS, group?.level ?? 1);
  const goalNumber = Number(levels);
  const goalBad = !Number.isInteger(goalNumber) || goalNumber < levelFloor || goalNumber > MAX_LEVELS;
  const rewardBad = !reward.trim() || goalBad;
  const history = historyDays([...posts, ...hangoutPosts], tasks);

  useEffect(() => {
    setName(me.name);
    setPhone(me.phone ?? '');
  }, [me.name, me.phone]);

  useEffect(() => {
    if (group) setFamilyName(group.name);
  }, [group?.name]);

  useEffect(() => {
    if (!group) return;
    setReward(group.rewardText);
    setLevels(String(group.goal));
  }, [group?.rewardText, group?.goal]);

  const saveFamilyName = () => {
    if (!group || !familyName.trim()) return;
    updateSettings({
      rewardText: group.rewardText,
      goal: group.goal,
      name: familyName.trim(),
    });
    setEditingFamily(false);
  };

  const saveReward = () => {
    if (!group || rewardBad) return;
    updateSettings({ rewardText: reward.trim(), goal: goalNumber });
    setEditingReward(false);
  };

  const saveProfile = () => {
    if (phoneBad || !name.trim()) return;
    updateProfile({ name: name.trim(), phone: phone.trim() ? formatPhone(phone) : undefined });
    setEditingProfile(false);
  };

  if (loading) return <View style={styles.blank} />;
  if (!group) return <Redirect href="/onboarding" />;

  return (
    <KeyboardScreen
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable onPress={() => router.push('/avatar?edit=1')} hitSlop={8}>
          <AvatarFace value={me.avatar} size={AVATAR_SIZE} />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Your avatar</Text>
        <View style={styles.avatarRow}>
          <Pressable onPress={() => router.push('/avatar?edit=1')}>
            <Text style={styles.edit}>Change avatar</Text>
          </Pressable>
        </View>
      </View>

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
        {editingProfile ? (
          <>
            <TextInput style={styles.input} value={name} onChangeText={setName} autoFocus />
            {!name.trim() ? <Text style={styles.error}>Your name can&apos;t be blank.</Text> : null}
            <Text style={styles.label}>Phone (optional)</Text>
            <TextInput
              style={[styles.input, phoneBad && styles.inputBad]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="123 456 7890"
              placeholderTextColor={colors.muted}
            />
            {phoneBad ? <Text style={styles.error}>Enter a 10-digit phone number.</Text> : null}
            <View style={styles.row}>
              <Pressable
                style={[styles.cta, styles.grow, (phoneBad || !name.trim()) && styles.ctaDisabled]}
                disabled={phoneBad || !name.trim()}
                onPress={saveProfile}
              >
                <Text style={styles.ctaText}>Save</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={() => {
                  setName(me.name);
                  setPhone(me.phone ?? '');
                  setEditingProfile(false);
                }}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.family}>{me.name}</Text>
            <Text style={styles.meta}>{me.phone ? me.phone : 'No phone yet'}</Text>
            <Pressable onPress={() => setEditingProfile(true)}>
              <Text style={styles.edit}>Edit</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Level frequency</Text>
        <Text style={styles.meta}>Every family member needs to approve.</Text>
        {editingCadence ? (
          <>
            <View style={styles.picker}>
              {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => {
                const active = (group.pendingCadence ?? group.cadence) === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      proposeCadence(c);
                      setEditingCadence(false);
                    }}
                    style={[styles.pickerBtn, active && styles.pickerBtnActive]}
                  >
                    <Text style={[styles.pickerText, active && styles.pickerTextActive]}>
                      {CADENCE_LABELS[c]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setEditingCadence(false)}>
              <Text style={styles.edit}>Cancel</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.family}>{CADENCE_LABELS[group.cadence]}</Text>
            <Pressable onPress={() => setEditingCadence(true)}>
              <Text style={styles.edit}>Edit</Text>
            </Pressable>
          </>
        )}
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Members</Text>
        {members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <AvatarFace value={m.avatar} size={28} />
            <Text style={styles.member}>
              {m.name}
              {m.id === me.id ? ' (you)' : ''}
              {m.phone ? ` · ${m.phone}` : ''}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>History</Text>
        {history.length === 0 ? null : <HistoryGrid days={history} />}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Reward &amp; level goal</Text>
        {editingReward ? (
          <>
            <TextInput
              style={styles.input}
              value={reward}
              onChangeText={setReward}
              placeholder="Sunday dumplings"
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.meta}>
              Levels to the reward ({levelFloor}–{MAX_LEVELS})
            </Text>
            <TextInput
              style={[styles.input, goalBad && styles.inputBad]}
              value={levels}
              onChangeText={setLevels}
              keyboardType="number-pad"
              placeholder="10"
              placeholderTextColor={colors.muted}
            />
            {goalBad ? (
              <Text style={styles.error}>
                Pick between {levelFloor} and {MAX_LEVELS} levels.
              </Text>
            ) : null}
            {!reward.trim() ? (
              <Text style={styles.error}>Give the family something to aim for.</Text>
            ) : null}
            <View style={styles.row}>
              <Pressable
                style={[styles.cta, styles.grow, rewardBad && styles.ctaDisabled]}
                disabled={rewardBad}
                onPress={saveReward}
              >
                <Text style={styles.ctaText}>Save</Text>
              </Pressable>
              <Pressable
                style={styles.secondary}
                onPress={() => {
                  setReward(group.rewardText);
                  setLevels(String(group.goal));
                  setEditingReward(false);
                }}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.family}>{group.rewardText}</Text>
            <Text style={styles.meta}>after {group.goal} levels</Text>
            <Pressable onPress={() => setEditingReward(true)}>
              <Text style={styles.edit}>Edit</Text>
            </Pressable>
          </>
        )}
      </View>

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
        <Text style={styles.meta}>
          {periodWaived && pending.length > 0
            ? `Waiting on ${pending.map((p) => p.name).join(', ')} to post before the level clears.`
            : 'Clears the level once everyone has posted, without waiting for the period.'}
        </Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  blank: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
    backgroundColor: colors.gold,
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
  ctaText: { color: colors.text, fontWeight: '700' },
  inputBad: { borderColor: '#D64545' },
  error: { color: '#D64545', fontSize: 13 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  member: { fontSize: 16, color: colors.text },
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
  pillOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillText: { color: colors.muted, fontWeight: '800' },
  pillTextOn: { color: colors.text },
});
