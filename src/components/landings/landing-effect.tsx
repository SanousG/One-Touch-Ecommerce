import type { LandingDesignDTO } from "@/lib/landings/design";

type Effect = LandingDesignDTO["effect"];

const PRESETS: Record<Exclude<Effect, "none">, { chars: string[]; mode: "fall" | "float"; seconds: number; size: number }> = {
  snow: { chars: ["❄️", "❅", "❆", "☃️"], mode: "fall", seconds: 13, size: 18 },
  newyear: { chars: ["🎆", "✨", "🎊", "⭐"], mode: "fall", seconds: 9, size: 20 },
  halloween: { chars: ["🦇", "🎃", "👻"], mode: "float", seconds: 15, size: 22 },
  carnival: { chars: ["🎊", "🎉", "🟠", "🟣"], mode: "fall", seconds: 8, size: 18 },
  birthday: { chars: ["🎉", "🎂", "🎈", "✨"], mode: "fall", seconds: 9, size: 20 },
  custom: { chars: ["✨"], mode: "fall", seconds: 10, size: 22 },
};

const CSS = `
.landing-effect{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:20}
.landing-effect span{position:absolute;top:-12vh;display:block;will-change:transform;animation-name:landing-fall;animation-timing-function:linear;animation-iteration-count:infinite}
.landing-effect[data-mode="float"] span{top:auto;left:-12vw;animation-name:landing-float}
@keyframes landing-fall{0%{transform:translate3d(0,-12vh,0) rotate(0);opacity:0}8%{opacity:1}100%{transform:translate3d(var(--drift),122vh,0) rotate(320deg);opacity:1}}
@keyframes landing-float{0%{transform:translate3d(-12vw,0,0) rotate(-12deg);opacity:0}10%{opacity:1}100%{transform:translate3d(112vw,var(--drift-y),0) rotate(12deg);opacity:1}}
@keyframes landing-sleigh{0%{left:-15%;top:4%}100%{left:108%;top:16%}}
.landing-effect .sleigh{position:absolute;font-size:34px;animation:landing-sleigh 22s linear infinite;opacity:.9}
@media (prefers-reduced-motion:reduce){.landing-effect{display:none}}
`;

export function LandingEffect({ design }: { design: LandingDesignDTO }) {
  if (design.effect === "none") return null;
  const preset = PRESETS[design.effect];
  const chars = design.effect === "custom"
    ? [design.effectEmoji.trim() || "✨"]
    : preset.chars;
  const count = [8, 16, 26][design.effectIntensity - 1] ?? 16;
  const speed = [1.5, 1, 0.6][design.effectSpeed - 1] ?? 1;
  const duration = preset.seconds * speed;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="landing-effect" data-mode={preset.mode} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => {
          const left = (index * 37 + 11) % 100;
          const delay = (index * 1.73) % duration;
          const drift = `${((index * 19) % 120) - 60}px`;
          const driftY = `${((index * 13) % 80) - 40}px`;
          return (
            <span
              key={index}
              style={{
                left: preset.mode === "fall" ? `${left}%` : undefined,
                top: preset.mode === "float" ? `${8 + ((index * 17) % 72)}%` : undefined,
                fontSize: `${preset.size + (index % 3) * 4}px`,
                animationDuration: `${duration + (index % 4)}s`,
                animationDelay: `-${delay}s`,
                ["--drift" as string]: drift,
                ["--drift-y" as string]: driftY,
              }}
            >
              {chars[index % chars.length]}
            </span>
          );
        })}
        {design.effect === "snow" ? <span className="sleigh" aria-hidden>🛷🎅</span> : null}
      </div>
    </>
  );
}
