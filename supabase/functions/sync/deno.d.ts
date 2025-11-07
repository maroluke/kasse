// Local IDE helper types for Deno when editing Edge Functions.
// This file is only for editor IntelliSense; it is ignored by Supabase at runtime.
declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};
