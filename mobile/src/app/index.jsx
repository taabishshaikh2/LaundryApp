import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { homeFor } from '../contracts';
import { Screen, Copy, Button, ErrorMessage } from '../components/ui';
export default function Index() { const { user, loading, startupError, restore } = useAuth(); if (loading) return <Screen title="Welcome back"><Copy>Restoring your secure session…</Copy></Screen>; if (startupError) return <Screen title="Let’s reconnect"><ErrorMessage message={startupError} /><Button onPress={restore}>Try again</Button></Screen>; return <Redirect href={homeFor(user)} />; }
