import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardDismissLayer } from '../components/KeyboardDismissLayer';
import { describeWait } from '../lib/levels';
import { dismissKeyboard } from '../lib/keyboard';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

export default function Capture() {
  const router = useRouter();
  const { channel } = useLocalSearchParams<{ channel?: string }>();
  const hangout = channel === 'hangout';
  const { task, addPost, taskLocked, opensAt } = useApp();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [textFocused, setTextFocused] = useState(false);

  const pick = async (from: 'camera' | 'library') => {
    setPhotoError('');
    try {
      const permission =
        from === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        const source = from === 'camera' ? 'camera' : 'photo library';
        setPhotoError(`Allow ${source} access in Settings, or just write something instead.`);
        return;
      }
      const result =
        from === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
      if (!result.canceled) setPhotoUri(result.assets[0].uri);
    } catch {
      setPhotoError('Could not open the camera. Choose a photo, or just write something.');
    }
  };

  const words = text.trim();
  const canPost = Boolean(photoUri || words);

  const post = () => {
    if (!canPost) return;
    const to = hangout ? 'hangout' : 'task';
    const { completedGoal } = addPost(
      photoUri ? 'photo' : 'text',
      photoUri ?? words,
      to,
      photoUri ? words || undefined : undefined
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
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Text style={styles.prompt}>
          {hangout ? 'Share anything with the family' : task.prompt}
        </Text>

        <Pressable style={styles.square} onPress={() => pick(photoUri ? 'library' : 'camera')}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <>
              <Text style={styles.squareIcon}>📷</Text>
              <Text style={styles.squareText}>Add a photo</Text>
            </>
          )}
        </Pressable>

        <View style={styles.row}>
          <Pressable style={styles.secondary} onPress={() => pick('camera')}>
            <Text style={styles.secondaryText}>Open camera</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => pick('library')}>
            <Text style={styles.secondaryText}>Choose photo</Text>
          </Pressable>
          {photoUri ? (
            <Pressable style={styles.secondary} onPress={() => setPhotoUri(null)}>
              <Text style={styles.secondaryText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
        {photoError ? <Text style={styles.error}>{photoError}</Text> : null}

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          onFocus={() => setTextFocused(true)}
          onBlur={() => setTextFocused(false)}
          multiline
          placeholder={
            photoUri ? 'Add a caption…' : hangout ? 'What\u2019s going on?' : 'Tell them about your day…'
          }
          placeholderTextColor={colors.muted}
        />

        <Pressable
          style={[styles.cta, !canPost && styles.ctaDisabled]}
          disabled={!canPost}
          onPress={() => {
            dismissKeyboard();
            post();
          }}
        >
          <Text style={styles.ctaText}>{hangout ? 'Post to hangout' : 'Post to family'}</Text>
        </Pressable>
      </KeyboardAvoidingView>
      <KeyboardDismissLayer armed={textFocused} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, padding: spacing.md, gap: spacing.md, backgroundColor: colors.bg },
  prompt: { fontSize: 20, fontWeight: '700', color: colors.text },
  locked: { flex: 1, color: colors.muted, fontSize: 16, lineHeight: 22 },
  square: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  squareIcon: { fontSize: 40 },
  squareText: { color: colors.muted, fontWeight: '600', marginTop: spacing.xs },
  preview: { width: '100%', height: '100%' },
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
    minHeight: 90,
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
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#C62828', fontWeight: '600' },
});
