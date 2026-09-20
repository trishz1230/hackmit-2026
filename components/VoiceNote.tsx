import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Text } from './Handwriting';
import { colors, radius, spacing } from '../lib/theme';

export const clock = (seconds: number): string => {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${`${whole % 60}`.padStart(2, '0')}`;
};

/** A recorded message, played back in place with a progress bar. */
export function VoiceNote({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const played = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish || played >= 1) void player.seekTo(0);
    player.play();
  };

  return (
    <Pressable style={styles.note} onPress={toggle}>
      <Text style={styles.button}>{status.playing ? '⏸' : '▶︎'}</Text>
      <View style={styles.track}>
        <View style={[styles.played, { width: `${played * 100}%` }]} />
      </View>
      <Text style={styles.time}>
        {clock(status.playing || played > 0 ? status.currentTime : status.duration)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  button: { fontSize: 18, color: colors.accent, width: 22, textAlign: 'center' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  played: { height: '100%', backgroundColor: colors.accent },
  time: { color: colors.muted, fontSize: 13, minWidth: 34, textAlign: 'right' },
});
