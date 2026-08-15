import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nano Banana Bridge",
  description: "MCP bridge for Gemini image generation on Vercel",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
