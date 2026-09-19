import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { clampLevelCount, MAX_LEVELS, MIN_LEVELS } from '../lib/levels';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

export default function Onboarding() {
  const router = useRouter();
  const { createGroup, joinGroup } = useApp();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('');
  const [goal, setGoal] = useState('7');
  const [code, setCode] = useState('');

  const submit = () => {
    if (mode === 'create') {
      createGroup(familyName.trim() || 'My family', clampLevelCount(Number(goal)));
    } else {
      joinGroup(code.trim().toUpperCase());
    }
    router.replace('/');
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.logo}>FamStreak</Text>
      <Text style={styles.tagline}>
        One task a day. Everyone posts, or the whole family&apos;s streak resets.
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

      {mode === 'create' ? (
        <>
          <Text style={styles.label}>Family name</Text>
          <TextInput
            style={styles.input}
            value={familyName}
            onChangeText={setFamilyName}
            placeholder="The Zhangs"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Level goal ({MIN_LEVELS}–{MAX_LEVELS})</Text>
          <TextInput
            style={styles.input}
            value={goal}
            onChangeText={setGoal}
            keyboardType="number-pad"
            placeholder="7"
            placeholderTextColor={colors.muted}
          />
        </>
      ) : (
        <>
          <Text style={styles.label}>Join code</Text>
          <TextInput
            style={[styles.input, styles.code]}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            placeholder="FAM123"
            placeholderTextColor={colors.muted}
          />
        </>
      )}

      <Pressable style={styles.cta} onPress={submit}>
        <Text style={styles.ctaText}>{mode === 'create' ? 'Create family' : 'Join family'}</Text>
      </Pressable>
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
  code: { letterSpacing: 4, fontSize: 20, fontWeight: '700' },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
