import rateCardSource from "../../data/rate_card.updated.csv?raw";

const splitCsvLine = (line) => {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const peek = line[i + 1];
      if (peek === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
};

const normalizeText = (value) =>
  value ? value.toString().trim().toLowerCase() : "";

const canonicalAlphaNumeric = (value) =>
  value ? value.toString().replace(/[^0-9a-z]/gi, "").toLowerCase() : "";

const canonicalSize = (value) => {
  if (!value) return "";
  const raw = value.toString().trim().toUpperCase();
  if (!raw) return "";
  if (
    raw.includes("P/UP") ||
    raw.includes("P-UP") ||
    raw.includes("PICK") ||
    raw.replace(/[^A-Z]/g, "") === "PUP"
  ) {
    return "PICKUP";
  }
  return raw.replace(/[^0-9A-Z]/g, "");
};

const parsedEntries = (() => {
  if (!rateCardSource) return [];
  const lines = rateCardSource
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return [];
  const [, ...rows] = lines;
  const entries = [];
  for (const row of rows) {
    const cells = splitCsvLine(row);
    if (cells.length < 7) continue;
    const [
      laneDescription,
      source,
      region,
      destination,
      truckSize,
      unused,
      rateRaw,
    ] = cells;
    const rate = parseFloat(rateRaw.replace(/,/g, ""));
    if (!laneDescription || !destination || !truckSize || Number.isNaN(rate)) {
      continue;
    }
    entries.push({
      laneDescription,
      source,
      region,
      destination,
      truckSize,
      unused,
      rate,
      destinationNormalized: normalizeText(destination),
      laneCanonical: canonicalAlphaNumeric(laneDescription),
      sizeCanonical: canonicalSize(truckSize),
    });
  }
  return entries;
})();

const sizesMatch = (entrySize, vehicleSize) => {
  if (!entrySize || !vehicleSize) return false;
  return (
    entrySize === vehicleSize ||
    entrySize.includes(vehicleSize) ||
    vehicleSize.includes(entrySize)
  );
};

export const getRateCardEntries = () => parsedEntries.slice();

export const findRateCardRate = ({
  destination,
  productType,
  vehicleSize,
  fallbackText = "",
}) => {
  if (!destination || !vehicleSize) return null;
  const destNorm = normalizeText(destination);
  const vehicleSizeCanonical = canonicalSize(vehicleSize);
  const productCanonical = canonicalAlphaNumeric(productType);
  const fallbackCanonical = canonicalAlphaNumeric(fallbackText);

  if (!vehicleSizeCanonical || !destNorm) return null;

  const matchBy = (token) =>
    parsedEntries.find(
      (entry) =>
        entry.destinationNormalized === destNorm &&
        sizesMatch(entry.sizeCanonical, vehicleSizeCanonical) &&
        (token ? entry.laneCanonical.includes(token) : true)
    );

  let match = null;
  if (productCanonical) {
    match = matchBy(productCanonical);
  }
  if (!match && fallbackCanonical) {
    match = matchBy(fallbackCanonical);
  }
  if (!match) {
    const candidates = parsedEntries.filter(
      (entry) =>
        entry.destinationNormalized === destNorm &&
        sizesMatch(entry.sizeCanonical, vehicleSizeCanonical)
    );
    if (candidates.length === 1) {
      match = candidates[0];
    }
  }
  if (!match) return null;
  return {
    rate: match.rate,
    entry: match,
  };
};
