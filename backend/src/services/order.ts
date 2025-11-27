// Generate Order Code
export function generateOrderCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ====== ЗАМЕНИТЬ СТАРУЮ calculateCost() ЭТИМ КОДОМ ======
// routeData.distance в км
export function calculateCost(
  selectedTariff: "eco" | "opti" | "maxi",
  distance: number,
) {
  const prices = { eco: 75, opti: 105, maxi: 150 };
  const baseCost = distance * prices[selectedTariff];
  let totalCost, driverCost, shortDistanceFee;
  if (baseCost < 800) {
    // Минимальная подача 800₽ (уже с включённой комиссией 21%)
    shortDistanceFee = 800 - baseCost;
    totalCost = 800; // Фиксированная сумма
    driverCost = 632; // 79% от 800₽
  } else {
    // Обычный расчёт для поездок от 800₽
    shortDistanceFee = 0;
    const acquiring = Math.round(baseCost * 0.105); // 10.5%
    const service = Math.round(baseCost * 0.105); // 10.5%
    totalCost = baseCost + acquiring + service;
    driverCost = baseCost;
  }
  return { totalCost, driverCost, shortDistanceFee, baseCost };
}

// Strip phone to numeric format
export function stripPhone(phone: string) {
  return phone.replace(/\D/g, "");
}
