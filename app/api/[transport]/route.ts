import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import { GoogleGenAI } from "@google/genai"

export const runtime = "nodejs"
export const maxDuration = 60

/** مدل‌های تصویری Gemini — شناسهٔ واقعی مدل در API */
const MODELS = {
  "nano-banana-2": "gemini-3.1-flash-image-preview",
  "nano-banana-pro": "gemini-3-pro-image-preview",
  "nano-banana": "gemini-2.5-flash-image",
} as const

type ModelKey = keyof typeof MODELS

const ASPECT_RATIOS = ["1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4", "4:5", "5:4", "21:9"] as const

type ImagePart = { data: string; mimeType: string }

/**
 * فراخوانی Gemini و استخراج تصویر از پاسخ.
 * پرامپت متنی و تصویرهای مرجع (اختیاری) را یک‌جا می‌فرستد.
 */
async function generateWithGemini(args: {
  prompt: string
  model: ModelKey
  aspectRatio?: string
  imageSize?: string
  referenceImages?: ImagePart[]
}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY تنظیم نشده است. در داشبورد Vercel بخش Environment Variables را ببین.",
    )
  }

  const ai = new GoogleGenAI({ apiKey })
  const modelId = MODELS[args.model]

  // imageSize فقط برای مدل‌های gemini-3 پشتیبانی می‌شود
  const imageConfig: Record<string, string> = {}
  if (args.aspectRatio) imageConfig.aspectRatio = args.aspectRatio
  if (args.imageSize && modelId.startsWith("gemini-3")) imageConfig.imageSize = args.imageSize

  const parts: Array<Record<string, unknown>> = [{ text: args.prompt }]
  for (const image of args.referenceImages ?? []) {
    parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } })
  }

  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ role: "user", parts }],
    config: Object.keys(imageConfig).length > 0 ? { imageConfig } : undefined,
  })

  const outParts = response.candidates?.[0]?.content?.parts ?? []
  let imageData: string | undefined
  let imageMime = "image/png"
  const texts: string[] = []

  for (const part of outParts) {
    if (part.inlineData?.data) {
      imageData = part.inlineData.data
      imageMime = part.inlineData.mimeType ?? imageMime
    } else if (part.text) {
      texts.push(part.text)
    }
  }

  if (!imageData) {
    throw new Error(
      "مدل تصویری برنگرداند. شاید پرامپت رد شده یا سهمیهٔ این مدل روی کلید تو فعال نیست؛ مدل دیگری را امتحان کن.",
    )
  }

  return { imageData, imageMime, modelId, note: texts.join("\n") }
}

/** دانلود تصویر مرجع از URL عمومی و تبدیل به base64 */
async function fetchImage(url: string): Promise<ImagePart> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`دانلود تصویر مرجع ناموفق بود (HTTP ${res.status}): ${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg"
  return { data: buffer.toString("base64"), mimeType }
}

/** ساخت نشانی Pollinations با پارامتر و کلید اختیاری */
function pollinationsUrl(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`https://gen.pollinations.ai${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value))
  }
  const apiKey = process.env.POLLINATIONS_API_KEY
  if (apiKey) url.searchParams.set("key", apiKey)
  return url.toString()
}

/** نشانی رجیستری مدل‌های Pollinations */
function pollinationsModelsUrl() {
  const base = "https://gen.pollinations.ai/models"
  const apiKey = process.env.POLLINATIONS_API_KEY
  return apiKey ? `${base}?key=${apiKey}` : base
}

const mcp = createMcpHandler(
  (server) => {
    server.registerTool(
      "generate_image",
      {
        description:
          "Generate an image from a text prompt using Google Gemini image models (Nano Banana 2 / Pro). Returns the image as base64 PNG/JPEG.",
        inputSchema: {
          prompt: z
            .string()
            .describe("Detailed prompt describing the image. English prompts give the best results."),
          model: z
            .enum(["nano-banana-2", "nano-banana-pro", "nano-banana"])
            .describe(
              "nano-banana-2 = fast & smart default (gemini-3.1-flash-image) · nano-banana-pro = max fidelity/4K (gemini-3-pro-image) · nano-banana = budget drafts (gemini-2.5-flash-image)",
            ),
          aspectRatio: z
            .enum(ASPECT_RATIOS)
            .describe("Width:height of the output image"),
          imageSize: z
            .enum(["1K", "2K", "4K"])
            .optional()
            .describe("Output resolution — only supported by gemini-3 models (nano-banana-2 / pro)"),
        },
      },
      async (args) => {
        try {
          const result = await generateWithGemini({
            prompt: args.prompt,
            model: args.model ?? "nano-banana-2",
            aspectRatio: args.aspectRatio ?? "1:1",
            imageSize: args.imageSize,
          })

          return {
            content: [
              { type: "image" as const, data: result.imageData, mimeType: result.imageMime },
              {
                type: "text" as const,
                text: JSON.stringify({
                  model: result.modelId,
                  aspectRatio: args.aspectRatio ?? "1:1",
                  imageSize: args.imageSize ?? null,
                  mimeType: result.imageMime,
                  note: result.note || null,
                }),
              },
            ],
          }
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `خطا در تولید تصویر: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          }
        }
      },
    )

    server.registerTool(
      "edit_image",
      {
        description:
          "Edit or combine images with a text instruction using Gemini image models. Pass 1-3 public image URLs as references (e.g. restyle a banner, put a product in a scene, keep character consistency).",
        inputSchema: {
          prompt: z.string().describe("What to change or create, in detail. English works best."),
          imageUrls: z
            .array(z.string().url())
            .min(1)
            .max(3)
            .describe("Public URLs of reference images (1-3)"),
          model: z
            .enum(["nano-banana-2", "nano-banana-pro", "nano-banana"])
            .describe("Same model choices as generate_image"),
          aspectRatio: z.enum(ASPECT_RATIOS).optional(),
          imageSize: z.enum(["1K", "2K", "4K"]).optional(),
        },
      },
      async (args) => {
        try {
          const references = await Promise.all(args.imageUrls.map(fetchImage))
          const result = await generateWithGemini({
            prompt: args.prompt,
            model: args.model ?? "nano-banana-2",
            aspectRatio: args.aspectRatio,
            imageSize: args.imageSize,
            referenceImages: references,
          })

          return {
            content: [
              { type: "image" as const, data: result.imageData, mimeType: result.imageMime },
              {
                type: "text" as const,
                text: JSON.stringify({
                  model: result.modelId,
                  references: args.imageUrls.length,
                  mimeType: result.imageMime,
                  note: result.note || null,
                }),
              },
            ],
          }
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `خطا در ویرایش تصویر: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          }
        }
      },
    )

    server.registerTool(
      "health_check",
      {
        description: "Report bridge configuration status (API keys set, secret protection, available models).",
        inputSchema: {},
      },
      async () => ({
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                geminiApiKey: Boolean(process.env.GEMINI_API_KEY),
                pollinationsApiKey: Boolean(process.env.POLLINATIONS_API_KEY),
                secretProtection: Boolean(process.env.MCP_SECRET),
                geminiModels: MODELS,
                pollinations: "image + video via gen.pollinations.ai (free)",
              },
              null,
              2,
            ),
          },
        ],
      }),
    )

    // ───────── Pollinations — تصویر و ویدیوی رایگان ─────────

    server.registerTool(
      "pollinations_image",
      {
        description:
          "Generate an image for FREE via Pollinations (Flux and other open models). No billing or paid plan needed. Returns base64 image plus a shareable URL.",
        inputSchema: {
          prompt: z.string().describe("Detailed image prompt — English gives best results"),
          width: z.number().int().min(256).max(2048).optional().describe("Output width, default 1024"),
          height: z.number().int().min(256).max(2048).optional().describe("Output height, default 1024"),
          model: z
            .string()
            .optional()
            .describe("Live model name from pollinations_models — default flux"),
          seed: z.number().int().optional(),
        },
      },
      async (args) => {
        const url = pollinationsUrl(`/image/${encodeURIComponent(args.prompt)}`, {
          width: args.width ?? 1024,
          height: args.height ?? 1024,
          model: args.model,
          seed: args.seed,
          nologo: "true",
        })
        try {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`)
          const buffer = Buffer.from(await res.arrayBuffer())
          const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg"
          return {
            content: [
              { type: "image" as const, data: buffer.toString("base64"), mimeType },
              {
                type: "text" as const,
                text: JSON.stringify({ provider: "pollinations", url, mimeType, bytes: buffer.length }),
              },
            ],
          }
        } catch (error) {
          // حتی اگر دانلود شکست خورد، لینک قابل‌استفاده را برگردان
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  provider: "pollinations",
                  url,
                  warning: error instanceof Error ? error.message : String(error),
                }),
              },
            ],
          }
        }
      },
    )

    server.registerTool(
      "pollinations_video",
      {
        description:
          "Generate a short video for FREE via Pollinations. Returns a URL — the video renders when the URL is opened (can take 1-2 minutes).",
        inputSchema: {
          prompt: z.string().describe("Detailed video prompt — English gives best results"),
          model: z
            .string()
            .optional()
            .describe("Live video model name from pollinations_models"),
          aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
        },
      },
      async (args) => {
        const url = pollinationsUrl(`/video/${encodeURIComponent(args.prompt)}`, {
          model: args.model,
          aspectRatio: args.aspectRatio,
        })
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                provider: "pollinations",
                videoUrl: url,
                note: "ویدیو هنگام باز کردن لینک رندر می‌شود — ۱ تا ۲ دقیقه صبر لازم است",
              }),
            },
          ],
        }
      },
    )

    server.registerTool(
      "pollinations_models",
      {
        description: "List the live image and video models available on Pollinations right now.",
        inputSchema: {},
      },
      async () => {
        try {
          const res = await fetch(pollinationsModelsUrl())
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const text = await res.text()
          return { content: [{ type: "text" as const, text: text.slice(0, 6000) }] }
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `خطا در خواندن مدل‌ها: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          }
        }
      },
    )
  },
  {},
  { basePath: "/api", maxDuration: 60 },
)

/** محافظت با کلید مخفی در query string — اگر MCP_SECRET ست شده باشد، بدون آن ۴۰۱ می‌دهد */
function withAuth(handler: typeof mcp) {
  return (request: Request) => {
    const secret = process.env.MCP_SECRET
    if (secret) {
      const key = new URL(request.url).searchParams.get("key")
      if (key !== secret) {
        return new Response(JSON.stringify({ error: "unauthorized — key missing or wrong" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      }
    }
    return handler(request)
  }
}

const guarded = withAuth(mcp)
export { guarded as GET, guarded as POST, guarded as DELETE }
