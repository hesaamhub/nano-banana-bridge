# 🍌 Nano Banana Bridge

پل MCP برای تولید تصویر با مدل‌های **Gemini** (نانو بنانا ۲ و نانو بنانا پرو) روی حساب Google AI خودت — ساخته‌شده برای فروشگاه **اچ‌شاپ**.

این سرور سبک روی Vercel اجرا می‌شود و سه ابزار در اختیار دستیار می‌گذارد:

| ابزار | کار |
|---|---|
| `generate_image` | تولید تصویر از متن — تا کیفیت 4K و نسبت‌های 1:1 تا 21:9 |
| `edit_image` | ویرایش/ترکیب تصویر با ۱ تا ۳ تصویر مرجع (بازطراحی بنر، حفظ سبک، گذاشتن محصول در صحنه) |
| `health_check` | گزارش وضعیت تنظیمات |

---

## راه‌اندازی (۵ دقیقه)

### ۱) کلید API بگیر
به [aistudio.google.com/apikey](https://aistudio.google.com/apikey) برو و با همان اکانت Google AI Pro ات کلید بساز (**Create API key**).

### ۲) دیپلوی روی Vercel
روی دکمه بزن:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhesaamhub%2Fnano-banana-bridge&env=GEMINI_API_KEY,MCP_SECRET&envDescription=GEMINI_API_KEY%20is%20required%20(get%20it%20from%20aistudio.google.com%2Fapikey).%20MCP_SECRET%20is%20an%20optional%20password%20that%20protects%20your%20endpoint.&project-name=nano-banana-bridge)

در صفحهٔ دیپلوی این دو متغیر را پر کن:

| متغیر | مقدار |
|---|---|
| `GEMINI_API_KEY` | کلیدی که در مرحلهٔ ۱ ساختی (اجباری) |
| `MCP_SECRET` | یک رشتهٔ تصادفی طولانی — مثل رمز عبور (توصیه‌شده؛ جلوی سوءاستفاده از سهمیه‌ات را می‌گیرد) |

### ۳) آدرس را به دستیار بده
بعد از دیپلوی، آدرس پروژه‌ات این شکلی است:

```
https://<project-name>.vercel.app/api/mcp?key=<MCP_SECRET>
```

این آدرس را در گفتگو برای دستیار بفرست — او وصل می‌شود و با یک تصویر واقعی تستش می‌کند.

> اگر MCP_SECRET نگذاشتی، آدرس بدون `?key=...` کار می‌کند ولی هر کسی که آدرس را داشته باشد می‌تواند از سهمیهٔ API تو استفاده کند.

---

## مدل‌ها

| گزینه | مدل واقعی | مناسب برای |
|---|---|---|
| `nano-banana-2` (پیش‌فرض) | `gemini-3.1-flash-image-preview` | اکثر کارها — سریع و باهوش |
| `nano-banana-pro` | `gemini-3-pro-image-preview` | حداکثر کیفیت، متن خوانا در تصویر، 4K |
| `nano-banana` | `gemini-2.5-flash-image` | پیش‌نویس سریع و ارزان |

## حدود و هزینه

- هر تصویر با کلید خودت از سهمیه/اعتبار اکانت Google AI تو کم می‌شود (تعرفهٔ تقریبی: نانو بنانا ۲ حدود ۷–۱۵ سنت، پرو تا ~۲۴ سنت برای 4K).
- اگر مدل Pro روی کلیدت فعال نبود، ابزار خطا می‌دهد — کافی است مدل `nano-banana-2` را امتحان کنی.
- محدودیت زمانی هر درخواست روی پلن Hobby ورسل ۶۰ ثانیه است که برای تولید تصویر کافی است.

## توسعهٔ محلی

```bash
cp .env.example .env.local   # کلیدها را داخلش بذار
npm install
npm run dev                  # MCP endpoint: http://localhost:3000/api/mcp
```
