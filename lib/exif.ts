export interface GPSCoords {
  lat: number;
  lng: number;
}

/**
 * Extracts GPS coordinates from a JPEG file's ArrayBuffer.
 * Returns null if the image is not a JPEG, does not contain EXIF metadata, or lacks GPS tags.
 */
export function extractGPSFromJPEG(buffer: ArrayBuffer): GPSCoords | null {
  const dataView = new DataView(buffer);

  // Check JPEG SOI marker (0xFFD8)
  if (buffer.byteLength < 4 || dataView.getUint16(0) !== 0xFFD8) {
    return null;
  }

  const length = dataView.byteLength;
  let offset = 2;

  while (offset < length - 2) {
    // Markers must start with 0xFF
    if (dataView.getUint8(offset) !== 0xFF) {
      return null;
    }

    const marker = dataView.getUint8(offset + 1);
    
    // APP1 marker (0xFFE1) contains EXIF data
    if (marker === 0xE1) {
      return parseEXIF(dataView, offset + 4);
    }
    
    // Ignore SOI, TEM, RST markers (they don't have a length parameter)
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      offset += 2;
    } else {
      const markerLength = dataView.getUint16(offset + 2);
      offset += 2 + markerLength;
    }
  }

  return null;
}

function parseEXIF(view: DataView, offset: number): GPSCoords | null {
  // Check Exif header: "Exif\0\0" (0x457869660000)
  if (
    offset + 6 > view.byteLength ||
    view.getUint32(offset) !== 0x45786966 || // "Exif"
    view.getUint16(offset + 4) !== 0x0000     // "\0\0"
  ) {
    return null;
  }

  const tiffOffset = offset + 6;
  if (tiffOffset + 8 > view.byteLength) return null;

  // TIFF Header
  const byteOrder = view.getUint16(tiffOffset);
  const isLittleEndian = byteOrder === 0x4949; // "II" (Intel) vs "MM" (Motorola, Big Endian)
  if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) {
    return null;
  }

  const magic = view.getUint16(tiffOffset + 2, isLittleEndian);
  if (magic !== 0x002A) {
    return null; // Invalid TIFF magic
  }

  const firstIFDOffset = view.getUint32(tiffOffset + 4, isLittleEndian);
  let ifdOffset = tiffOffset + firstIFDOffset;

  if (ifdOffset + 2 > view.byteLength) return null;

  // Read 0th IFD
  const entriesCount = view.getUint16(ifdOffset, isLittleEndian);
  let gpsInfoOffset = 0;

  for (let i = 0; i < entriesCount; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) return null;

    const tag = view.getUint16(entryOffset, isLittleEndian);
    if (tag === 0x8825) { // GPS Info IFD Pointer tag
      gpsInfoOffset = view.getUint32(entryOffset + 8, isLittleEndian);
      break;
    }
  }

  if (gpsInfoOffset === 0) {
    return null; // No GPS IFD tags found
  }

  const gpsIFD = tiffOffset + gpsInfoOffset;
  if (gpsIFD + 2 > view.byteLength) return null;

  const gpsEntriesCount = view.getUint16(gpsIFD, isLittleEndian);

  let latRef: string | null = null;
  let latVal: number[] | null = null;
  let lngRef: string | null = null;
  let lngVal: number[] | null = null;
  let gpsMapDatum = "";

  for (let i = 0; i < gpsEntriesCount; i++) {
    const entryOffset = gpsIFD + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) return null;

    const tag = view.getUint16(entryOffset, isLittleEndian);
    const type = view.getUint16(entryOffset + 2, isLittleEndian);
    const count = view.getUint32(entryOffset + 4, isLittleEndian);
    const valueOffset = view.getUint32(entryOffset + 8, isLittleEndian);

    console.log(`[EXIF Debug] Tag: 0x${tag.toString(16).padStart(4, "0")}, Type: ${type}, Count: ${count}, ValueOffset: ${valueOffset}`);

    if (tag === 0x0001) { // GPSLatitudeRef
      const startOffset = count <= 4 ? (entryOffset + 8) : (tiffOffset + valueOffset);
      if (startOffset < view.byteLength) {
        latRef = String.fromCharCode(view.getUint8(startOffset));
      }
    } else if (tag === 0x0002 && (type === 5 || type === 10)) { // GPSLatitude (RATIONAL or SRATIONAL)
      latVal = readRationalArray(view, tiffOffset + valueOffset, count, isLittleEndian);
    } else if (tag === 0x0003) { // GPSLongitudeRef
      const startOffset = count <= 4 ? (entryOffset + 8) : (tiffOffset + valueOffset);
      if (startOffset < view.byteLength) {
        lngRef = String.fromCharCode(view.getUint8(startOffset));
      }
    } else if (tag === 0x0004 && (type === 5 || type === 10)) { // GPSLongitude (RATIONAL or SRATIONAL)
      lngVal = readRationalArray(view, tiffOffset + valueOffset, count, isLittleEndian);
    } else if (tag === 0x0012 && type === 2) { // GPSMapDatum (ASCII)
      const startOffset = count <= 4 ? (entryOffset + 8) : (tiffOffset + valueOffset);
      let datumStr = "";
      for (let j = 0; j < count; j++) {
        if (startOffset + j >= view.byteLength) break;
        const charCode = view.getUint8(startOffset + j);
        if (charCode === 0) break; // null-terminator
        datumStr += String.fromCharCode(charCode);
      }
      gpsMapDatum = datumStr.trim();
    }
  }

  console.log(`[EXIF Debug] Results - latRef: ${latRef}, latVal: ${latVal ? JSON.stringify(latVal) : "null"}, lngRef: ${lngRef}, lngVal: ${lngVal ? JSON.stringify(lngVal) : "null"}, datum: ${gpsMapDatum}`);

  if (latRef && latVal && latVal.length >= 3 && lngRef && lngVal && lngVal.length >= 3) {
    let lat = convertDMSToDD(latVal, latRef);
    let lng = convertDMSToDD(lngVal, lngRef);
    
    // Check map datum projection compatibility
    if (
      gpsMapDatum &&
      gpsMapDatum.toUpperCase() !== "WGS-84" &&
      gpsMapDatum.toUpperCase() !== "WGS84"
    ) {
      console.warn(
        `Unsupported GPS datum: ${gpsMapDatum}. Coordinates are used as-is, but location shifts may occur.`
      );
    }

    // Auto-swap coordinates if they are in [longitude, latitude] order
    // India/Kerala bounds: Latitude ~[5, 40] (typically [8, 13]), Longitude ~[68, 98] (typically [74, 78])
    if (lat >= 68 && lat <= 98 && lng >= 5 && lng <= 40) {
      console.log(`[EXIF Debug] Detected swapped coordinates (lat: ${lat}, lng: ${lng}). Swapping to correct map projection.`);
      const temp = lat;
      lat = lng;
      lng = temp;
    }

    // Sanity check coordinates (lat range: -90 to 90, lng range: -180 to 180)
    if (Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

function readRationalArray(view: DataView, offset: number, count: number, isLittleEndian: boolean): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const itemOffset = offset + i * 8;
    if (itemOffset + 8 > view.byteLength) break;
    const num = view.getUint32(itemOffset, isLittleEndian);
    const den = view.getUint32(itemOffset + 4, isLittleEndian);
    result.push(den === 0 ? 0 : num / den);
  }
  return result;
}

function convertDMSToDD(dms: number[], ref: string): number {
  const d = dms[0] || 0;
  const m = dms[1] || 0;
  const s = dms[2] || 0;
  let dd = d + m / 60 + s / 3600;
  if (ref === "S" || ref === "W") {
    dd *= -1;
  }
  return dd;
}
