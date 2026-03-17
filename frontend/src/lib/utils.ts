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
//   4. o/u vowel swap           (sk0rwiel → skorwiel → skurwiel)
// Nick field already strips non-alphanumeric, so only [a-z0-9] reach here.

const LEET: Record<string, string> = {
    '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a',
    '5': 's', '6': 'g', '7': 't', '8': 'b', '9': 'g',
}

// Roots (lowercase, no diacritics, no doubles, no special chars — only a-z0-9).
// The nick field strips non-alphanumeric before reaching this function,
// so roots with diacritics (ą,ę,ć…) or underscores/dots are useless and excluded.
const BAD_ROOTS: string[] = [
    // Polish — kurw*
    'skurwysyn', 'skurwiel', 'kurwiszcze', 'kurwiszon', 'kurwisko', 'kurwiarski',
    'kurewski', 'kurewstwo', 'kurwica', 'zakurwic', 'wykurwic', 'odkurwic', 'podkurwic',
    'skurwic', 'kurwidolek', 'kurewka', 'kurwa', 'kuwa', 'qurwa',

    // Polish — jeb*
    'jebac', 'jebie', 'jebiesz', 'jebany', 'jebana', 'jebane', 'jebanca', 'jebancu',
    'jebak', 'jebaka', 'jebanko', 'dojebac', 'dojebie', 'dojebany',
    'odjebac', 'odjebie', 'odjebany', 'podjebac', 'podjebie', 'pojeb',
    'pojeba', 'pojebie', 'pojebany', 'pojebana', 'przejebac', 'przejebane',
    'rozjebac', 'rozjebie', 'rozjebany', 'ujebac', 'ujebany',
    'wyjebac', 'wyjebie', 'wyjebany', 'wyjebka', 'zajebac', 'zajebie',
    'zajebisty', 'zajebista', 'zajebiscie', 'zjebac', 'zjebany', 'zjeb',
    'niedojeb', 'mozgojeb', 'jeba',

    // Polish — pierd*
    'pierdolic', 'pierdolony', 'pierdolona', 'pierdolone', 'pierdolniety', 'pierdolca',
    'pierdolec', 'pierdolisko', 'dopierdolic', 'odpierdolic', 'odpierdalaj',
    'opierdolic', 'opierdalac', 'popierdolic', 'popierdolony', 'przepierdolic',
    'rozpierdolic', 'rozpierdol', 'rozpierducha', 'spierdolic', 'spierdalaj',
    'wpierdolic', 'wpierdol', 'wypierdolic', 'wypierdalaj', 'zapierdolic',
    'zapierdalac', 'zapierdol', 'pierdol', 'spierdal',

    // Polish — chuj / huj / pizd
    'chujowy', 'chujowa', 'chujowo', 'chujnia', 'chujec', 'chujek', 'chuj',
    'hujowy', 'hujowa', 'hujowo', 'hujnia', 'odchuj', 'pachuj', 'nachuj', 'huj',
    'pizda', 'pizde', 'pizdo', 'pizdy', 'pizdnac', 'pizdziel', 'pizdooki',
    'pizdus', 'pizdnij', 'pizdaj', 'pizd',

    // Polish — anatomia, seks
    'cipka', 'cipsko', 'cipon', 'ciposzka', 'cipa', 'cipe', 'cipie', 'cipko',
    'kutasiarz', 'kutafon', 'kutas',
    'fiutek', 'fiucie', 'fiut',
    'siurek', 'siusiak', 'siur',
    'pindol', 'pindolony', 'pinda',
    'dupsko', 'dupcia', 'dupeczka', 'dupek', 'dupoliz', 'dupowlaz', 'dupa',
    'pochwa', 'wagina', 'penis', 'moszna', 'odbyt',
    'cycek', 'cycki', 'cyce', 'cycol',
    'ruchac', 'ruchanko', 'ruchacz',
    'rznac', 'lodzik', 'lodziarz',

    // Polish — obelgi / slang
    'dziwkarz', 'dziwkarski', 'dziwka',
    'szmaciarz', 'szmacic', 'szmata',
    'scwelic', 'cwela', 'cwelu', 'cwel',
    'pedalski', 'pedzio', 'pedal',
    'ciotowaty', 'ciota',
    'debila', 'debilu', 'debil',
    'idiota', 'kretyn', 'imbecyl',
    'oszolom', 'psychol', 'suczka', 'suka', 'sucz',
    'incel', 'cuck', 'stuleja', 'stulejarz',
    'gnojek', 'gnoju',
    'wkurwic', 'wkurw',

    // Memy / nicki
    'twojastara', 'twojastary', 'jp2gmd', 'hwdp', 'chwdp',
    'motherfucker', 'madofaka', 'retard',
    'fakju', 'faken', 'bitcz', 'szit',

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
    // Polish o/ó/u ambiguity: '0' maps to 'o' by leet but users also use it for 'u'
    // (sk0rwiel → skorwiel → after o→u: skurwiel). Run a second pass with o→u.
    const normOU = norm.replace(/o/g, 'u')

    for (const root of BAD_ROOTS) {
        // Direct substring match (covers basic + leet + collapsed)
        if (norm.includes(root)) return true
        if (normOU.includes(root)) return true

        // Insertion obfuscation: allow up to 1 extra char between each letter
        // e.g. "kXurwa" → matches k.?u.?r.?w.?a
        if (root.length >= 4) {
            const pattern = root.split('').join('.{0,1}')
            const re = new RegExp(pattern)
            if (re.test(norm)) return true
            if (re.test(normOU)) return true
        }
    }
    return false
}
