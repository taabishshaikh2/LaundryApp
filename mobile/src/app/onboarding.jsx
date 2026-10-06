import React, { useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { Screen, Card, Copy, Button, ErrorMessage } from '../components/ui';
const questions = [
  ['monthlySpendBand', 'Monthly laundry spending', ['Nothing – we do it at home', 'Under ₹300', '₹300–800', '₹800–1,500', '₹1,500+']],
  ['frustrations', 'What could be better?', ['Too expensive', 'Takes too many days', 'No pickup & delivery', 'Clothes damaged, lost, or poorly cleaned', 'No reliable option nearby', "Nothing – I'm satisfied"]],
  ['wouldUsePriority', 'Would you use faster pickup and delivery?', ['Yes, definitely', 'Yes, for urgent needs', 'Maybe', 'No']],
  ['mostUsedService', 'Which would you use most?', ['2-hr dry cleaning', '2-hr steam ironing', '3-4 hr wash & fold', 'All of them']],
];
export default function Onboarding() {
  const { user, loading, client } = useAuth(); const [answers, setAnswers] = useState({ frustrations: [] }); const [step, setStep] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (loading) return <Screen title="Loading…" />; if (!user) return <Redirect href="/login" />; if (user.role !== 'CUSTOMER' || user.onboarding?.completed) return <Redirect href="/dashboard" />;
  const [key, title, options] = questions[step]; const selected = value => key === 'frustrations' ? answers.frustrations.includes(value) : answers[key] === value;
  async function save(skip) { setBusy(true); setError(''); try { await client.call('/auth/onboarding', skip ? {} : answers, 'PUT'); await client.updateUser(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <Screen title="A little about your laundry" subtitle={`Question ${step + 1} of 4`}><Card><Copy>{title}</Copy>{options.map(value => <Button key={value} secondary={!selected(value)} disabled={busy} onPress={() => setAnswers(a => ({ ...a, [key]: key === 'frustrations' ? selected(value) ? a.frustrations.filter(x => x !== value) : [...a.frustrations, value] : value }))}>{value}</Button>)}<ErrorMessage message={error} /><Button busy={busy} disabled={key === 'frustrations' ? !answers.frustrations.length : !answers[key]} onPress={() => step < 3 ? setStep(step + 1) : save(false)}>{step < 3 ? 'Continue' : 'Save preferences'}</Button>{step > 0 && <Button secondary disabled={busy} onPress={() => setStep(step - 1)}>Previous</Button>}</Card><Button secondary disabled={busy} onPress={() => save(true)}>Skip for now</Button></Screen>;
}
