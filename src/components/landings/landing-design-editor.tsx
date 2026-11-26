"use client";

import { DEFAULT_LANDING_DESIGN, type LandingDesignDTO } from "@/lib/landings/design";
import { inputClass } from "@/components/catalog/products-view";

type Props = { design: LandingDesignDTO; onChange: (design: LandingDesignDTO) => void };

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-background p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className={inputClass}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-9 cursor-pointer rounded border border-border bg-background p-0.5" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-28 rounded-lg border border-border bg-surface px-2 font-mono text-xs" />
      </span>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
    </label>
  );
}

export function LandingDesignEditor({ design, onChange }: Props) {
  const set = <K extends keyof LandingDesignDTO>(key: K, value: LandingDesignDTO[K]) => onChange({ ...design, [key]: value });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Cada landing puede tener su propio estilo. Los cambios se ven en la vista previa.</p>
        <button type="button" onClick={() => onChange({ ...DEFAULT_LANDING_DESIGN })} className="text-xs font-medium text-primary hover:underline">
          Restablecer
        </button>
      </div>

      <Group title="Distribución y foto">
        <Select label="Distribución" value={design.layout} options={[
          { value: "split-left", label: "Texto a la izquierda" },
          { value: "split-right", label: "Texto a la derecha" },
          { value: "stacked", label: "Imagen arriba" },
          { value: "centered", label: "Centrado" },
        ]} onChange={(value) => set("layout", value)} />
        <Select label="Ajuste de la foto" value={design.imageFit} options={[
          { value: "contain", label: "Imagen completa (sin recortar)" },
          { value: "cover", label: "Cubrir el recuadro (puede recortar)" },
        ]} onChange={(value) => set("imageFit", value)} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Altura de la foto (px): {design.imageHeight}</span>
          <input type="range" min={200} max={640} step={20} value={design.imageHeight} onChange={(event) => set("imageHeight", Number(event.target.value))} className="w-full accent-indigo-600" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Esquinas redondeadas (px)</span>
          <input type="number" min={0} max={48} value={design.imageRadius} onChange={(event) => set("imageRadius", Number(event.target.value))} className={inputClass} />
        </label>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="mb-2 text-[11px] text-muted">
            Encuadre de la foto (aplica cuando el ajuste es «Cubrir»). Mueva los controles para elegir qué parte se muestra.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Posición horizontal: {design.imagePositionX}%</span>
            <input type="range" min={0} max={100} value={design.imagePositionX} onChange={(event) => set("imagePositionX", Number(event.target.value))} className="w-full accent-indigo-600" />
          </label>
          <label className="mt-2 flex flex-col gap-1.5">
            <span className="text-xs text-muted">Posición vertical: {design.imagePositionY}%</span>
            <input type="range" min={0} max={100} value={design.imagePositionY} onChange={(event) => set("imagePositionY", Number(event.target.value))} className="w-full accent-indigo-600" />
          </label>
          <label className="mt-2 flex flex-col gap-1.5">
            <span className="text-xs text-muted">Zoom: {design.imageZoom}%</span>
            <input type="range" min={100} max={300} step={5} value={design.imageZoom} onChange={(event) => set("imageZoom", Number(event.target.value))} className="w-full accent-indigo-600" />
          </label>
        </div>
        <Select label="Tamaño del titular" value={design.headlineSize} options={[
          { value: "sm", label: "Pequeño" }, { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" }, { value: "xl", label: "Extra grande" },
        ]} onChange={(value) => set("headlineSize", value)} />
        <Select label="Espaciado" value={design.spacing} options={[
          { value: "compact", label: "Compacto" }, { value: "normal", label: "Normal" }, { value: "wide", label: "Amplio" },
        ]} onChange={(value) => set("spacing", value)} />
      </Group>

      <Group title="Colores">
        <Color label="Color principal" value={design.primaryColor} onChange={(value) => set("primaryColor", value)} />
        <Color label="Fondo" value={design.backgroundColor} onChange={(value) => set("backgroundColor", value)} />
        <Color label="Texto" value={design.textColor} onChange={(value) => set("textColor", value)} />
        <Color label="Fondo del botón" value={design.buttonColor} onChange={(value) => set("buttonColor", value)} />
        <Color label="Texto del botón" value={design.buttonTextColor} onChange={(value) => set("buttonTextColor", value)} />
        <Select label="Estilo del botón" value={design.buttonStyle} options={[
          { value: "solid", label: "Relleno" }, { value: "outline", label: "Borde" },
        ]} onChange={(value) => set("buttonStyle", value)} />
      </Group>

      <Group title="Textos">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Etiqueta superior (encima del titular)</span>
          <input value={design.eyebrow} maxLength={80} placeholder="Se usa el nombre del producto" onChange={(event) => set("eyebrow", event.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Texto de la insignia</span>
          <input value={design.badgeText} maxLength={60} onChange={(event) => set("badgeText", event.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Etiqueta del precio</span>
          <input value={design.priceLabel} maxLength={40} onChange={(event) => set("priceLabel", event.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Precio a mostrar (vacío = usa el del catálogo)</span>
          <input value={design.priceText} maxLength={40} placeholder="Ej. S/ 120.00" onChange={(event) => set("priceText", event.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Precio anterior (opcional, se tachará)</span>
          <input value={design.oldPriceText} maxLength={40} placeholder="Ej. S/ 240.00" onChange={(event) => set("oldPriceText", event.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Etiqueta de campaña (opcional)</span>
          <input value={design.discountText} maxLength={20} placeholder="Ej. -50%" onChange={(event) => set("discountText", event.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Texto del botón de WhatsApp</span>
          <input value={design.buttonText} maxLength={80} onChange={(event) => set("buttonText", event.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Texto de la sección final</span>
          <textarea rows={2} value={design.footerText} maxLength={300} onChange={(event) => set("footerText", event.target.value)} className={inputClass} />
        </label>
      </Group>

      <Group title="Secciones visibles">
        <Toggle label="Insignia" checked={design.showBadge} onChange={(value) => set("showBadge", value)} />
        <Toggle label="Referencia del producto" checked={design.showReference} onChange={(value) => set("showReference", value)} />
        <Toggle label="Precio" checked={design.showPrice} onChange={(value) => set("showPrice", value)} />
        <Toggle label="Botón de WhatsApp" checked={design.showWhatsapp} onChange={(value) => set("showWhatsapp", value)} />
        <Toggle label="Descripción" checked={design.showSummary} onChange={(value) => set("showSummary", value)} />
        <Toggle label="Variantes" checked={design.showVariants} onChange={(value) => set("showVariants", value)} />
        <Toggle label="Beneficios" checked={design.showBenefits} onChange={(value) => set("showBenefits", value)} />
        <Toggle label="Preguntas frecuentes" checked={design.showFaqs} onChange={(value) => set("showFaqs", value)} />
        <Toggle label="Sección final" checked={design.showFooter} onChange={(value) => set("showFooter", value)} />
      </Group>

      <Group title="Efecto de evento">
        <Select
          label="Decoración animada"
          value={design.effect}
          options={[
            { value: "none", label: "Ninguno" },
            { value: "snow", label: "Navidad (nieve y trineo)" },
            { value: "newyear", label: "Año nuevo (fuegos y confeti)" },
            { value: "halloween", label: "Halloween (murciélagos)" },
            { value: "carnival", label: "Carnaval (confeti)" },
            { value: "birthday", label: "Cumpleaños" },
            { value: "custom", label: "Personalizado (su emoji)" },
          ]}
          onChange={(value) => set("effect", value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Intensidad: {["Baja", "Media", "Alta"][design.effectIntensity - 1]}</span>
          <input type="range" min={1} max={3} value={design.effectIntensity} onChange={(event) => set("effectIntensity", Number(event.target.value))} className="w-full accent-indigo-600" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">Velocidad: {["Lenta", "Normal", "Rápida"][design.effectSpeed - 1]}</span>
          <input type="range" min={1} max={3} value={design.effectSpeed} onChange={(event) => set("effectSpeed", Number(event.target.value))} className="w-full accent-indigo-600" />
        </label>
        {design.effect === "custom" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Emoji o símbolo (máx. 8 caracteres)</span>
            <input value={design.effectEmoji} maxLength={8} onChange={(event) => set("effectEmoji", event.target.value)} className={inputClass} />
          </label>
        ) : null}
        <p className="text-[11px] text-muted">La animación no bloquea los botones y se desactiva si el visitante prefiere menos movimiento.</p>
      </Group>
    </div>
  );
}
