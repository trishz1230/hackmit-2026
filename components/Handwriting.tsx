/**
 * Text and TextInput that default to the app's handwriting face. Screens import
 * these instead of the react-native ones so every string is handwritten without
 * repeating `fontFamily` in each stylesheet.
 */
import React from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { fonts } from '../lib/theme';

export function Text({ style, ...rest }: TextProps) {
  return <RNText {...rest} style={[{ fontFamily: fonts.body }, style]} />;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(
  { style, ...rest },
  ref
) {
  return <RNTextInput ref={ref} {...rest} style={[{ fontFamily: fonts.body }, style]} />;
});
