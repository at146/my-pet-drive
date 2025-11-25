import fetch from "node-fetch";

const SHEETDB_URL = process.env.SHEETDB_URL;

if (!SHEETDB_URL) {
  console.warn("SHEETDB_URL not set in env; SheetDB operations will fail");
}

export async function createSheetOrder(order: any) {
  if (!SHEETDB_URL) throw new Error("SHEETDB_URL is not configured");
  const resp = await fetch(SHEETDB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [order] }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SheetDB error: ${resp.status} ${txt}`);
  }
  return resp.json();
}

export async function findOrderRowNumber(orderCode: string) {
  if (!SHEETDB_URL) throw new Error("SHEETDB_URL is not configured");
  const url = `${SHEETDB_URL}/search?order_code=${encodeURIComponent(orderCode)}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SheetDB search error: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  return data[0]?.row_number || null;
  // return null;
}
