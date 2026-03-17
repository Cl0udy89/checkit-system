import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// ─── Profanity filter ─────────────────────────────────────────────────────────
// Covers Polish + English bad words with:
//   1. Leet-speak substitution  (k4rwa → karwa → kurwa via regex)
//   2. Repeated-char collapse   (kuurwwaa → kurwa)
//   3. Single-char insertion    (kXurwa matches k.?u.?r.?w.?a)
// Nick field already strips non-alphanumeric, so only [a-z0-9] reach here.

const LEET: Record<string, string> = {
    '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a',
    '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
}

// Roots (lowercase, no diacritics). Longer roots first avoids shadowing issues.
const BAD_ROOTS: string[] = [
    // Polish
    'skurwysyn', 'skurwiel', 'spierdalaj', 'spierdal', 'pierdolic', 'pierdol',
    'jebanie', 'jebany', 'jebana', 'jebac', 'jeba',
    'wkurwic', 'wkurw', 'kurewski', 'kurwa', 'kuwa',
    'dziwka', 'cwel', 'dupek', 'dupa', 'cipa',
    'pizda', 'pizd',
    'chuj', 'huj',
    // English
    'asshole', 'faggot', 'nigger', 'nigga',
    'bitch', 'cunt', 'fuck', 'shit',
    'pussy', 'whore', 'cock', 'dick',
]

function normalizeProfanity(s: string): string {
    // 1. lowercase + leet substitution
    const leeted = s.toLowerCase().replace(/[0-9]/g, c => LEET[c] ?? c)
    // 2. collapse consecutive repeated chars (kuurwwaa → kurwa)
    return leeted.replace(/(.)\1+/g, '$1')
}

/** Returns true when the nick contains a known profanity root,
 *  including common obfuscation techniques. */
export function containsProfanity(nick: string): boolean {
    const norm = normalizeProfanity(nick)

    for (const root of BAD_ROOTS) {
        // Direct substring match (covers basic + leet + collapsed)
        if (norm.includes(root)) return true

        // Insertion obfuscation: allow up to 1 extra char between each letter
        // e.g. "kXurwa" → matches k.?u.?r.?w.?a
        if (root.length >= 4) {
            const pattern = root.split('').join('.{0,1}')
            if (new RegExp(pattern).test(norm)) return true
        }
    }
    return false
}
