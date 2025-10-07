// __tests__/exports.spec.ts
import { applyPricing } from "@/lib/doors/pricing";

describe("pricing & mapping spec", () => {
  it("applies kit + handle (retail rounded) and computes sums", () => {
    const cart = [
      {
        model: "PO Base 1/1",
        width: 800,
        height: 2000,
        color: "Белый",
        rrc_price: 22900,
        qty: 2,
        hardware_kit: { name: "Стандарт", price_rrc: 1500, group: "A" },
        handle: { name: "H-100", price_opt: 700, price_group_multiplier: 1.4 },
      },
    ];
    const rows = applyPricing(cart as any);
    const hRetail = Math.round(700 * 1.4);

    expect(rows[0].name_kp).toContain("PO Base 1/1");
    expect(rows[0].price_rrc_plus_kit).toBe(22900 + 1500);
    expect(rows[0].handle_price_rrc).toBe(hRetail);
    expect(rows[0].sum_rrc).toBe((22900 + 1500 + hRetail) * 2);
  });
});
