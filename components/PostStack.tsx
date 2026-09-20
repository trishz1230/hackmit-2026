import React, { useRef, useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet, View } from 'react-native';
import { Text } from './Handwriting';
import { VoiceNote } from './VoiceNote';
import { colors, radius, spacing } from '../lib/theme';
import type { Post } from '../lib/types';

const CARD_W = 195;
const CARD_H = 230;
/** How many cards peek out from under the top one. */
const VISIBLE = 5;

const RANGE = [0, 1, 2, 3, 4, 5];
const DEPTH_X = [0, -58, 55, -38, 44, -24];
const DEPTH_Y = [0, -18, -34, -50, -64, -76];
const DEPTH_ROT = [0, -15, 13, -9, 10, -6];
const DEPTH_SCALE = [1, 0.97, 0.94, 0.9, 0.87, 0.84];

/** Per-card scatter baked into the offsets, so equal depths still look different. */
const jitter = (i: number) => ({
  jx: ((i * 47) % 21) - 10,
  jy: ((i * 29) % 13) - 6,
  jr: ((i * 31) % 17) - 8,
});

/** Where a card sits in the pile, animated so it glides when the order moves. */
function depthStyle(depth: Animated.Value, j: { jx: number; jy: number; jr: number }) {
  const interp = (out: number[]) =>
    depth.interpolate({ inputRange: RANGE, outputRange: out, extrapolate: 'clamp' });
  return {
    x: interp(DEPTH_X.map((v) => v + j.jx)),
    y: interp(DEPTH_Y.map((v) => v + j.jy)),
    rot: depth.interpolate({
      inputRange: RANGE,
      outputRange: DEPTH_ROT.map((d) => `${d + j.jr}deg`),
      extrapolate: 'clamp',
    }),
    scale: interp(DEPTH_SCALE),
    opacity: depth.interpolate({
      inputRange: [0, VISIBLE - 1, VISIBLE],
      outputRange: [1, 0.85, 0],
      extrapolate: 'clamp',
    }),
  };
}

/**
 * The week's posts as a messy pile: the top card drags, a fling sends it to
 * the bottom of the deck, and a tap opens the post. The card being flung
 * keeps following the finger while it glides underneath.
 */
export function PostStack({
  posts,
  nameOf,
  onOpen,
}: {
  posts: Post[];
  nameOf: (userId: string) => string;
  onOpen: (post: Post) => void;
}) {
  const n = posts.length;
  const [top, setTop] = useState(0);
  const [flying, setFlying] = useState<number | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const depths = useRef<Animated.Value[]>([]);
  if (depths.current.length !== n) {
    depths.current = posts.map((_, i) => new Animated.Value(i));
  }
  // The responder is created once; read the latest props through a ref.
  const latest = useRef({ posts, top, nameOf, onOpen });
  latest.current = { posts, top, nameOf, onOpen };

  const cycle = () => {
    const count = latest.current.posts.length;
    if (count === 0) return;
    const next = (latest.current.top + 1) % count;
    setFlying(latest.current.top);
    setTop(next);
    depths.current.forEach((v, i) => {
      Animated.spring(v, {
        toValue: (i - next + count) % count,
        friction: 7,
        useNativeDriver: true,
      }).start();
    });
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      useNativeDriver: true,
    }).start(() => setFlying(null));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_e, g) => {
        const { posts: deck, top: t, onOpen: open } = latest.current;
        if (Math.abs(g.dx) <= 10 && Math.abs(g.dy) <= 10) {
          open(deck[t]);
          return;
        }
        const flung =
          Math.abs(g.dx) > 60 ||
          Math.abs(g.vx) > 0.3 ||
          Math.abs(g.dy) > 60 ||
          Math.abs(g.vy) > 0.3;
        if (!flung) {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: true,
          }).start();
          return;
        }
        const sideways = Math.abs(g.dx) >= Math.abs(g.dy);
        Animated.timing(pan, {
          toValue: sideways
            ? { x: Math.sign(g.dx || g.vx) * 520, y: g.dy * 2 }
            : { x: g.dx * 2, y: Math.sign(g.dy || g.vy) * 520 },
          duration: 170,
          useNativeDriver: true,
        }).start(() => cycle());
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <View style={styles.stage} {...responder.panHandlers}>
      {posts.map((post, i) => {
        const z = (i - top + n) % n;
        if (z >= VISIBLE + 1) return null;
        const d = depthStyle(depths.current[i], jitter(i));
        const isTop = i === top;
        const isFlying = i === flying;
        return (
          <Animated.View
            key={post.id}
            style={[
              styles.card,
              {
                zIndex: n - z,
                opacity: d.opacity,
                transform: [
                  { translateX: isTop ? pan.x : isFlying ? Animated.add(pan.x, d.x) : d.x },
                  { translateY: isTop || isFlying ? Animated.add(d.y, pan.y) : d.y },
                  {
                    rotate:
                      isTop || isFlying
                        ? pan.x.interpolate({
                            inputRange: [-180, 0, 180],
                            outputRange: ['-12deg', '0deg', '12deg'],
                            extrapolate: 'clamp',
                          })
                        : d.rot,
                  },
                  { scale: d.scale },
                ],
              },
            ]}
          >
            {post.kind === 'photo' ? (
              <>
                <Image source={{ uri: post.content }} style={styles.art} resizeMode="cover" />
                <Text style={styles.nameOverlay}>{nameOf(post.userId)}</Text>
              </>
            ) : post.kind === 'voice' ? (
              <View style={styles.body}>
                <Text style={styles.bodyText}>🎙 {post.caption || 'Voice message'}</Text>
                <VoiceNote uri={post.content} />
                <Text style={styles.name}>{nameOf(post.userId)}</Text>
              </View>
            ) : (
              <View style={styles.body}>
                <Text style={styles.bodyText} numberOfLines={8}>
                  {post.content}
                </Text>
                <Text style={styles.name}>{nameOf(post.userId)}</Text>
              </View>
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: CARD_H + 100,
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  art: { flex: 1 },
  nameOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    fontSize: 13,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  body: { flex: 1, padding: spacing.sm },
  bodyText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 21 },
  name: { fontSize: 13, color: colors.muted, paddingTop: 3 },
});
