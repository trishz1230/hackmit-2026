import React from 'react';
import { Redirect } from 'expo-router';
import { useApp } from '../../lib/store';

/**
 * The ＋ tab never renders — pressing it pushes the current level's page. This
 * only catches a direct link to the route.
 */
export default function Plus() {
  const { group } = useApp();
  const level = group ? Math.min(group.level, group.goal) : 1;
  return <Redirect href={`/level/${level}`} />;
}
