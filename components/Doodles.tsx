import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const houseImg = require('../assets/doodles/house.jpg');
const roadImg = require('../assets/doodles/road.jpg');
const plusImg = require('../assets/doodles/plus.jpg');
const starYellowImg = require('../assets/doodles/star-yellow.jpg');
const starGreenImg = require('../assets/doodles/star-green.jpg');
const heartsImg = require('../assets/doodles/hearts.jpg');

type Props = {
  /** The drawing's width; height follows the artwork's own proportions. */
  size?: number;
  /** Greyed-out look for the inactive tab. */
  dim?: boolean;
  style?: StyleProp<ImageStyle>;
};

function doodle(source: number, ratio: number, { size = 30, dim, style }: Props) {
  return (
    <Image
      source={source}
      resizeMode="contain"
      style={[{ width: size, height: size * ratio }, dim && styles.dim, style]}
    />
  );
}

const styles = {
  dim: { opacity: 0.4 },
};

export function HouseIcon(p: Props) {
  return doodle(houseImg, 480 / 473, p);
}
export function RoadIcon(p: Props) {
  return doodle(roadImg, 335 / 473, p);
}
export function PlusIcon(p: Props) {
  return doodle(plusImg, 445 / 473, p);
}
export function YellowStar(p: Props) {
  return doodle(starYellowImg, 545 / 473, p);
}
export function GreenStar(p: Props) {
  return doodle(starGreenImg, 560 / 473, p);
}
export function HeartsDoodle(p: Props) {
  return doodle(heartsImg, 420 / 473, p);
}
