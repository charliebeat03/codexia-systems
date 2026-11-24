interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Compatibilidad con proyectos que aún usan la clave legacy anon. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SOCIAL_LINKEDIN?: string
  readonly VITE_SOCIAL_YOUTUBE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
