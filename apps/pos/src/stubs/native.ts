import { ReceiptLine } from '@kasse/core';

export const PaymentPlugin = {
  async initialize() { console.log('PaymentPlugin.initialize (mock)'); },
  async collect(amountCents: number) { console.log('collect', amountCents); },
  async cancel() { console.log('cancel'); },
};

export const PrinterPlugin = {
  async connect(opts: { kind: 'bt'|'usb'|'lan'; address?: string }) { console.log('connect', opts); },
  async print(lines: ReceiptLine[]) { console.log('print', lines); },
};
