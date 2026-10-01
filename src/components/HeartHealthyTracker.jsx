import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";
import {
  HeartPulse, Footprints, Utensils, Moon, Pill, AlertTriangle, Settings2,
  CalendarDays, TrendingUp, Plus, X, Droplets, Brain, Check, LogOut
} from "lucide-react";
import { fetchEntries, saveEntry, fetchProfile, saveProfile } from "../lib/data.js";
import { supabase } from "../supabaseClient.js";

// ---------- constants ----------

const SYMPTOMS = [
  { key: "chestPain", label: "Chest discomfort" },
  { key: "breath", label: "Shortness of breath" },
  { key: "palpitations", label: "Palpitations" },
  { key: "dizziness", label: "Dizziness" },
  { key: "swelling", label: "Ankle / leg swelling" },
  { key: "fatigue", label: "Unusual fatigue" },
];

const todayStr = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

const prettyDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
};

const defaultEntry = () => ({
  systolic: "", diastolic: "", restingHR: "", weight: "",
  steps: "", activeMin: "",
  sodium: "", fruitVeg: "", water: "", alcohol: "",
  sleepHours: "", sleepQuality: "3",
  stress: "5", mood: "3",
  medsTaken: {}, symptoms: [], symptomSeverity: "1",
  notes: "",
});

const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

// ---------- small UI atoms ----------

function Field({ label, unit, children }) {
  return (
    <label className="hht-field">
      <span className="hht-field-label">{label}{unit ? <em>{unit}</em> : null}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, placeholder, step }) {
  return (
    <input
      className="hht-input"
      type="number"
      inputMode="decimal"
      step={step || "1"}
      value={value}
      placeholder={placeholder || "—"}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Section({ icon, title, accent, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="hht-section" style={{ "--accent": accent }}>
      <button className="hht-section-head" onClick={() => setOpen(!open)} type="button">
        <span className="hht-section-icon">{icon}</span>
        <span className="hht-section-title">{title}</span>
        <span className={"hht-chevron" + (open ? " open" : "")}>⌄</span>
      </button>
      {open && <div className="hht-section-body">{children}</div>}
    </section>
  );
}

// ---------- ECG hero ----------

function EcgHero({ date, setDate, entry, streak, email, onSignOut }) {
  const bp = entry.systolic && entry.diastolic ? `${entry.systolic}/${entry.diastolic}` : "—/—";
  const hr = entry.restingHR || "—";
  const wt = entry.weight || "—";

  return (
    <div className="hht-hero">
      <svg className="hht-ecg" viewBox="0 0 960 90" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M0,45 L120,45 L140,45 L150,20 L160,70 L170,10 L180,55 L190,45 L320,45
             L340,45 L350,20 L360,70 L370,10 L380,55 L390,45 L520,45
             L540,45 L550,20 L560,70 L570,10 L580,55 L590,45 L720,45
             L740,45 L750,20 L760,70 L770,10 L780,55 L790,45 L960,45"
          fill="none" stroke="var(--berry)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className="hht-ecg-path"
        />
      </svg>
      <div className="hht-hero-content">
        <div className="hht-hero-top">
          <div>
            <p className="hht-hero-eyebrow">Heart Rhythm · {email}</p>
            <h1 className="hht-hero-title">{prettyDate(date)}</h1>
          </div>
          <div className="hht-hero-controls">
            <label className="hht-datepicker">
              <CalendarDays size={16} />
              <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
            </label>
            <button className="hht-signout" onClick={onSignOut} type="button" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <div className="hht-hero-stats">
          <div className="hht-stat">
            <span className="hht-stat-value">{bp}</span>
            <span className="hht-stat-label">blood pressure</span>
          </div>
          <div className="hht-stat">
            <span className="hht-stat-value">{hr}</span>
            <span className="hht-stat-label">resting HR, bpm</span>
          </div>
          <div className="hht-stat">
            <span className="hht-stat-value">{wt}</span>
            <span className="hht-stat-label">weight, lb</span>
          </div>
          <div className="hht-stat">
            <span className="hht-stat-value">{streak}</span>
            <span className="hht-stat-label">day streak</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Today tab ----------

function TodayTab({ entry, updateField, medications, onSave, saveStatus }) {
  const bpFlag =
    num(entry.systolic) >= 140 || num(entry.diastolic) >= 90
      ? "high"
      : num(entry.systolic) && num(entry.systolic) < 90
      ? "low"
      : null;

  const anySymptom = entry.symptoms.length > 0;
  const seriousSymptom = entry.symptoms.includes("chestPain") || entry.symptoms.includes("breath");

  return (
    <div className="hht-today">
      <Section icon={<HeartPulse size={18} />} accent="var(--teal)" title="Vitals">
        <div className="hht-grid">
          <Field label="Systolic" unit="mmHg">
            <NumberInput value={entry.systolic} onChange={(v) => updateField("systolic", v)} />
          </Field>
          <Field label="Diastolic" unit="mmHg">
            <NumberInput value={entry.diastolic} onChange={(v) => updateField("diastolic", v)} />
          </Field>
          <Field label="Resting heart rate" unit="bpm">
            <NumberInput value={entry.restingHR} onChange={(v) => updateField("restingHR", v)} />
          </Field>
          <Field label="Weight" unit="lb">
            <NumberInput value={entry.weight} onChange={(v) => updateField("weight", v)} step="0.1" />
          </Field>
        </div>
        {bpFlag === "high" && (
          <p className="hht-note warn">This reading is in range typically considered elevated. Consider rechecking and sharing with your clinician.</p>
        )}
        {bpFlag === "low" && (
          <p className="hht-note warn">This systolic reading is on the low side — note how you're feeling alongside it.</p>
        )}
      </Section>

      <Section icon={<Footprints size={18} />} accent="var(--sage)" title="Activity">
        <div className="hht-grid">
          <Field label="Steps">
            <NumberInput value={entry.steps} onChange={(v) => updateField("steps", v)} />
          </Field>
          <Field label="Active minutes">
            <NumberInput value={entry.activeMin} onChange={(v) => updateField("activeMin", v)} />
          </Field>
        </div>
      </Section>

      <Section icon={<Utensils size={18} />} accent="var(--sage)" title="Nutrition">
        <div className="hht-grid">
          <Field label="Sodium" unit="mg">
            <NumberInput value={entry.sodium} onChange={(v) => updateField("sodium", v)} />
          </Field>
          <Field label="Fruit & veg" unit="servings">
            <NumberInput value={entry.fruitVeg} onChange={(v) => updateField("fruitVeg", v)} />
          </Field>
          <Field label="Water" unit="cups">
            <NumberInput value={entry.water} onChange={(v) => updateField("water", v)} />
          </Field>
          <Field label="Alcohol" unit="drinks">
            <NumberInput value={entry.alcohol} onChange={(v) => updateField("alcohol", v)} />
          </Field>
        </div>
      </Section>

      <Section icon={<Pill size={18} />} accent="var(--berry)" title="Medications">
        {medications.length === 0 ? (
          <p className="hht-empty">No medications added yet — add them in Settings to track daily adherence.</p>
        ) : (
          <div className="hht-meds">
            {medications.map((m) => (
              <label key={m} className="hht-med-row">
                <input
                  type="checkbox"
                  checked={!!entry.medsTaken[m]}
                  onChange={(e) =>
                    updateField("medsTaken", { ...entry.medsTaken, [m]: e.target.checked })
                  }
                />
                <span>{m}</span>
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<Moon size={18} />} accent="var(--indigo)" title="Sleep">
        <div className="hht-grid">
          <Field label="Hours slept">
            <NumberInput value={entry.sleepHours} onChange={(v) => updateField("sleepHours", v)} step="0.25" />
          </Field>
          <Field label="Sleep quality (1–5)">
            <input
              className="hht-range"
              type="range" min="1" max="5" value={entry.sleepQuality}
              onChange={(e) => updateField("sleepQuality", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section icon={<Brain size={18} />} accent="var(--indigo)" title="Stress & mood">
        <div className="hht-grid">
          <Field label={`Stress (${entry.stress}/10)`}>
            <input
              className="hht-range"
              type="range" min="1" max="10" value={entry.stress}
              onChange={(e) => updateField("stress", e.target.value)}
            />
          </Field>
          <Field label={`Mood (${entry.mood}/5)`}>
            <input
              className="hht-range"
              type="range" min="1" max="5" value={entry.mood}
              onChange={(e) => updateField("mood", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section icon={<AlertTriangle size={18} />} accent="var(--amber)" title="Symptoms" defaultOpen={anySymptom}>
        <div className="hht-chips">
          {SYMPTOMS.map((s) => {
            const active = entry.symptoms.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                className={"hht-chip" + (active ? " active" : "")}
                onClick={() => {
                  const next = active
                    ? entry.symptoms.filter((k) => k !== s.key)
                    : [...entry.symptoms, s.key];
                  updateField("symptoms", next);
                }}
              >
                {active && <Check size={13} />} {s.label}
              </button>
            );
          })}
        </div>
        {anySymptom && (
          <>
            <Field label="Severity">
              <input
                className="hht-range"
                type="range" min="1" max="5" value={entry.symptomSeverity}
                onChange={(e) => updateField("symptomSeverity", e.target.value)}
              />
            </Field>
            {seriousSymptom && Number(entry.symptomSeverity) >= 3 && (
              <p className="hht-note warn">
                Chest discomfort or shortness of breath at this severity is worth taking seriously — if it's new, severe, or not improving, contact a healthcare provider or emergency services rather than waiting.
              </p>
            )}
          </>
        )}
      </Section>

      <Section icon={<Droplets size={18} />} accent="var(--teal)" title="Notes" defaultOpen={false}>
        <textarea
          className="hht-textarea"
          value={entry.notes}
          placeholder="Anything else worth remembering about today..."
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </Section>

      <div className="hht-save-row">
        <button className="hht-save-btn" onClick={onSave} type="button">Save today's entry</button>
        {saveStatus && <span className="hht-save-status">{saveStatus}</span>}
      </div>
    </div>
  );
}

// ---------- Trends tab ----------

function average(arr) {
  const nums = arr.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function TrendsTab({ entries }) {
  const sorted = useMemo(
    () => Object.keys(entries).sort().map((d) => ({ date: d, ...entries[d] })),
    [entries]
  );
  const last30 = sorted.slice(-30);
  const last7 = sorted.slice(-7);

  const chartData = last30.map((e) => ({
    label: prettyDate(e.date).split(",")[0],
    systolic: num(e.systolic),
    diastolic: num(e.diastolic),
    hr: num(e.restingHR),
    weight: num(e.weight),
    steps: num(e.steps),
    sleep: num(e.sleepHours),
    sodium: num(e.sodium),
  }));

  const avgSystolic = average(last7.map((e) => num(e.systolic)));
  const avgDiastolic = average(last7.map((e) => num(e.diastolic)));
  const avgWeight = average(last7.map((e) => num(e.weight)));
  const avgSteps = average(last7.map((e) => num(e.steps)));

  if (sorted.length === 0) {
    return (
      <div className="hht-empty-state">
        <TrendingUp size={28} />
        <p>No entries yet — log today's numbers on the Today tab to start building trend lines.</p>
      </div>
    );
  }

  return (
    <div className="hht-trends">
      <div className="hht-avg-row">
        <div className="hht-avg-card">
          <span className="hht-avg-label">7-day avg BP</span>
          <span className="hht-avg-value">{avgSystolic ?? "—"}/{avgDiastolic ?? "—"}</span>
        </div>
        <div className="hht-avg-card">
          <span className="hht-avg-label">7-day avg weight</span>
          <span className="hht-avg-value">{avgWeight ?? "—"} lb</span>
        </div>
        <div className="hht-avg-card">
          <span className="hht-avg-label">7-day avg steps</span>
          <span className="hht-avg-value">{avgSteps ?? "—"}</span>
        </div>
      </div>

      <div className="hht-chart-card">
        <h3>Blood pressure</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--ink-soft)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--ink-soft)" fontSize={11} tickLine={false} domain={[50, "auto"]} />
            <Tooltip contentStyle={{ background: "var(--paper)", border: "1px solid var(--line)", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="systolic" stroke="var(--berry)" strokeWidth={2} dot={false} connectNulls name="Systolic" />
            <Line type="monotone" dataKey="diastolic" stroke="var(--teal)" strokeWidth={2} dot={false} connectNulls name="Diastolic" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="hht-chart-grid">
        <div className="hht-chart-card">
          <h3>Weight</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--ink-soft)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--ink-soft)" fontSize={10} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "var(--paper)", border: "1px solid var(--line)", fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="var(--indigo)" strokeWidth={2} dot={false} connectNulls name="Weight" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="hht-chart-card">
          <h3>Resting heart rate</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--ink-soft)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--ink-soft)" fontSize={10} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "var(--paper)", border: "1px solid var(--line)", fontSize: 12 }} />
              <Line type="monotone" dataKey="hr" stroke="var(--berry)" strokeWidth={2} dot={false} connectNulls name="Resting HR" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="hht-chart-card">
          <h3>Sleep (hours)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--ink-soft)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--ink-soft)" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--paper)", border: "1px solid var(--line)", fontSize: 12 }} />
              <Bar dataKey="sleep" fill="var(--sage)" radius={[3, 3, 0, 0]} name="Sleep" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="hht-chart-card">
          <h3>Steps</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--ink-soft)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--ink-soft)" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--paper)", border: "1px solid var(--line)", fontSize: 12 }} />
              <Bar dataKey="steps" fill="var(--amber)" radius={[3, 3, 0, 0]} name="Steps" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ---------- Settings tab ----------

function SettingsTab({ profile, setProfile, savingProfile }) {
  const [newMed, setNewMed] = useState("");

  return (
    <div className="hht-settings">
      <Section icon={<Settings2 size={18} />} accent="var(--teal)" title="Profile">
        <div className="hht-grid">
          <Field label="Height" unit="cm">
            <NumberInput value={profile.heightCm} onChange={(v) => setProfile({ ...profile, heightCm: v })} />
          </Field>
        </div>
      </Section>

      <Section icon={<Pill size={18} />} accent="var(--berry)" title="Medications">
        <div className="hht-med-add">
          <input
            className="hht-input"
            placeholder="e.g. Lisinopril 10mg"
            value={newMed}
            onChange={(e) => setNewMed(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newMed.trim()) {
                setProfile({ ...profile, medications: [...profile.medications, newMed.trim()] });
                setNewMed("");
              }
            }}
          />
          <button
            type="button"
            className="hht-icon-btn"
            onClick={() => {
              if (newMed.trim()) {
                setProfile({ ...profile, medications: [...profile.medications, newMed.trim()] });
                setNewMed("");
              }
            }}
          >
            <Plus size={16} />
          </button>
        </div>
        <ul className="hht-med-list">
          {profile.medications.map((m, i) => (
            <li key={m + i}>
              <span>{m}</span>
              <button
                type="button"
                className="hht-icon-btn ghost"
                onClick={() =>
                  setProfile({ ...profile, medications: profile.medications.filter((_, idx) => idx !== i) })
                }
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        {savingProfile && <span className="hht-save-status">Saved</span>}
      </Section>

      <div className="hht-privacy-note">
        <p>Your entries are stored in your own Supabase project, scoped to your account by row-level security — only you can read or write your rows.</p>
      </div>
    </div>
  );
}

// ---------- App ----------

export default function HeartHealthyTracker({ user }) {
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState({});
  const [profile, setProfile] = useState({ heightCm: "", medications: [] });
  const [tab, setTab] = useState("today");
  const [saveStatus, setSaveStatus] = useState("");
  const [savedProfileFlash, setSavedProfileFlash] = useState(false);
  const [loadError, setLoadError] = useState("");

  // load everything on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [entryMap, profileData] = await Promise.all([
          fetchEntries(user.id),
          fetchProfile(user.id),
        ]);
        if (!cancelled) {
          setEntries(entryMap);
          setProfile(profileData);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Could not load your data.");
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user.id]);

  // persist profile whenever it changes, after initial load
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      try {
        await saveProfile(user.id, profile);
        if (!cancelled) {
          setSavedProfileFlash(true);
          setTimeout(() => setSavedProfileFlash(false), 1200);
        }
      } catch (_) { /* best effort */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const entry = entries[date] || defaultEntry();

  const updateField = useCallback(
    (key, value) => {
      setEntries((prev) => ({
        ...prev,
        [date]: { ...(prev[date] || defaultEntry()), [key]: value },
      }));
    },
    [date]
  );

  const handleSave = useCallback(async () => {
    try {
      await saveEntry(user.id, date, entry);
      setSaveStatus("Saved");
    } catch (err) {
      setSaveStatus(err.message || "Could not save — try again");
    }
    setTimeout(() => setSaveStatus(""), 2000);
  }, [user.id, date, entry]);

  const streak = useMemo(() => {
    let count = 0;
    let d = new Date(todayStr());
    while (true) {
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      if (entries[iso]) {
        count += 1;
        d = new Date(d.getTime() - 86400000);
      } else break;
    }
    return count;
  }, [entries]);

  return (
    <div className="hht-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        .hht-root {
          --paper: #F6F3ED;
          --card: #FBF9F5;
          --ink: #20262B;
          --ink-soft: #5C6670;
          --line: #E2DCCF;
          --teal: #1E3D3D;
          --teal-soft: #E7EFEE;
          --berry: #A43E3E;
          --berry-soft: #F6E7E6;
          --sage: #5E7A5E;
          --sage-soft: #E9EFE7;
          --amber: #BF8B3D;
          --amber-soft: #F6EBDA;
          --indigo: #45507A;
          --indigo-soft: #E8E9F1;
          font-family: 'IBM Plex Sans', sans-serif;
          color: var(--ink);
          background: var(--paper);
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
        }
        .hht-root * { box-sizing: border-box; }

        .hht-layout { display: flex; min-height: 100vh; }
        .hht-nav {
          width: 200px;
          flex-shrink: 0;
          background: var(--teal);
          color: #F2EFE7;
          padding: 28px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .hht-nav-brand {
          font-family: 'Fraunces', serif;
          font-size: 19px;
          font-weight: 600;
          margin: 0 8px 22px 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hht-nav-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #C9D4D0;
          font-size: 14px;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
        }
        .hht-nav-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .hht-nav-btn.active { background: rgba(255,255,255,0.14); color: #fff; }

        .hht-main { flex: 1; min-width: 0; padding: 28px 32px 60px; max-width: 760px; }

        .hht-hero {
          position: relative;
          background: var(--teal);
          color: #F2EFE7;
          border-radius: 12px;
          padding: 22px 24px 20px;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .hht-ecg { position: absolute; top: 0; left: 0; width: 100%; height: 60%; opacity: 0.35; }
        .hht-ecg-path { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: hht-draw 1.8s ease-out forwards; }
        @keyframes hht-draw { to { stroke-dashoffset: 0; } }
        .hht-hero-content { position: relative; }
        .hht-hero-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
        .hht-hero-eyebrow { margin: 0 0 2px; font-size: 12px; letter-spacing: 0.04em; color: #B9C9C3; }
        .hht-hero-title { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 600; margin: 0; }
        .hht-hero-controls { display: flex; align-items: center; gap: 8px; }
        .hht-datepicker { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); padding: 6px 10px; border-radius: 7px; font-size: 13px; }
        .hht-datepicker input { background: transparent; border: none; color: #F2EFE7; font-family: inherit; font-size: 13px; }
        .hht-datepicker input::-webkit-calendar-picker-indicator { filter: invert(1); }
        .hht-signout {
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.1); border: none; color: #F2EFE7;
          width: 32px; height: 32px; border-radius: 7px; cursor: pointer;
        }
        .hht-signout:hover { background: rgba(255,255,255,0.2); }

        .hht-hero-stats { display: flex; gap: 28px; margin-top: 18px; flex-wrap: wrap; }
        .hht-stat { display: flex; flex-direction: column; }
        .hht-stat-value { font-family: 'IBM Plex Mono', monospace; font-size: 22px; font-weight: 600; }
        .hht-stat-label { font-size: 11px; color: #B9C9C3; margin-top: 2px; }

        .hht-section {
          background: var(--card);
          border: 1px solid var(--line);
          border-left: 3px solid var(--accent, var(--teal));
          border-radius: 10px;
          margin-bottom: 14px;
          overflow: hidden;
        }
        .hht-section-head { width: 100%; display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: none; border: none; cursor: pointer; text-align: left; font-family: inherit; }
        .hht-section-icon { color: var(--accent, var(--teal)); display: flex; }
        .hht-section-title { font-size: 15px; font-weight: 600; flex: 1; color: var(--ink); }
        .hht-chevron { color: var(--ink-soft); transition: transform 0.15s ease; }
        .hht-chevron.open { transform: rotate(180deg); }
        .hht-section-body { padding: 0 16px 16px; }

        .hht-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; }
        .hht-field { display: flex; flex-direction: column; gap: 5px; }
        .hht-field-label { font-size: 12.5px; color: var(--ink-soft); }
        .hht-field-label em { font-style: normal; color: var(--ink-soft); opacity: 0.7; margin-left: 4px; }
        .hht-input { font-family: 'IBM Plex Mono', monospace; font-size: 15px; padding: 9px 10px; border-radius: 7px; border: 1px solid var(--line); background: #fff; color: var(--ink); width: 100%; }
        .hht-input:focus, .hht-range:focus { outline: 2px solid var(--teal); outline-offset: 1px; }
        .hht-range { width: 100%; accent-color: var(--teal); margin-top: 6px; }
        .hht-textarea { width: 100%; min-height: 70px; font-family: inherit; font-size: 14px; padding: 10px; border-radius: 7px; border: 1px solid var(--line); background: #fff; resize: vertical; }

        .hht-note { margin: 10px 0 0; font-size: 13px; padding: 9px 12px; border-radius: 7px; }
        .hht-note.warn { background: var(--amber-soft); color: #6B5120; }

        .hht-empty { font-size: 13px; color: var(--ink-soft); margin: 0; }
        .hht-meds { display: flex; flex-direction: column; gap: 8px; }
        .hht-med-row { display: flex; align-items: center; gap: 9px; font-size: 14px; }
        .hht-med-row input { accent-color: var(--berry); width: 16px; height: 16px; }

        .hht-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .hht-chip { font-family: inherit; font-size: 13px; padding: 7px 12px; border-radius: 999px; border: 1px solid var(--line); background: #fff; color: var(--ink-soft); cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .hht-chip.active { background: var(--amber-soft); border-color: var(--amber); color: #6B5120; }

        .hht-save-row { display: flex; align-items: center; gap: 12px; margin-top: 6px; }
        .hht-save-btn { font-family: inherit; font-size: 14px; font-weight: 600; padding: 11px 20px; border-radius: 8px; border: none; background: var(--teal); color: #F2EFE7; cursor: pointer; }
        .hht-save-btn:hover { background: #163030; }
        .hht-save-status { font-size: 13px; color: var(--sage); }

        .hht-empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; color: var(--ink-soft); padding: 60px 20px; border: 1px dashed var(--line); border-radius: 10px; }

        .hht-avg-row { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
        .hht-avg-card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 14px 18px; flex: 1; min-width: 140px; }
        .hht-avg-label { display: block; font-size: 12px; color: var(--ink-soft); }
        .hht-avg-value { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 600; margin-top: 4px; }

        .hht-chart-card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px 16px 6px; margin-bottom: 16px; }
        .hht-chart-card h3 { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 600; margin: 0 0 8px; }
        .hht-chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0 16px; }

        .hht-med-add { display: flex; gap: 8px; margin-bottom: 10px; }
        .hht-med-add .hht-input { flex: 1; }
        .hht-icon-btn { display: flex; align-items: center; justify-content: center; width: 36px; border-radius: 7px; border: 1px solid var(--line); background: var(--teal-soft); color: var(--teal); cursor: pointer; }
        .hht-icon-btn.ghost { background: none; border: none; color: var(--ink-soft); width: auto; }
        .hht-med-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
        .hht-med-list li { display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding: 8px 10px; background: #fff; border: 1px solid var(--line); border-radius: 7px; }

        .hht-privacy-note { font-size: 12.5px; color: var(--ink-soft); border-top: 1px solid var(--line); padding-top: 14px; margin-top: 4px; }

        .hht-load-error { background: var(--berry-soft); color: #7A2B2B; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }

        .hht-tabbar { display: none; }

        @media (max-width: 760px) {
          .hht-layout { flex-direction: column; }
          .hht-nav { display: none; }
          .hht-main { max-width: 100%; padding: 16px 16px 90px; }
          .hht-tabbar { display: flex; position: fixed; bottom: 0; left: 0; right: 0; background: var(--teal); padding: 8px 10px env(safe-area-inset-bottom, 8px); justify-content: space-around; z-index: 10; }
          .hht-tabbar button { display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; color: #B9C9C3; font-size: 10px; font-family: inherit; }
          .hht-tabbar button.active { color: #fff; }
          .hht-hero-stats { gap: 18px; }
        }
      `}</style>

      <div className="hht-layout">
        <nav className="hht-nav">
          <div className="hht-nav-brand"><HeartPulse size={20} /> Heart Rhythm</div>
          <button className={"hht-nav-btn" + (tab === "today" ? " active" : "")} onClick={() => setTab("today")}>
            <CalendarDays size={16} /> Today
          </button>
          <button className={"hht-nav-btn" + (tab === "trends" ? " active" : "")} onClick={() => setTab("trends")}>
            <TrendingUp size={16} /> Trends
          </button>
          <button className={"hht-nav-btn" + (tab === "settings" ? " active" : "")} onClick={() => setTab("settings")}>
            <Settings2 size={16} /> Settings
          </button>
        </nav>

        <main className="hht-main">
          {loadError && <div className="hht-load-error">{loadError}</div>}
          {!ready ? (
            <p className="hht-empty">Loading your tracker…</p>
          ) : (
            <>
              {tab === "today" && (
                <>
                  <EcgHero
                    date={date} setDate={setDate} entry={entry} streak={streak}
                    email={user.email} onSignOut={() => supabase.auth.signOut()}
                  />
                  <TodayTab
                    entry={entry}
                    updateField={updateField}
                    medications={profile.medications}
                    onSave={handleSave}
                    saveStatus={saveStatus}
                  />
                </>
              )}
              {tab === "trends" && <TrendsTab entries={entries} />}
              {tab === "settings" && (
                <SettingsTab profile={profile} setProfile={setProfile} savingProfile={savedProfileFlash} />
              )}
            </>
          )}
        </main>
      </div>

      <div className="hht-tabbar">
        <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}>
          <CalendarDays size={18} /> Today
        </button>
        <button className={tab === "trends" ? "active" : ""} onClick={() => setTab("trends")}>
          <TrendingUp size={18} /> Trends
        </button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
          <Settings2 size={18} /> Settings
        </button>
      </div>
    </div>
  );
}
