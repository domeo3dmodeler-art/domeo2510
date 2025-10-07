import '../globals.css'
import React from 'react'
export const metadata = { title: 'Domeo', description: 'No‑Code Calculators MVP' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru"><body className="min-h-screen bg-neutral-50 text-neutral-900">{children}</body></html>
  )
}
