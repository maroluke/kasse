import { ReceiptLine } from '@kasse/core';
import { EpsonEpos } from 'capacitor-plugin-epson-epos';
import { getSettings } from '../settings';

export const PrinterPlugin = {
  async connect(opts: { kind: 'bt'|'usb'|'lan'; address?: string }) {
    console.log('Connecting to printer:', opts);
    
    const settings = getSettings();
    const printerAddress = settings.printer_ip?.trim();
    
    if (!printerAddress) {
      throw new Error('Keine Drucker-Adresse konfiguriert');
    }
    
    // Test connection with a simple print job
    const testResult = await EpsonEpos.print({
      target: `TCP:${printerAddress}`,
      instructions: [{ addText: { value: 'Connection Test OK' } }],
      modelCode: 'TM_M30III',
      langCode: 'ANK'
    });
    
    if (!testResult.success) {
      throw new Error(`Verbindung fehlgeschlagen: ${JSON.stringify(testResult)}`);
    }
    
    return { success: true, message: 'Drucker erfolgreich verbunden' };
  },

  async print(lines: ReceiptLine[]) {
    console.log('Printing receipt:', lines);
    
    const settings = getSettings();
    const printerAddress = settings.printer_ip?.trim();
    
    if (!printerAddress) {
      throw new Error('Keine Drucker-Adresse konfiguriert');
    }
    
    // Build print instructions for Epson SDK
    const instructions: any[] = [];
    
    for (const line of lines) {
      if (line.type === 'title') {
        instructions.push({
          addTextAlign: 'center',
          addTextSize: [1, 1], // Smaller text size
          addTextStyle: { em: true },
          addText: { value: line.text || '' }
        });
        instructions.push({ addFeedLine: 1 });
      } else if (line.type === 'text') {
        instructions.push({
          addTextAlign: 'left',
          addText: { value: line.text || '' }
        });
        instructions.push({ addFeedLine: 1 });
      } else if (line.type === 'hr') {
        instructions.push({
          addText: { value: '--------------------------------' }
        });
        instructions.push({ addFeedLine: 1 });
      } else if (line.type === 'qr') {
        instructions.push({
          addTextAlign: 'center',
          addQRCode: { value: line.data || '' }
        });
        instructions.push({ addFeedLine: 1 });
      }
    }
    
    instructions.push({ addFeedLine: 3 });
    instructions.push({ addCut: { type: 'feed' } });
    
    console.log('Print instructions:', instructions);
    
    // Send print job using native EpsonEpos SDK
    const result = await EpsonEpos.print({
      target: `TCP:${printerAddress}`,
      instructions: instructions,
      modelCode: 'TM_M30III',
      langCode: 'ANK'
    });
    
    console.log('Print result:', result);
    
    if (!result.success) {
      throw new Error(`Druck fehlgeschlagen: ${JSON.stringify(result)}`);
    }
    
    return { success: true, result: result };
  }
};
