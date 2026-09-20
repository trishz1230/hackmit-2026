import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const houseImg = require('../assets/doodles/house.jpg');
const roadImg = require('../assets/doodles/road.jpg');
const plusImg = require('../assets/doodles/plus-sign.png');
const starYellowImg = require('../assets/doodles/star-yellow.png');
const starGreenImg = require('../assets/doodles/star-green.png');
const heartsImg = require('../assets/doodles/hearts.png');
const phoneImg = require('../assets/doodles/phone.png');

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
  return doodle(houseImg, 95 / 99, p);
}
export function RoadIcon(p: Props) {
  return doodle(roadImg, 115 / 131, p);
}
export function PlusIcon(p: Props) {
  return doodle(plusImg, 445 / 473, p);
}
export function YellowStar(p: Props) {
  return doodle(starYellowImg, 570 / 473, p);
}
export function GreenStar(p: Props) {
  return doodle(starGreenImg, 580 / 473, p);
}
export function HeartsDoodle(p: Props) {
  return doodle(heartsImg, 430 / 473, p);
}
export function PhoneDoodle(p: Props) {
  return doodle(phoneImg, 295 / 45, p);
}
