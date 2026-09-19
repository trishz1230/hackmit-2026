import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { describeWait } from '../lib/levels';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

export default function Capture() {
  const router = useRouter();
  const { channel } = useLocalSearchParams<{ channel?: string }>();
  const hangout = channel === 'hangout';
  const { task, addPost, taskLocked, opensAt } = useApp();
  const [mode, setMode] = useState<'photo' | 'text'>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [photoError, setPhotoError] = useState('');

  const pick = async (from: 'camera' | 'library') => {
    setPhotoError('');
    try {
      const permission =
        from === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError(
          from === 'camera'
            ? 'Allow camera access in Settings, or use Text instead.'
            : 'Allow photo library access in Settings, or use Text instead.'
        );
        return;
      }
      const result =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    } catch {
      setPhotoError('Could not open the camera. Switch to Text to post.');
    }
  };

  const post = () => {
    const to = hangout ? 'hangout' : 'task';
    if (mode === 'photo' && !photoUri) return;
    if (mode === 'text' && !text.trim()) return;
    const { completedGoal } = addPost(
      mode === 'photo' ? 'photo' : 'text',
      mode === 'photo' ? photoUri! : text.trim(),
      to
    );
    if (hangout) {
      router.replace('/(tabs)/hangout');
      return;
    }
    router.replace(completedGoal ? '/next-goal' : '/(tabs)/feed');
  };

  if (!hangout && taskLocked) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.prompt}>Wait till the next time for a new conversation!</Text>
        <Text style={styles.locked}>This level starts {describeWait(opensAt)}.</Text>
        <Pressable style={styles.cta} onPress={() => router.replace('/(tabs)/feed')}>
          <Text style={styles.ctaText}>Back to the family</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <Text style={styles.prompt}>
        {hangout ? 'Share anything with the family' : task.prompt}
      </Text>

      <View style={styles.toggle}>
        {(['photo', 'text'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
              {m === 'photo' ? '📷 Photo' : '✍️ Text'}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'photo' ? (
        <View style={styles.photoArea}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <Text style={styles.placeholder}>No photo yet</Text>
          )}
          <View style={styles.row}>
            <Pressable style={styles.secondary} onPress={() => pick('camera')}>
              <Text style={styles.secondaryText}>Open camera</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => pick('library')}>
              <Text style={styles.secondaryText}>Choose photo</Text>
            </Pressable>
          </View>
          {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          multiline
          placeholder={hangout ? 'What\u2019s going on?' : 'Tell them about your day…'}
          placeholderTextColor={colors.muted}
        />
      )}

      <Pressable style={styles.cta} onPress={post}>
        <Text style={styles.ctaText}>{hangout ? 'Post to hangout' : 'Post to family'}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.md, gap: spacing.md, backgroundColor: colors.bg },
  prompt: { fontSize: 20, fontWeight: '700', color: colors.text },
  locked: { flex: 1, color: colors.muted, fontSize: 16, lineHeight: 22 },
  toggle: { flexDirection: 'row', backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.card },
  toggleText: { color: colors.muted, fontWeight: '600' },
  toggleTextActive: { color: colors.text },
  photoArea: { flex: 1, gap: spacing.sm },
  preview: { flex: 1, borderRadius: radius.md },
  placeholder: {
    flex: 1,
    textAlignVertical: 'center',
    textAlign: 'center',
    color: colors.muted,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  secondary: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: '600' },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  cta: { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#C62828', fontWeight: '600' },
});
