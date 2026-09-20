import React from 'react';
import { Image, StyleSheet, View, type ImageStyle } from 'react-native';
import { Text } from './Handwriting';

/**
 * Hand-drawn avatar: a base face with eyes, a mouth and hair drawn over it. A
 * profile stores it in the same `avatar` column as the old emoji, encoded as
 * "face:eyes,mouth,hair"; anything else is still rendered as an emoji.
 */

/** A drawing laid over the head, sized and placed against the head itself. */
export type Part = {
  src: number;
  /** Drawn width / height of the art. */
  aspect: number;
  /** Width as a fraction of the head's width. */
  width: number;
  /** Where on the head it lands, as a fraction of the head's height. */
  anchor: number;
  /** Which point of the art meets that anchor, as a fraction of its height. */
  pivot: number;
};

const HEAD_ASPECT = 654 / 384;
/** The head's width and top, as fractions of the avatar's box. */
const HEAD_WIDTH = 0.8;
const HEAD_TOP = 0.34;

const eyes = (src: number, aspect: number): Part => ({
  src,
  aspect,
  width: 0.44,
  anchor: 0.13,
  pivot: 0.5,
});

const mouth = (src: number, aspect: number): Part => ({
  src,
  aspect,
  width: 0.32,
  anchor: 0.38,
  pivot: 0,
});

export const HEAD = require('../assets/avatar/head.png');

export const EYES: Part[] = [
  eyes(require('../assets/avatar/eyes-dots.png'), 204 / 75),
  eyes(require('../assets/avatar/eyes-hearts.png'), 228 / 96),
  eyes(require('../assets/avatar/eyes-squiggle.png'), 273 / 81),
  eyes(require('../assets/avatar/eyes-diamonds.png'), 189 / 99),
  eyes(require('../assets/avatar/eyes-tears.png'), 189 / 96),
];

export const MOUTHS: Part[] = [
  mouth(require('../assets/avatar/mouth-smile.png'), 225 / 108),
  mouth(require('../assets/avatar/mouth-grin.png'), 375 / 234),
  mouth(require('../assets/avatar/mouth-oh.png'), 174 / 174),
  mouth(require('../assets/avatar/mouth-squiggle.png'), 282 / 99),
  mouth(require('../assets/avatar/mouth-blob.png'), 255 / 150),
  mouth(require('../assets/avatar/mouth-teeth.png'), 255 / 150),
];

export const HAIR: Part[] = [
  { src: require('../assets/avatar/hair-1.png'), aspect: 510 / 234, width: 0.92, anchor: 0.14, pivot: 1 },
  { src: require('../assets/avatar/hair-2.png'), aspect: 534 / 246, width: 0.95, anchor: 0.14, pivot: 1 },
  { src: require('../assets/avatar/hair-3.png'), aspect: 636 / 726, width: 1.05, anchor: 0.4, pivot: 0.55 },
];

export type Face = { eyes: number; mouth: number; hair: number };

export const FACE_PREFIX = 'face:';

export function encodeFace(f: Face) {
  return `${FACE_PREFIX}${f.eyes},${f.mouth},${f.hair}`;
}

export function parseFace(value?: string): Face | null {
  if (!value || !value.startsWith(FACE_PREFIX)) return null;
  const [e, m, h] = value.slice(FACE_PREFIX.length).split(',').map(Number);
  if ([e, m, h].some((n) => !Number.isInteger(n))) return null;
  return { eyes: e % EYES.length, mouth: m % MOUTHS.length, hair: h % HAIR.length };
}

export function headStyle(size: number): ImageStyle {
  const width = HEAD_WIDTH * size;
  return {
    position: 'absolute',
    alignSelf: 'center',
    top: HEAD_TOP * size,
    width,
    height: width / HEAD_ASPECT,
  };
}

/** Places a feature on the head drawn at `size`. */
export function partStyle(part: Part, size: number): ImageStyle {
  const headWidth = HEAD_WIDTH * size;
  const headHeight = headWidth / HEAD_ASPECT;
  const width = part.width * headWidth;
  const height = width / part.aspect;
  return {
    position: 'absolute',
    alignSelf: 'center',
    top: HEAD_TOP * size + part.anchor * headHeight - part.pivot * height,
    width,
    height,
  };
}

/** Renders a drawn avatar, or the emoji fallback for profiles made before this. */
export function AvatarFace({ value, size }: { value?: string; size: number }) {
  const face = parseFace(value);
  if (!face)
    return (
      <View style={[styles.wrap, { width: size, height: size }]}>
        <Text style={{ fontSize: size * 0.8, lineHeight: size }}>{value || '🙂'}</Text>
      </View>
    );
  return <FaceLayers face={face} size={size} />;
}

/** `upTo` hides later features while the avatar is still being built. */
export function FaceLayers({
  face,
  size,
  upTo = 'hair',
}: {
  face: Face;
  size: number;
  upTo?: 'eyes' | 'mouth' | 'hair';
}) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {upTo === 'hair' ? (
        <Image
          source={HAIR[face.hair].src}
          resizeMode="contain"
          style={partStyle(HAIR[face.hair], size)}
        />
      ) : null}
      <Image source={HEAD} resizeMode="contain" style={headStyle(size)} />
      <Image
        source={EYES[face.eyes].src}
        resizeMode="contain"
        style={partStyle(EYES[face.eyes], size)}
      />
      {upTo === 'eyes' ? null : (
        <Image
          source={MOUTHS[face.mouth].src}
          resizeMode="contain"
          style={partStyle(MOUTHS[face.mouth], size)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
