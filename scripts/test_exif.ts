import { extractGPSFromJPEG } from "../lib/exif";

// Helper to create a mock JPEG with EXIF metadata, including type configuration and datum
function createMockGeotaggedJPEG(
  lat: number,
  lng: number,
  latRef: string,
  lngRef: string,
  latTagType: number = 5, // 5 = RATIONAL
  lngTagType: number = 5,
  datum: string | null = null
): ArrayBuffer {
  const buffer = new ArrayBuffer(600);
  const view = new DataView(buffer);

  // JPEG SOI
  view.setUint16(0, 0xFFD8);

  // APP1 Marker
  view.setUint8(2, 0xFF);
  view.setUint8(3, 0xE1);

  // APP1 Length (say, 500 bytes)
  view.setUint16(4, 500);

  // EXIF Header
  view.setUint32(6, 0x45786966); // "Exif"
  view.setUint16(10, 0x0000);    // "\0\0"

  // TIFF Header (Little Endian "II")
  const tiffOffset = 12;
  view.setUint16(tiffOffset, 0x4949); // Little Endian
  view.setUint16(tiffOffset + 2, 0x002A, true); // Magic 42
  view.setUint32(tiffOffset + 4, 8, true); // Offset of 0th IFD

  // 0th IFD (at tiffOffset + 8 = 20)
  const ifd0Offset = tiffOffset + 8;
  view.setUint16(ifd0Offset, 1, true); // 1 entry

  // 0th IFD Entry 1: GPS Info IFD Pointer (Tag 0x8825)
  const entry0Offset = ifd0Offset + 2;
  view.setUint16(entry0Offset, 0x8825, true); // Tag
  view.setUint16(entry0Offset + 2, 4, true);  // Type: LONG (4)
  view.setUint32(entry0Offset + 4, 1, true);  // Count: 1
  view.setUint32(entry0Offset + 8, 40, true); // GPS IFD Offset: 40 bytes from TIFF header

  // GPS IFD (at tiffOffset + 40 = 52)
  const gpsIfdOffset = tiffOffset + 40;
  const numGpsEntries = datum ? 5 : 4;
  view.setUint16(gpsIfdOffset, numGpsEntries, true);

  // Helper to convert DD to DMS
  const ddToDms = (dd: number): number[] => {
    const abs = Math.abs(dd);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = Math.round((abs - d - m / 60) * 3600 * 100);
    return [d, 1, m, 1, s, 100]; // numerator, denominator
  };

  const latDms = ddToDms(lat);
  const lngDms = ddToDms(lng);

  // Rational data starts after GPS IFD entries
  const rationalDataOffset = gpsIfdOffset + 2 + numGpsEntries * 12 + 8;

  // Tag 1: GPSLatitudeRef (Tag 0x0001, ASCII, Count 2)
  const tag1Offset = gpsIfdOffset + 2;
  view.setUint16(tag1Offset, 0x0001, true);
  view.setUint16(tag1Offset + 2, 2, true); // ASCII
  view.setUint32(tag1Offset + 4, 2, true); // Count: 2
  view.setUint8(tag1Offset + 8, latRef.charCodeAt(0));
  view.setUint8(tag1Offset + 9, 0);

  // Tag 2: GPSLatitude (Tag 0x0002)
  const tag2Offset = tag1Offset + 12;
  view.setUint16(tag2Offset, 0x0002, true);
  view.setUint16(tag2Offset + 2, latTagType, true); // Type (usually 5 = RATIONAL)
  view.setUint32(tag2Offset + 4, 3, true); // Count 3
  view.setUint32(tag2Offset + 8, rationalDataOffset - tiffOffset, true); // Offset from TIFF header

  // Write GPSLatitude rational data
  let currentRatOffset = rationalDataOffset;
  for (let i = 0; i < 6; i++) {
    view.setUint32(currentRatOffset, latDms[i], true);
    currentRatOffset += 4;
  }

  // Tag 3: GPSLongitudeRef (Tag 0x0003, ASCII, Count 2)
  const tag3Offset = tag2Offset + 12;
  view.setUint16(tag3Offset, 0x0003, true);
  view.setUint16(tag3Offset + 2, 2, true); // ASCII
  view.setUint32(tag3Offset + 4, 2, true); // Count 2
  view.setUint8(tag3Offset + 8, lngRef.charCodeAt(0));
  view.setUint8(tag3Offset + 9, 0);

  // Tag 4: GPSLongitude (Tag 0x0004)
  const tag4Offset = tag3Offset + 12;
  view.setUint16(tag4Offset, 0x0004, true);
  view.setUint16(tag4Offset + 2, lngTagType, true); // Type (usually 5 = RATIONAL)
  view.setUint32(tag4Offset + 4, 3, true); // Count 3
  view.setUint32(tag4Offset + 8, currentRatOffset - tiffOffset, true); // Offset from TIFF header

  // Write GPSLongitude rational data
  for (let i = 0; i < 6; i++) {
    view.setUint32(currentRatOffset, lngDms[i], true);
    currentRatOffset += 4;
  }

  // Tag 5 (Optional): GPSMapDatum (Tag 0x0012, ASCII)
  if (datum) {
    const tag5Offset = tag4Offset + 12;
    view.setUint16(tag5Offset, 0x0012, true);
    view.setUint16(tag5Offset + 2, 2, true); // ASCII
    view.setUint32(tag5Offset + 4, datum.length + 1, true); // Count including null-terminator
    
    if (datum.length <= 3) {
      // Inline
      for (let j = 0; j < datum.length; j++) {
        view.setUint8(tag5Offset + 8 + j, datum.charCodeAt(j));
      }
      view.setUint8(tag5Offset + 8 + datum.length, 0);
    } else {
      // Offset-based
      view.setUint32(tag5Offset + 8, currentRatOffset - tiffOffset, true);
      for (let j = 0; j < datum.length; j++) {
        view.setUint8(currentRatOffset, datum.charCodeAt(j));
        currentRatOffset++;
      }
      view.setUint8(currentRatOffset, 0);
      currentRatOffset++;
    }
  }

  return buffer;
}

// Set up tests
console.log("--- RUNNING EXIF GPS PARSING TESTS ---");

// Test 1: Valid WGS-84/GPS coordinates with type RATIONAL (5)
console.log("\n[Test 1] Valid WGS-84 coordinates...");
const buffer1 = createMockGeotaggedJPEG(10.8505, 76.2711, "N", "E", 5, 5, "WGS-84");
const coords1 = extractGPSFromJPEG(buffer1);
console.log("Parsed Coords:", coords1);
if (coords1 && Math.abs(coords1.lat - 10.8505) < 0.001 && Math.abs(coords1.lng - 76.2711) < 0.001) {
  console.log("✅ Test 1 Passed!");
} else {
  console.error("❌ Test 1 Failed!");
}

// Test 2: Invalid tag type (not type 5)
console.log("\n[Test 2] Invalid tag type (type 4 instead of 5)...");
const buffer2 = createMockGeotaggedJPEG(10.8505, 76.2711, "N", "E", 4, 5, "WGS-84");
const coords2 = extractGPSFromJPEG(buffer2);
console.log("Parsed Coords (should be null):", coords2);
if (coords2 === null) {
  console.log("✅ Test 2 Passed!");
} else {
  console.error("❌ Test 2 Failed!");
}

// Test 3: Unsupported GPSMapDatum (should log a console warning)
console.log("\n[Test 3] Unsupported GPSMapDatum (Tokyo Datum)...");
let warningLogged = false;
const originalWarn = console.warn;
console.warn = (msg) => {
  warningLogged = true;
  originalWarn(msg);
};

const buffer3 = createMockGeotaggedJPEG(10.8505, 76.2711, "N", "E", 5, 5, "TOKYO");
const coords3 = extractGPSFromJPEG(buffer3);
console.warn = originalWarn;

console.log("Parsed Coords:", coords3);
if (coords3 && Math.abs(coords3.lat - 10.8505) < 0.001 && warningLogged) {
  console.log("✅ Test 3 Passed (Warning logged and coordinates returned)!");
} else {
  console.error("❌ Test 3 Failed!");
}

// Test 4: Swapped coordinates (e.g. lat = 76.2711, lng = 10.8505)
console.log("\n[Test 4] Swapped coordinates [longitude, latitude] order...");
const buffer4 = createMockGeotaggedJPEG(76.2711, 10.8505, "N", "E", 5, 5, "WGS-84");
const coords4 = extractGPSFromJPEG(buffer4);
console.log("Parsed Coords (should be swapped to lat: 10.8505, lng: 76.2711):", coords4);
if (coords4 && Math.abs(coords4.lat - 10.8505) < 0.001 && Math.abs(coords4.lng - 76.2711) < 0.001) {
  console.log("✅ Test 4 Passed (Coordinates auto-swapped successfully)!");
} else {
  console.error("❌ Test 4 Failed!");
}

