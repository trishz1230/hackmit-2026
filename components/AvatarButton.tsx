import React from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AvatarFace } from './AvatarFace';
import { useApp } from '../lib/store';

/** Your face in the top right of a tab; it stands in for the settings icon. */
export function AvatarButton({ size = 42 }: { size?: number }) {
  const router = useRouter();
  const { me } = useApp();
  return (
    <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8}>
      <AvatarFace value={me.avatar} size={size} />
    </Pressable>
  );
}
