import { supabase } from "../supabaseClient.js";

// ---- entries: one row per (user, date), health data stored as jsonb ----

export async function fetchEntries(userId) {
  const { data, error } = await supabase
    .from("entries")
    .select("date, data")
    .eq("user_id", userId)
    .order("date", { ascending: true });

  if (error) throw error;

  const map = {};
  for (const row of data) {
    map[row.date] = row.data;
  }
  return map;
}

export async function saveEntry(userId, date, entryData) {
  const { error } = await supabase
    .from("entries")
    .upsert(
      { user_id: userId, date, data: entryData },
      { onConflict: "user_id,date" }
    );
  if (error) throw error;
  return true;
}

// ---- profile: one row per user ----

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("height_cm, medications")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { heightCm: "", medications: [] };
  return {
    heightCm: data.height_cm ?? "",
    medications: data.medications ?? [],
  };
}

export async function saveProfile(userId, profile) {
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      height_cm: profile.heightCm === "" ? null : Number(profile.heightCm),
      medications: profile.medications,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
  return true;
}
