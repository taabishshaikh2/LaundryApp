import React, { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { homeFor, loginSchema } from '../contracts';
import { Screen, Card, Field, Button, ErrorMessage, Copy } from '../components/ui';
export default function Login() {
  const { user, loading, client } = useAuth();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [challenge, setChallenge] = useState(null); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (loading) return <Screen title="Restoring your session…" />;
  if (user) return <Redirect href={homeFor(user)} />;
  async function submit() { setError(''); setBusy(true); try { const data = challenge ? await client.signIn('/auth/2fa/verify-login', { challengeToken: challenge, code }) : await client.signIn('/auth/login', loginSchema.parse({ email, password })); if (data.requiresTwoFactor) { setChallenge(data.challengeToken); setPassword(''); } } catch (e) { setError(e.issues?.[0]?.message || e.message); } finally { setBusy(false); } }
  return <Screen title={challenge ? 'Verify your sign-in' : 'Fresh clothes. Clear mind.'} subtitle={challenge ? 'Enter an authenticator code or an unused recovery code.' : 'Sign in to your customer, rider, partner or admin account.'}><Card>{challenge ? <Field label="Authenticator or recovery code" value={code} onChangeText={setCode} autoComplete="one-time-code" /> : <><Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" /></>}<ErrorMessage message={error} /><Button busy={busy} onPress={submit}>{challenge ? 'Verify and sign in' : 'Sign in'}</Button>{challenge && <Button secondary disabled={busy} onPress={() => { setChallenge(null); setCode(''); setError(''); }}>Start again</Button>}</Card>{!challenge && <><Button secondary onPress={() => router.push('/register')}>Create an account</Button><Button secondary onPress={() => router.push('/forgot-password')}>Forgot password?</Button><Copy>Your existing Dhobi Ghat account works here.</Copy></>}</Screen>;
}
