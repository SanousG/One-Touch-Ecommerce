export function StoreFooter({ storeName }: { storeName: string }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted sm:flex-row lg:px-12">
        <div className="flex flex-wrap items-center gap-6">
          <span className="cursor-not-allowed" title="Disponible en una fase posterior">Términos y condiciones</span>
          <span className="cursor-not-allowed" title="Disponible en una fase posterior">Políticas de devolución</span>
          <span className="cursor-not-allowed" title="Disponible en una fase posterior">Contacto</span>
        </div>
        <p>© {storeName}. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
