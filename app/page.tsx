export const dynamic = "force-dynamic"

const box: React.CSSProperties = {
  maxWidth: 560,
  margin: "60px auto",
  padding: "0 20px",
  lineHeight: 2,
  color: "#0a1b33",
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        background: ok ? "#E8F1EC" : "#FCE9E7",
        color: ok ? "#2F7A50" : "#A8382C",
        marginInlineStart: 8,
      }}
    >
      {label}: {ok ? "فعال ✅" : "تنظیم نشده ❌"}
    </span>
  )
}

export default function Home() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY)
  const hasSecret = Boolean(process.env.MCP_SECRET)

  return (
    <main style={box}>
      <h1 style={{ fontSize: 24 }}>🍌 Nano Banana Bridge</h1>
      <p>
        پل MCP برای تولید تصویر با مدل‌های Gemini (نانو بنانا) روی حساب شخصی — ساخته‌شده برای اچ‌شاپ.
      </p>

      <p>
        <Badge ok={hasKey} label="GEMINI_API_KEY" />
        <Badge ok={hasSecret} label="MCP_SECRET" />
      </p>

      {!hasSecret ? (
        <p style={{ color: "#A8382C", fontSize: 13 }}>
          ⚠️ بدون MCP_SECRET هر کسی که آدرس را داشته باشد می‌تواند از سهمیهٔ API تو استفاده کند — تنظیمش کن.
        </p>
      ) : null}

      <h2 style={{ fontSize: 16 }}>آدرس اتصال</h2>
      <pre
        dir="ltr"
        style={{
          background: "#f4f5f7",
          padding: 12,
          borderRadius: 10,
          fontSize: 12,
          overflowX: "auto",
        }}
      >
        {`https://<your-app>.vercel.app/api/mcp?key=<MCP_SECRET>`}
      </pre>

      <h2 style={{ fontSize: 16 }}>ابزارها</h2>
      <ul style={{ fontSize: 14 }}>
        <li>
          <code dir="ltr">generate_image</code> — تولید تصویر از متن (تا 4K، نسبت‌های متنوع)
        </li>
        <li>
          <code dir="ltr">edit_image</code> — ویرایش/ترکیب تصویر با ۱ تا ۳ تصویر مرجع
        </li>
        <li>
          <code dir="ltr">health_check</code> — گزارش وضعیت تنظیمات
        </li>
      </ul>

      <p style={{ fontSize: 12, color: "#64748b" }}>
        مدل‌ها: nano-banana-2 (پیش‌فرض) · nano-banana-pro (حداکثر کیفیت) · nano-banana (اقتصادی)
      </p>
    </main>
  )
}
