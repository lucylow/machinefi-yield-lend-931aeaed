/** Map human-readable device label to `BorrowFlow` `:type` param. */
export function deviceLabelToBorrowType(deviceType: string): string {
  const t = deviceType.toLowerCase();
  if (t.includes("helium")) return "helium";
  if (t.includes("hive")) return "hivemapper";
  if (t.includes("tesla") || t.includes("vehicle") || t.includes("ev")) return "tesla";
  return "depin";
}

export function borrowFlowPath(nftId: number, deviceType: string): string {
  return `/borrow/${deviceLabelToBorrowType(deviceType)}/${nftId}`;
}
