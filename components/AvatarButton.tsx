import React from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AvatarFace } from './AvatarFace';
import { useApp } from '../lib/store';

/** One size everywhere, so your face doesn't change between screens. */
export const AVATAR_SIZE = 54;

/** Your face in the top right of a screen; it stands in for the settings icon. */
export function AvatarButton({ size = AVATAR_SIZE }: { size?: number }) {
  const router = useRouter();
  const { me } = useApp();
  return (
    <Pressable onPress={() => router.push('/(tabs)/settings')} hitSlop={8}>
      <AvatarFace value={me.avatar} size={size} />
    </Pressable>
  );
}
