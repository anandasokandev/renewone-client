import QRCode from 'qrcode';

/**
 * Standard, ISO/IEC 18004 Compliant QR Code Generator
 * Powered by 'qrcode' library for 100% scanner compatibility across
 * Google Pay, PhonePe, Paytm, BHIM, and all mobile camera scanners.
 */
export class QRCodeGenerator {
  /**
   * Generates a fully compliant, standard ISO 18004 SVG QR code string synchronously.
   */
  public static generateSvg(text: string, sizePx: number = 220, margin: number = 4): string {
    if (!text) return '';
    let svg = '';
    try {
      QRCode.toString(
        text,
        {
          type: 'svg',
          width: sizePx,
          margin: margin,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        },
        (err, result) => {
          if (!err && result) {
            svg = result;
          }
        }
      );
    } catch (e) {
      console.warn('QRCode generateSvg error:', e);
    }
    return svg;
  }

  /**
   * Generates a high-quality Base64 PNG Data URL for standard <img [src]="..."> display.
   * This is the gold standard for reliable, instantaneous scanning on all smartphone cameras.
   */
  public static async generateDataUrl(
    text: string,
    width: number = 260,
    margin: number = 4
  ): Promise<string> {
    if (!text) return '';
    try {
      return await QRCode.toDataURL(text, {
        width,
        margin,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    } catch (e) {
      console.warn('QRCode generateDataUrl error:', e);
      return '';
    }
  }
}
