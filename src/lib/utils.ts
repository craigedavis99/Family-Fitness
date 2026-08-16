import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Strip trailing slashes and accidental /rest/v1 from pasted Supabase dashboard URLs. */
export function getSupabaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  return raw.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}
