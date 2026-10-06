import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { hasPermission, homeFor } from '../contracts';
import { Screen, Card, Copy, Button, ErrorMessage } from '../components/ui';
const labels = { CUSTOMER: 'Your laundry, handled.', RIDER: 'Your rider dashboard', LAUNDRY_PARTNER: 'Your laundry workspace', ADMIN: 'Your admin workspace' };
export default function Dashboard() {
  const { user, loading, client } = useAuth();
  const { data, error: queryError, isFetching: busy, refetch: load } = useQuery({ queryKey: ['dashboard', user?.id, user?.role], enabled: !loading && homeFor(user) === '/dashboard', queryFn: () => client.call(user.role === 'RIDER' ? '/rider/orders' : user.role === 'LAUNDRY_PARTNER' ? '/partner/orders' : user.role === 'ADMIN' ? '/admin/summary' : '/orders') });
  const error = queryError?.message;
  if (loading) return <Screen title="Loading…" />; if (homeFor(user) !== '/dashboard') return <Redirect href={homeFor(user)} />;
  return <Screen title={labels[user.role]} subtitle={`Welcome back, ${user.name}.`}><Card><Copy>{user.role === 'ADMIN' ? `Orders: ${data?.orderCount ?? '—'} · Active: ${data?.activeOrders ?? '—'}` : `Orders in your workspace: ${data?.orders?.length ?? '—'}`}</Copy><ErrorMessage message={error} /><Button secondary busy={busy} onPress={load}>Refresh live data</Button></Card>{data?.orders?.slice(0, 5).map(order => <Card key={order._id}><Copy>#{order._id.slice(-6).toUpperCase()} · {order.status.replaceAll('_', ' ')}</Copy><Copy>₹{Number(order.total || 0).toFixed(2)}</Copy></Card>)}{user.role === 'ADMIN' && <Card><Copy>Available admin permissions</Copy><Copy>{['ORDERS', 'OPERATIONS', 'CUSTOMERS', 'PROMOTIONS', 'REPORTS', 'SETTINGS', 'ADMIN_ACCESS'].filter(p => hasPermission(user, p)).join(' · ')}</Copy></Card>}<Copy>Booking and order action screens are scheduled for the next implementation phases.</Copy><Button onPress={() => router.push('/account')}>Account and security</Button></Screen>;
}
