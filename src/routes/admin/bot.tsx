import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus } from "lucide-react";
import { useRef, useState } from "react";
import { adminBotChat } from "@/fn/admin";
import { compressImageFile } from "@/lib/shop/compress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export const Route = createFileRoute("/admin/bot")({
  component: BotPage,
});

type Msg = { from: "bot" | "me"; text: string; photo?: string };

export function BotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      from: "bot",
      text: "Это тот же сценарий, что в Telegram. Напишите «Добавить товар» или пришлите фото.",
    },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  async function send(payload: { text?: string; photoDataUrl?: string }) {
    const preview = payload.text || (payload.photoDataUrl ? "Фото" : "");
    setMessages((m) => [
      ...m,
      { from: "me", text: preview, photo: payload.photoDataUrl },
    ]);
    setText("");
    setBusy(true);
    try {
      const reply = await adminBotChat({ data: payload });
      setMessages((m) => [...m, { from: "bot", text: reply.reply }]);
      requestAnimationFrame(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <h1 className="font-display text-4xl">Бот</h1>
      <p className="mt-1 text-sm text-muted">
        Короткий сценарий: фото → название → цена → объём → описание → «да».
      </p>
      <div ref={scroller} className="mt-4 flex flex-1 flex-col gap-2 overflow-y-auto pb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.from === "bot"
                ? "max-w-[85%] self-start rounded-lg bg-elevated px-3 py-2 text-sm"
                : "max-w-[85%] self-end rounded-lg bg-accent px-3 py-2 text-sm text-accent-fg"
            }
          >
            {m.photo ? (
              <img src={m.photo} alt="" className="mb-2 max-h-40 rounded-md object-cover" />
            ) : null}
            <p className="whitespace-pre-line">{m.text}</p>
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          void send({ text });
        }}
      >
        <label className="flex size-12 shrink-0 items-center justify-center rounded-md bg-elevated">
          <ImagePlus className="size-5 text-muted" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const data = await compressImageFile(file);
              void send({ photoDataUrl: data });
            }}
          />
        </label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Сообщение"
        />
        <Button type="submit" disabled={busy}>
          OK
        </Button>
      </form>
    </div>
  );
}
