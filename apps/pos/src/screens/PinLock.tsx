import React from 'react';
import { verifyPin } from '../settings';

export function PinLock() {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  function unlock(ok: boolean) {
    if (ok) {
      try { localStorage.setItem('pos_unlocked', 'true'); } catch {}
      try { localStorage.setItem('pos_active_staff_pin', pin); } catch {}
      // refresh to trigger guards
      window.location.replace('/');
    } else {
      setError('Falsche PIN');
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs bg-white border rounded-lg shadow p-6">
        <h1 className="text-xl font-bold mb-4 text-center">PIN erforderlich</h1>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          className="w-full border rounded px-3 py-2 mb-3"
          placeholder="PIN eingeben"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') unlock(verifyPin(pin)); }}
        />
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <button
          className="w-full bg-gray-800 text-white rounded px-3 py-2"
          onClick={() => unlock(verifyPin(pin))}
        >
          Entsperren
        </button>
      </div>
    </div>
  );
}
