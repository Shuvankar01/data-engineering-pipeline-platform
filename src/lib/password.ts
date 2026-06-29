/**
 * Lightweight password strength heuristic — no external deps.
 * Returns a score 0–4 and a label.
 *  - Length, mixed case, digits, symbols each add a point.
 *  - Penalizes very common patterns.
 */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong";
  color: string; // Tailwind class on background
}

const COMMON = /^(password|qwerty|111111|123456|letmein|welcome)/i;

export function evaluatePassword(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: "Very weak", color: "bg-muted" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (COMMON.test(pw)) s = Math.max(0, s - 2);
  const score = Math.min(4, s) as PasswordStrength["score"];
  const map: Record<number, Omit<PasswordStrength, "score">> = {
    0: { label: "Very weak", color: "bg-destructive" },
    1: { label: "Weak", color: "bg-destructive/70" },
    2: { label: "Fair", color: "bg-warning" },
    3: { label: "Good", color: "bg-primary" },
    4: { label: "Strong", color: "bg-success" },
  };
  return { score, ...map[score] };
}
