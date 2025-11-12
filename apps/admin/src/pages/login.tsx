import React from 'react';
import { useAuth } from '../lib/AuthProvider';
import { Input, Button } from '@kasse/ui';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={onSubmit} className="w-[360px] grid gap-3 p-6 border rounded-lg bg-card text-card-foreground">
        <h1 className="text-xl font-semibold">Anmeldung</h1>
        <Input
          placeholder="E-Mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          placeholder="Passwort"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-red-600">{error}</div>}
        <Button type="submit" disabled={loading}>{loading ? 'Melde an…' : 'Anmelden'}</Button>
      </form>
    </div>
  );
}
