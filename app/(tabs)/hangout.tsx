import React from 'react';
import { Redirect } from 'expo-router';

/** The hangout feed lives on the ＋ tab now; this keeps old links working. */
export default function Hangout() {
  return <Redirect href="/(tabs)/plus" />;
}
