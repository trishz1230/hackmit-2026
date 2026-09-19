import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useApp } from '../../lib/store';
import { colors, radius, spacing } from '../../lib/theme';
import { CADENCE_LABELS, type Cadence } from '../../lib/types';

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
    endPeriodNow,
  } = useApp();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone ?? '');
  const [saved, setSaved] = useState(false);
  const [familyName, setFamilyName] = useState(group?.name ?? '');
  const [familySaved, setFamilySaved] = useState(false);

  useEffect(() => {
    setName(me.name);
    setPhone(me.phone ?? '');
  }, [me.name, me.phone]);

  useEffect(() => {
    if (group) setFamilyName(group.name);
  }, [group?.name]);

  if (!group) return <Redirect href="/onboarding" />;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Family name</Text>
        <TextInput
          style={styles.input}
          value={familyName}
          onChangeText={(t) => {
            setFamilyName(t);
            setFamilySaved(false);
          }}
          placeholder="The Zhengs"
          placeholderTextColor={colors.muted}
        />
        <Pressable
          style={styles.cta}
          onPress={() => {
            if (!familyName.trim()) return;
            updateSettings({
              cadence: group.cadence,
              rewardText: group.rewardText,
              goal: group.goal,
              name: familyName.trim(),
            });
            setFamilySaved(true);
          }}
        >
          <Text style={styles.ctaText}>{familySaved ? 'Saved' : 'Save family name'}</Text>
        </Pressable>
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
          style={styles.input}
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            setSaved(false);
          }}
          keyboardType="phone-pad"
          placeholder="For Call on posts"
          placeholderTextColor={colors.muted}
        />
        <Pressable
          style={styles.cta}
          onPress={() => {
            updateProfile({ name, phone: phone.trim() || undefined });
            setSaved(true);
          }}
        >
          <Text style={styles.ctaText}>{saved ? 'Saved' : 'Save profile'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Level length &amp; reminders</Text>
        <Text style={styles.meta}>
          How long one level lasts and how often the family gets nudged. Everyone can post any
          time, but the level only clears at midnight once the period is up.
        </Text>
        <View style={styles.picker}>
          {(Object.keys(CADENCE_LABELS) as Cadence[]).map((c) => (
            <Pressable
              key={c}
              onPress={() =>
                updateSettings({ cadence: c, rewardText: group.rewardText, goal: group.goal })
              }
              style={[styles.pickerBtn, group.cadence === c && styles.pickerBtnActive]}
            >
              <Text
                style={[styles.pickerText, group.cadence === c && styles.pickerTextActive]}
              >
                {CADENCE_LABELS[c]}
              </Text>
            </Pressable>
          ))}
        </View>
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

      <Pressable style={styles.demo} onPress={simulateMissedDay}>
        <Text style={styles.demoText}>Demo: someone missed a day</Text>
      </Pressable>

      <Pressable style={styles.demo} onPress={endPeriodNow}>
        <Text style={styles.demoText}>Demo: end this period now</Text>
      </Pressable>

      <Pressable
        style={styles.leave}
        onPress={() => {
          leaveGroup();
          router.replace('/');
        }}
      >
        <Text style={styles.leaveText}>Leave family</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
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
  ctaText: { color: '#fff', fontWeight: '700' },
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
  leave: { alignItems: 'center', paddingVertical: spacing.sm },
  leaveText: { color: colors.accent, fontWeight: '700' },
  demo: { alignItems: 'center', paddingVertical: spacing.sm },
  demoText: { color: colors.muted, fontWeight: '700' },
});
