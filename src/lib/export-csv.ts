export function escapeCsvValue(value: string | number | null | undefined) {
  if (value == null) {
    return "";
  }

  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];
  return lines.join("\r\n");
}
