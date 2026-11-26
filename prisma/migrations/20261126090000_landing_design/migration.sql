-- Opciones de diseño por versión de landing (colores, distribución, secciones y textos).
ALTER TABLE "landing_versions" ADD COLUMN "design" JSONB NOT NULL DEFAULT '{}';
