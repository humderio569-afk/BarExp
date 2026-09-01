// High-precision SVG Barcode Renderer and Generator (Code128 & EAN-13 compatible)
// Generates clean, crisp vector barcodes ready for printing and scanning without external CDN dependencies

/**
 * Generates a valid standard 13-digit EAN-13 code with checksum
 */
export function generateEAN13Barcode(prefix: string = '200'): string {
  // Prefix 200 is the international GS1 standard prefix reserved for internal store barcodes (in-store retail)
  const cleanPrefix = (prefix || '200').slice(0, 3).padEnd(3, '0');
  const random9Digits = Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
  const raw12 = cleanPrefix + random9Digits;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(raw12[i], 10) || 0;
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return raw12 + checkDigit.toString();
}

/**
 * Code 128 / EAN Patterns Table (Encoding characters into black/white bar patterns)
 */
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '23311120'
];

/**
 * Generates an SVG string representation of a barcode for printing and displaying
 */
export function generateBarcodeSvgPath(code: string): { paths: string; width: number; height: number } {
  const cleanCode = (code || '000000000000').trim().toUpperCase();
  const barHeight = 60;
  const quietZone = 10;
  let cursor = quietZone;

  const rects: string[] = [];

  // Start pattern (Code 128 Start B = index 104)
  const startPattern = CODE128_PATTERNS[104];
  let isBar = true;
  for (const digit of startPattern) {
    const width = parseInt(digit, 10) * 1.5;
    if (isBar) {
      rects.push(`<rect x="${cursor}" y="0" width="${width}" height="${barHeight}" fill="#000000" />`);
    }
    cursor += width;
    isBar = !isBar;
  }

  // Encode each character (ASCII 32 to 126 -> index 0 to 94)
  let checksum = 104;
  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    const patternIndex = Math.max(0, Math.min(102, charCode >= 32 ? charCode - 32 : 0));
    checksum += patternIndex * (i + 1);

    const pattern = CODE128_PATTERNS[patternIndex] || CODE128_PATTERNS[0];
    isBar = true;
    for (const digit of pattern) {
      const width = parseInt(digit, 10) * 1.5;
      if (isBar) {
        rects.push(`<rect x="${cursor}" y="0" width="${width}" height="${barHeight}" fill="#000000" />`);
      }
      cursor += width;
      isBar = !isBar;
    }
  }

  // Checksum char
  const checkIndex = checksum % 103;
  const checkPattern = CODE128_PATTERNS[checkIndex] || CODE128_PATTERNS[0];
  isBar = true;
  for (const digit of checkPattern) {
    const width = parseInt(digit, 10) * 1.5;
    if (isBar) {
      rects.push(`<rect x="${cursor}" y="0" width="${width}" height="${barHeight}" fill="#000000" />`);
    }
    cursor += width;
    isBar = !isBar;
  }

  // Stop pattern (index 106)
  const stopPattern = CODE128_PATTERNS[106];
  isBar = true;
  for (const digit of stopPattern) {
    const width = parseInt(digit, 10) * 1.5;
    if (isBar) {
      rects.push(`<rect x="${cursor}" y="0" width="${width}" height="${barHeight}" fill="#000000" />`);
    }
    cursor += width;
    isBar = !isBar;
  }

  cursor += quietZone;

  return {
    paths: rects.join(''),
    width: Math.ceil(cursor),
    height: barHeight,
  };
}
