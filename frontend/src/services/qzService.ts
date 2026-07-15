/**
 * qzService.ts
 * Servicio de comunicación con QZ Tray para impresión directa vía ESC/POS.
 *
 * QZ Tray crea un WebSocket local (wss://localhost:8181) que recibe
 * comandos de la app web y los envía directamente al driver de la impresora.
 * Esto evita que el navegador rasterice el SVG, garantizando barras precisas.
 *
 * REQUISITOS EN LA PC DEL CLIENTE:
 *   1. Instalar QZ Tray (qz.io) — corre en segundo plano.
 *   2. En QZ Tray → Advanced → Allow unsigned requests: ON
 *      (para no requerir certificado digital en esta versión)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const qz: any;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface QzLabelData {
  size: string;
  barcode: string; // Código numérico, ej. "00000042"
  price: number;
}

export type QzStatus = 'unavailable' | 'disconnected' | 'connecting' | 'connected' | 'error';

// ─── ESC/POS helpers ──────────────────────────────────────────────────────────

const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

/** Convierte un string ASCII en array de bytes (ya no se usa, pero se deja por si acaso) */
function toBytes(text: string): number[] {
  return Array.from(text).map(c => c.charCodeAt(0));
}

/**
 * Genera los comandos TSPL para UNA etiqueta 40×30 mm en el Marklife P50.
 * La mayoría de las impresoras de etiquetas modernas usan TSPL o CPCL, no ESC/POS.
 */
function buildLabelTSPL(label: QzLabelData): string {
  // Ajustes de tamaño y limpieza de buffer
  let tspl = `SIZE 40 mm, 30 mm\r\n`;
  tspl += `GAP 2 mm, 0 mm\r\n`;
  tspl += `DIRECTION 1\r\n`;
  tspl += `CLS\r\n`; // Clear screen

  // Talla: x=20, y=20, font="3"
  tspl += `TEXT 20,20,"3",0,1,1,"Size: ${label.size}"\r\n`;

  // Código de barras: x=20, y=70, code="39", height=70, readable=0 (none), rotation=0, narrow=2, wide=4
  const barcodeUpper = label.barcode.toUpperCase();
  tspl += `BARCODE 20,70,"39",70,0,0,2,4,"${barcodeUpper}"\r\n`;

  // Texto legible del código abajo
  tspl += `TEXT 20,150,"2",0,1,1,"${barcodeUpper}"\r\n`;

  // Precio: x=20, y=190, font="4" (más grande)
  tspl += `TEXT 20,190,"4",0,1,1,"$${label.price}"\r\n`;

  // Imprimir 1 copia
  tspl += `PRINT 1,1\r\n`;

  return tspl;
}

// ─── Servicio público ─────────────────────────────────────────────────────────

export const qzService = {
  /** Verifica si la librería qz-tray.js fue cargada en la página */
  isLoaded(): boolean {
    return typeof (window as any).qz !== 'undefined';
  },

  /** Verifica si el WebSocket con QZ Tray está activo */
  isConnected(): boolean {
    if (!this.isLoaded()) return false;
    try { return qz.websocket.isActive(); } catch { return false; }
  },

  /**
   * Conecta al WebSocket local de QZ Tray.
   */
  async connect(): Promise<void> {
    if (!this.isLoaded()) {
      throw new Error(
        'La librería de QZ Tray no está disponible. Verifica la conexión a internet (CDN) o recarga la página.'
      );
    }
    if (qz.websocket.isActive()) return;

    // Modo sin certificado (unsigned). QZ Tray debe tener "Block anonymous requests" desactivado.
    qz.security.setCertificatePromise((resolve: any) => {
      resolve(null); // null = sin certificado
    });
    qz.security.setSignatureAlgorithm('SHA512');
    qz.security.setSignaturePromise((_toSign: any) => (resolve: any) => {
      resolve(null); // null = sin firma
    });

    await qz.websocket.connect();
  },

  /** Desconecta el WebSocket */
  async disconnect(): Promise<void> {
    if (this.isConnected()) {
      await qz.websocket.disconnect();
    }
  },

  /**
   * Retorna la lista de impresoras disponibles en el sistema.
   */
  async listPrinters(): Promise<string[]> {
    const result = await qz.printers.find(); // Sin argumentos = todas
    if (Array.isArray(result)) return result as string[];
    return result ? [result as string] : [];
  },

  /**
   * Busca la primera impresora cuyo nombre contenga el término dado.
   */
  async findPrinter(term: string): Promise<string | null> {
    try {
      const result = await qz.printers.find(term);
      if (Array.isArray(result)) return result[0] ?? null;
      return result ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Imprime un lote de etiquetas directamente vía TSPL.
   */
  async printLabels(labels: QzLabelData[], printer: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('QZ Tray no está conectado. Conéctalo primero.');
    }
    if (!printer) {
      throw new Error('Selecciona una impresora antes de imprimir.');
    }
    if (labels.length === 0) {
      throw new Error('No hay etiquetas en el lote.');
    }

    const config = qz.configs.create(printer);

    // Concatenar todos los comandos TSPL
    let allTSPL = '';
    for (const lbl of labels) {
      allTSPL += buildLabelTSPL(lbl);
    }

    await qz.print(config, [{
      type: 'raw',
      format: 'plain',
      data: allTSPL,
    }]);
  },
};
