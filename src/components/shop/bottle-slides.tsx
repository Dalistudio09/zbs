import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function BottleSlides({
  images,
  alt,
  title,
  body,
  productId,
  variant = "card",
}: {
  images: string[];
  alt: string;
  title?: string;
  body?: string;
  productId?: string;
  variant?: "card" | "hero";
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const story = Boolean(title || body);
  const slides = Math.max(images.length, 1) + (story ? 1 : 0);
  const hero = variant === "hero";

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const width = Math.max(el.clientWidth, 1);
    const next = Math.round(el.scrollLeft / width);
    setIndex(Math.min(slides - 1, Math.max(0, next)));
  }

  function go(i: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  const frame = cn(
    "w-full shrink-0 snap-center",
    hero ? "aspect-[3/4] max-h-[70vh]" : "aspect-[3/4]",
  );

  return (
    <div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="bottle-scroller flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg bg-surface"
      >
        {(images.length ? images : [""]).map((src, i) => {
          const shot = src ? (
            <img
              src={src}
              alt={alt}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="aspect-[3/4] h-full w-full object-cover"
            />
          ) : (
            <div className="aspect-[3/4] w-full bg-elevated" />
          );
          if (productId && i === 0) {
            return (
              <Link
                key={`${src}-${i}`}
                to="/p/$id"
                params={{ id: productId }}
                className={cn(frame, "block no-underline")}
              >
                {shot}
              </Link>
            );
          }
          return (
            <div key={`${src}-${i}`} className={frame}>
              {shot}
            </div>
          );
        })}
        {story ? (
          <div
            className={cn(
              frame,
              "flex flex-col overflow-hidden bg-surface",
              hero ? "px-6 py-8" : "px-3 py-3",
            )}
          >
            <p
              className={cn(
                "uppercase tracking-[0.18em] text-accent",
                hero ? "text-xs" : "text-[10px]",
              )}
            >
              легенда
            </p>
            {title ? (
              <h3
                className={cn(
                  "font-display leading-tight text-fg",
                  hero ? "mt-4 text-4xl" : "mt-2 text-[17px]",
                )}
              >
                {title}
              </h3>
            ) : null}
            {body ? (
              <p
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto text-muted",
                  hero ? "mt-4 text-[15px] leading-relaxed" : "mt-2 text-[12px] leading-snug",
                )}
              >
                {body}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {slides > 1 ? (
        <div className="mt-1 flex items-center justify-center">
          {Array.from({ length: slides }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={i === slides - 1 && story ? "Легенда аромата" : "Фото флакона"}
              aria-current={index === i}
              onClick={() => go(i)}
              className="flex h-6 w-6 items-center justify-center"
            >
              <span
                className={cn(
                  "h-0.5 rounded-full",
                  index === i ? "w-3.5 bg-accent" : "w-1.5 bg-faint",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
