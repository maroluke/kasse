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
    <div className="h-full flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-lg border p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-2xl font-bold mb-2">PIN erforderlich</h1>
          <p className="text-muted-foreground text-sm">Geben Sie Ihre PIN ein, um die Kasse zu entsperren.</p>
        </div>
        
        <div className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full border rounded-lg px-4 py-3 text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => { 
              if (e.key === 'Enter') unlock(verifyPin(pin)); 
            }}
            autoFocus
          />
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}
          
          <button
            className="w-full touch-button bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-base"
            onClick={() => unlock(verifyPin(pin))}
          >
            Entsperren
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Konfigurieren Sie Ihre PIN in den Einstellungen
          </p>
        </div>
      </div>
    </div>
  );
}
