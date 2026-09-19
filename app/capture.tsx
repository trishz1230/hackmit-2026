import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

export default function Capture() {
  const router = useRouter();
  const { channel } = useLocalSearchParams<{ channel?: string }>();
  const hangout = channel === 'hangout';
  const { task, addPost } = useApp();
  const [mode, setMode] = useState<'photo' | 'text'>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [text, setText] = useState('');

  const pick = async (from: 'camera' | 'library') => {
    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const post = () => {
    const to = hangout ? 'hangout' : 'task';
    if (mode === 'photo' && photoUri) addPost('photo', photoUri, to);
    else if (mode === 'text' && text.trim()) addPost('text', text.trim(), to);
    else return;
    router.replace(hangout ? '/hangout' : '/');
  };

  return (
    <View style={styles.wrap}>
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
              <Text style={styles.secondaryText}>Choose file</Text>
            </Pressable>
          </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.md, gap: spacing.md, backgroundColor: colors.bg },
  prompt: { fontSize: 20, fontWeight: '700', color: colors.text },
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
});
