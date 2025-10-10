"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function DoorProductPage({ params }: { params: { sku: string } }) {
  const router = useRouter();
  const sku = decodeURIComponent(params.sku);
  const [data, setData] = useState<{ item: any; media: { relativePath: string }[] } | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let c = false;
    fetch(`/api/catalog/doors/${encodeURIComponent(sku)}`)
      .then((r) => r.json())
      .then((j) => !c && setData(j))
      .catch(() => !c && setData(null));
    return () => {
      c = true;
    };
  }, [sku]);

  const images = useMemo(
    () => (data?.media || []).map((m) => `/assets/doors/${m.relativePath}`),
    [data]
  );

  const addToCalc = () => {
    // теперь калькулятор живет на /doors
    const q = new URLSearchParams({ sku });
    router.push(`/doors?${q.toString()}`);
  };

  if (!data?.item)
    return <div className="max-w-4xl mx-auto p-6">Товар не найден</div>;

  const it = data.item;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[idx] || "/assets/doors/_placeholder.png"}
              alt={it.name}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  className={`w-16 h-20 object-cover rounded-lg border ${
                    i === idx ? "border-black" : "border-transparent"
                  }`}
                  onClick={() => setIdx(i)}
                  alt="thumb"
                />
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="text-xs text-gray-500">SKU: {sku}</div>
          <h1 className="text-2xl font-bold">{it.name}</h1>
          {it.series && (
            <div className="text-sm text-gray-600">Серия: {it.series}</div>
          )}
          <div className="text-3xl font-semibold">
            {it.basePrice
              ? new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: "RUB",
                  maximumFractionDigits: 0,
                }).format(it.basePrice)
              : "—"}
          </div>
          <div className="text-sm text-gray-600">
            Материал: {it.material || "—"}
          </div>
          <div className="text-sm text-gray-600">
            Отделка: {it.finish || "—"}
          </div>
          <div className="text-sm text-gray-600">
            Цвет: {it.color || "—"}
          </div>
          <div className="text-sm text-gray-600">
            Размеры: {it.widthMm || "—"}×{it.heightMm || "—"}×
            {it.thicknessMm || "—"} мм
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={addToCalc}
              className="px-4 py-2 rounded-xl bg-black text-white"
            >
              В расчёт
            </button>
            <a href="/catalog/doors" className="px-4 py-2 rounded-xl border">
              В каталог
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
