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
  console.log("✓ Order created in SheetDB");
  // return resp.json();
}

export async function findOrderRowNumber(orderCode: string) {
  if (!SHEETDB_URL) throw new Error("SHEETDB_URL is not configured");
  const url = `${SHEETDB_URL}/search?order_code=${encodeURIComponent(
    orderCode,
  )}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SheetDB search error: ${resp.status} ${txt}`);
  }
  const json = await resp.json();
  if (!Array.isArray(json)) {
    throw new Error("Invalid SheetDB response: expected an array");
  }
  const data = json as Array<Record<string, unknown>>;
  const row = data[0]?.row_number;
  // всегда null возвращает
  return typeof row === "number" ? row : null;
  // return data[0]?.row_number || null;
}

export async function getOrderByCode(orderCode: string) {
  if (!SHEETDB_URL) throw new Error("SHEETDB_URL is not configured");
  const url = `${SHEETDB_URL}/search?order_code=${encodeURIComponent(
    orderCode,
  )}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SheetDB search error: ${resp.status} ${txt}`);
  }
  const json = await resp.json();
  if (!Array.isArray(json) || !json.length) return null;
  return json[0];
}

export async function getAllOrders() {
  if (!SHEETDB_URL) throw new Error("SHEETDB_URL is not configured");
  const resp = await fetch(SHEETDB_URL);
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SheetDB error: ${resp.status} ${txt}`);
  }
  const json = await resp.json();
  if (!Array.isArray(json)) {
    throw new Error("Invalid SheetDB response: expected an array");
  }
  return json;
}

export async function updateOrder(
  orderCode: string,
  updates: Record<string, unknown>,
) {
  if (!SHEETDB_URL) throw new Error("SHEETDB_URL is not configured");
  const url = `${SHEETDB_URL}/order_code/${encodeURIComponent(orderCode)}`;
  const resp = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: updates }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`SheetDB update error: ${resp.status} ${txt}`);
  }
  console.log(`✓ Order ${orderCode} updated in SheetDB`);
}
