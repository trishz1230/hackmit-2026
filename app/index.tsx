import { Redirect } from 'expo-router';
import { useApp } from '../lib/store';

export default function Gate() {
  const { group, loading } = useApp();
  if (loading) return null;
  if (!group) return <Redirect href="/welcome" />;
  return <Redirect href="/(tabs)" />;
}
