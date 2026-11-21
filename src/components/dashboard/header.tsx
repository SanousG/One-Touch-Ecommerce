import { Icon } from "@/components/ui/icon";

export function Header({ userName }: { userName: string }) {
  const initial = userName.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="fixed left-60 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-6 backdrop-blur-xl">
      <div className="text-xs text-muted">
        <span className="hidden md:inline">Panel de control</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden items-center md:flex">
          <Icon name="search" size={17} className="absolute left-2.5 text-slate-400" />
          <input
            type="search"
            disabled
            placeholder="Búsqueda disponible en próximas fases"
            className="h-[34px] w-64 rounded-lg border border-border bg-background pl-9 pr-3 text-xs text-muted placeholder:text-slate-400"
          />
        </div>
        <span
          title="Notificaciones disponibles en próximas fases"
          className="rounded-lg p-1.5 text-slate-400"
          aria-disabled="true"
        >
          <Icon name="bell" size={20} />
        </span>
        <span
          title="Ayuda disponible en próximas fases"
          className="rounded-lg p-1.5 text-slate-400"
          aria-disabled="true"
        >
          <Icon name="help" size={20} />
        </span>
        <span
          title={userName}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
        >
          {initial}
        </span>
      </div>
    </header>
  );
}
