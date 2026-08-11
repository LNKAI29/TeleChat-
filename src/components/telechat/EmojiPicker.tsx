import { useState } from "react";
import { Smile } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const GROUPS: Record<string, string[]> = {
  Smileys: "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤗 🤭 🤫 🤔 🤐 😐 😑 😶 😏 😒 🙄 😬 😮 😯 😴 🤤 😪 😵 🤯 🥳 😎 🤓 🧐".split(" "),
  Gestures: "👍 👎 👌 ✌️ 🤞 🤟 🤘 👏 🙌 🙏 💪 🤝 ✋ 🖐️ 👋 🤙 ☝️ 👆 👇 👈 👉 🫶 🫡 🤌".split(" "),
  Hearts: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ✨ ⭐ 🔥".split(" "),
  Objects: "🎉 🎊 🎁 🎂 🍕 🍔 🍟 ☕ 🍺 🍻 ⚽ 🏀 🎮 🎧 🎵 📷 📱 💻 🚗 ✈️ 🌍 🌙 ☀️ 🌈".split(" "),
};

const STICKERS = "🥳 😻 🙈 🙉 🙊 💃 🕺 🦄 🐼 🐶 🐱 🦊 🐸 🐵 🍀 🌸 🌻 🎈 🎯 🏆 🚀 👻 🤖 🎃".split(" ");

type Props = {
  onPick: (value: string) => void;
  onSticker: (value: string) => void;
};

export function EmojiPicker({ onPick, onSticker }: Props) {
  const [tab, setTab] = useState<"emoji" | "stickers">("emoji");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Emoji and stickers"
        >
          <Smile className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 rounded-2xl p-0">
        <div className="flex border-b border-border">
          {(["emoji", "stickers"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium capitalize transition-colors",
                tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="max-h-64 overflow-y-auto p-3">
          {tab === "emoji" ? (
            Object.entries(GROUPS).map(([group, list]) => (
              <div key={group} className="mb-3">
                <p className="mb-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">{group}</p>
                <div className="grid grid-cols-8 gap-1">
                  {list.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => onPick(e)}
                      className="rounded-lg p-1 text-xl transition-transform hover:scale-125"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {STICKERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSticker(s)}
                  className="rounded-2xl bg-secondary p-3 text-4xl transition-transform hover:scale-110"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}