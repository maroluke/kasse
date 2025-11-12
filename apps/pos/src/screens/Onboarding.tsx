import React from 'react';
import { PrinterPlugin } from '../printer/PrinterPlugin';
import { saveSettings, getSettings } from '../settings';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = React.useState(1);
  const [printerIp, setPrinterIp] = React.useState('');
  const [isTesting, setIsTesting] = React.useState(false);

  async function testPrinter() {
    if (!printerIp.trim()) {
      alert('Bitte Drucker-IP eingeben');
      return;
    }

    setIsTesting(true);
    try {
      await PrinterPlugin.connect({ kind: 'lan', address: printerIp.trim() });
      alert('Drucker erfolgreich verbunden!');
      setStep(2);
    } catch (e: any) {
      alert('Verbindung fehlgeschlagen: ' + e.message);
    } finally {
      setIsTesting(false);
    }
  }

  async function completeSetup() {
    // Save printer IP to settings
    const currentSettings = getSettings();
    saveSettings({ ...currentSettings, printer_ip: printerIp.trim() });
    onComplete();
  }

  return (
    <div className="p-4 max-w-md mx-auto h-full flex flex-col justify-center">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Kasse Setup</h1>
        <p className="text-muted-foreground">Richten Sie Ihren Drucker ein</p>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Schritt 1: Drucker verbinden</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Drucker IP-Adresse
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-3 text-sm"
                  placeholder="z.B. 192.168.1.100"
                  value={printerIp}
                  onChange={(e) => setPrinterIp(e.target.value)}
                />
              </div>
              
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                <strong>Tipp:</strong> Die IP-Adresse finden Sie auf dem Drucker-Display oder in Ihrem Router-Admin-Panel unter "verbundene Geräte".
              </div>
            </div>
          </div>

          <button
            className="touch-button w-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            onClick={testPrinter}
            disabled={isTesting || !printerIp.trim()}
          >
            {isTesting ? 'Verbindung wird getestet...' : 'Drucker testen'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2">Drucker verbunden!</h2>
            <p className="text-muted-foreground">Ihr Drucker ({printerIp}) ist bereit.</p>
          </div>

          <button
            className="touch-button w-full bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            onClick={completeSetup}
          >
            Setup abschliessen
          </button>
        </div>
      )}
    </div>
  );
}
