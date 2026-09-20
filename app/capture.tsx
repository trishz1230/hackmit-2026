import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  type TextInput as RNTextInput,
  View,
} from 'react-native';
import { Text, TextInput } from '../components/Handwriting';
import {
  AudioModule,
  IOSOutputFormat,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarButton } from '../components/AvatarButton';
import { KeyboardDismissLayer } from '../components/KeyboardDismissLayer';
import { KeyboardScreen } from '../components/KeyboardScreen';
import { VoiceNote, clock } from '../components/VoiceNote';
import { describeWait } from '../lib/levels';
import { dismissKeyboard } from '../lib/keyboard';
import { useApp } from '../lib/store';
import { colors, radius, spacing } from '../lib/theme';

/** Long enough to say something, short enough that nobody scrolls past it. */
const MAX_RECORDING_SECONDS = 60;

/**
 * Mono 16 kHz WAV: the one format Muse Voice Transcribe reads, so the family's
 * voice notes arrive transcribable. iOS records it directly; Android's recorder
 * has no WAV output and the web recorder gives WebM, so those are converted on
 * upload (lib/wav.ts).
 */
const VOICE = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 16_000,
  numberOfChannels: 1,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    sampleRate: 16_000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: { ...RecordingPresets.HIGH_QUALITY.android, extension: '.m4a' },
};

export default function Capture() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { channel, start } = useLocalSearchParams<{ channel?: string; start?: string }>();
  const hangout = channel === 'hangout';
  const { task, addPost, taskLocked, opensAt, hasPostedThisCycle } = useApp();
  // The prompt is only asked once; anything after it is a free extra share.
  const extra = !hangout && hasPostedThisCycle;
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [textFocused, setTextFocused] = useState(false);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState('');
  const recorder = useAudioRecorder(VOICE);
  const recorderState = useAudioRecorderState(recorder);
  const started = useRef(false);
  const input = useRef<RNTextInput>(null);
  const opened = useRef(false);

  // The recorder stops itself at MAX_RECORDING_SECONDS, with nobody to catch it.
  useEffect(() => {
    if (recorderState.isRecording) {
      started.current = true;
      return;
    }
    if (!started.current) return;
    started.current = false;
    if (recorderState.url) setVoiceUri(recorderState.url);
  }, [recorderState.isRecording, recorderState.url]);

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
      setPhotoError('Could not open photos. Try again, or just write something.');
    }
  };

  const addPhoto = () => {
    const take = { text: 'Take photo', onPress: () => void pick('camera') };
    const album = { text: 'Add from album', onPress: () => void pick('library') };
    const remove = { text: 'Remove photo', style: 'destructive' as const, onPress: () => setPhotoUri(null) };
    const cancel = { text: 'Cancel', style: 'cancel' as const };

    // A browser has no camera roll and no Alert to choose with, so the file
    // picker (which offers the camera on a phone) is the whole chooser.
    if (Platform.OS === 'web') {
      void pick('library');
      return;
    }

    if (Platform.OS === 'ios') {
      const options = photoUri ? [take.text, album.text, remove.text, cancel.text] : [take.text, album.text, cancel.text];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: photoUri ? 2 : undefined,
        },
        (i) => {
          if (i === 0) void pick('camera');
          if (i === 1) void pick('library');
          if (photoUri && i === 2) setPhotoUri(null);
        }
      );
      return;
    }

    Alert.alert('Add a photo', undefined, photoUri ? [take, album, remove, cancel] : [take, album, cancel]);
  };

  const startRecording = async () => {
    setVoiceError('');
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setVoiceError('Allow microphone access to record, or just write something instead.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      setVoiceUri(null);
      recorder.record({ forDuration: MAX_RECORDING_SECONDS });
    } catch {
      setVoiceError('Could not start recording. Try again, or just write something.');
    }
  };

  const stopRecording = async () => {
    try {
      started.current = false;
      await recorder.stop();
      // Leaving the session in recording mode makes playback inaudible on iOS.
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      setVoiceUri(recorder.uri);
    } catch {
      setVoiceError('Could not save that recording. Try again.');
    }
  };

  // Arriving from a level's photo / voice / write button opens that one.
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    if (start === 'photo') addPhoto();
    else if (start === 'voice') void startRecording();
    else if (start === 'text') input.current?.focus();
    // Only ever the arrival, so the pickers don't reopen on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  const words = text.trim();
  const canPost = Boolean(photoUri || voiceUri || words) && !recorderState.isRecording;

  const post = () => {
    if (!canPost) return;
    // An extra share isn't an answer, so it belongs in the hangout feed.
    const to = hangout || extra ? 'hangout' : 'task';
    // A recording or a photo carries the words as its caption; text posts are the words.
    const kind = voiceUri ? 'voice' : photoUri ? 'photo' : 'text';
    addPost(
      kind,
      voiceUri ?? photoUri ?? words,
      to,
      kind === 'text' ? undefined : words || undefined
    );
    if (hangout || extra) {
      router.replace('/(tabs)/plus');
      return;
    }
    // Answering always lands back on the family feed, wherever capture opened
    // from; the finished goal announces itself over it.
    router.replace('/(tabs)/feed');
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
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
          <Text style={styles.barTitle}>{extra ? 'Share more' : "Today's task"}</Text>
        </Pressable>
        <AvatarButton />
      </View>
      <KeyboardScreen contentContainerStyle={styles.wrap}>
        <Text style={styles.prompt}>
          {hangout
            ? 'Share anything with the family'
            : extra
              ? 'What else would you like to share with your family?'
              : task.prompt}
        </Text>

        <Pressable style={styles.square} onPress={addPhoto}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <>
              <Text style={styles.squareIcon}>📷</Text>
              <Text style={styles.squareText}>Add a photo</Text>
            </>
          )}
        </Pressable>
        {photoError ? <Text style={styles.error}>{photoError}</Text> : null}

        {voiceUri ? (
          <View style={styles.voice}>
            <VoiceNote uri={voiceUri} />
            <Pressable onPress={() => setVoiceUri(null)} hitSlop={8}>
              <Text style={styles.recordAgain}>Record again</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.record, recorderState.isRecording && styles.recording]}
            onPress={() => void (recorderState.isRecording ? stopRecording() : startRecording())}
          >
            <Text style={styles.recordText}>
              {recorderState.isRecording
                ? `Stop recording · ${clock(recorderState.durationMillis / 1000)}`
                : '🎙 Record a voice message'}
            </Text>
          </Pressable>
        )}
        {voiceError ? <Text style={styles.error}>{voiceError}</Text> : null}

        <TextInput
          ref={input}
          style={styles.input}
          value={text}
          onChangeText={setText}
          onFocus={() => setTextFocused(true)}
          onBlur={() => setTextFocused(false)}
          multiline
          placeholder={
            photoUri || voiceUri
              ? 'Add a caption…'
              : hangout || extra
                ? 'by the way\u2026'
                : 'Tell them about your day…'
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
          <Text style={styles.ctaText}>{hangout || extra ? 'Post to hangout' : 'Post to family'}</Text>
        </Pressable>
      </KeyboardScreen>
      <KeyboardDismissLayer armed={textFocused} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: { fontSize: 22, color: colors.text },
  barTitle: { fontSize: 17, color: colors.text },
  wrap: { flexGrow: 1, padding: spacing.md, gap: spacing.md, backgroundColor: colors.bg },
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
  record: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  recording: { borderColor: colors.accent },
  recordText: { color: colors.text, fontWeight: '600' },
  voice: { gap: spacing.xs },
  recordAgain: { color: colors.muted, fontSize: 13, alignSelf: 'flex-end' },
  squareIcon: { fontSize: 40 },
  squareText: { color: colors.muted, fontWeight: '600', marginTop: spacing.xs },
  preview: { width: '100%', height: '100%' },
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
  cta: { backgroundColor: colors.gold, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: colors.text, fontWeight: '700', fontSize: 16 },
  error: { color: '#C62828', fontWeight: '600' },
});
