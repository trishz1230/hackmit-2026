import { Redirect } from 'expo-router';
import { useApp } from '../lib/store';

export default function Gate() {
  const { group } = useApp();
  if (!group) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
