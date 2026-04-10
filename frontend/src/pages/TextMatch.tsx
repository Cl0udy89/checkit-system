import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchTextMatchQuestions, submitGameScore, fetchGameStatus } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

interface Pair { id: number; term: string; definition: string }

interface Particle {
    id: number; x: number; y: number
    vx: number; vy: number; color: string; size: number
}

const GAME_DURATION_S = 90
const INITIAL_SCORE = 10000
const WRONG_PENALTY = 500
const DECAY_PER_S = INITIAL_SCORE / GAME_DURATION_S
const PARTICLE_COLORS = ['#00ff41', '#39ff14', '#ccff00', '#86efac', '#4ade80', '#a3e635', '#d9f99d', '#00ff41', '#39ff14']

function makeBurst(x: number, y: number, n = 18): Particle[] {
    return Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * Math.PI * 2
        const spd = 70 + Math.random() * 100
        return {
            id: Date.now() + i + Math.random(),
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 50,
            color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
            size: 5 + Math.random() * 6,
        }
    })
}

export default function TextMatch() {
    const navigate = useNavigate()
    const user = useGameStore(s => s.user)
    useEffect(() => { if (!user) navigate('/') }, [user, navigate])

    const { data: rawPairs, isLoading, error } = useQuery<Pair[]>({
        queryKey: ['textMatchQuestions'],
        queryFn: () => fetchTextMatchQuestions(8),
        retry: false,
    })

    const [started, setStarted] = useState(false)
    const [finished, setFinished] = useState(false)
    const [score, setScore] = useState(INITIAL_SCORE)
    const [termOrder, setTermOrder] = useState<number[]>([])
    const [defOrder, setDefOrder] = useState<number[]>([])
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
    const [matched, setMatched] = useState<Set<number>>(new Set())
    const [wrongPair, setWrongPair] = useState<{ term: number; def: number } | null>(null)
    const [particles, setParticles] = useState<Particle[]>([])
    const [submitted, setSubmitted] = useState(false)

    const startTimeRef = useRef<number>(0)
    const finishedRef = useRef(false)
    const scoreRef = useRef(INITIAL_SCORE)
    // ── PENALTY REF ── DO NOT REMOVE — accumulates wrong-pair penalties so the
    // decay timer doesn't overwrite them on its next 100ms tick
    const penaltyRef = useRef(0)
    const termCardRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const defCardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

    const pairsById: Record<number, Pair> = {}
    rawPairs?.forEach(p => { pairsById[p.id] = p })

    const shuffle = <T,>(arr: T[]): T[] => {
        const a = [...arr]
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]]
        }
        return a
    }

    useEffect(() => {
        if (!rawPairs?.length) return
        const ids = rawPairs.map(p => p.id)
        setTermOrder(shuffle(ids))
        setDefOrder(shuffle(ids))
    }, [rawPairs])

    // ── particles ─────────────────────────────────────────────────────────────
    const fireParticles = (id: number) => {
        const burst: Particle[] = []
            ;[termCardRefs.current.get(id), defCardRefs.current.get(id)].forEach(el => {
                if (!el) return
                const r = el.getBoundingClientRect()
                burst.push(...makeBurst(r.left + r.width / 2, r.top + r.height / 2))
            })
        if (!burst.length) return
        const ids = new Set(burst.map(p => p.id))
        setParticles(prev => [...prev, ...burst])
        setTimeout(() => setParticles(prev => prev.filter(p => !ids.has(p.id))), 900)
    }

    // ── submit ────────────────────────────────────────────────────────────────
    const submitMutation = useMutation({
        mutationFn: ({ finalScore }: { finalScore: number }) =>
            submitGameScore({
                user_id: user!.id,
                game_type: 'text_match',
                answers: {},
                duration_ms: Math.round(Date.now() - startTimeRef.current),
                score: finalScore,
            }),
    })

    const endGame = useCallback((finalScore: number) => {
        if (finishedRef.current) return
        finishedRef.current = true
        setFinished(true)
        if (!submitted) {
            setSubmitted(true)
            submitMutation.mutate({ finalScore })
        }
    }, [submitted])

    // ── live score decay ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!started || finished) return
        const interval = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000
            const remaining = Math.max(0, GAME_DURATION_S - elapsed)
            // ── PENALTY REF ── DO NOT REMOVE — subtract accumulated penalties so
            // timer ticks don't overwrite the -500 deductions
            const next = Math.max(0, Math.floor(INITIAL_SCORE - elapsed * DECAY_PER_S - penaltyRef.current))
            scoreRef.current = next
            setScore(next)
            if (remaining <= 0) endGame(0)
        }, 100)
        return () => clearInterval(interval)
    }, [started, finished, endGame])

    // ── all matched ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!started || finished || !rawPairs) return
        if (matched.size === rawPairs.length && rawPairs.length > 0)
            endGame(scoreRef.current)
    }, [matched, started, finished, rawPairs, endGame])

    // ── click handlers ────────────────────────────────────────────────────────
    const handleTermClick = (id: number) => {
        if (!started || finished || matched.has(id)) return
        setSelectedTerm(prev => (prev === id ? null : id))
        setWrongPair(null)
    }

    const handleDefClick = (id: number) => {
        if (!started || finished || matched.has(id) || selectedTerm === null) return
        if (selectedTerm === id) {
            fireParticles(id)
            setMatched(prev => new Set([...prev, id]))
            setSelectedTerm(null)
            setWrongPair(null)
        } else {
            setWrongPair({ term: selectedTerm, def: id })
            // ── PENALTY REF ── DO NOT REMOVE — update penaltyRef so the decay
            // timer accounts for this penalty on its next tick
            penaltyRef.current += WRONG_PENALTY
            setScore(prev => Math.max(0, prev - WRONG_PENALTY))
            setTimeout(() => { setWrongPair(null); setSelectedTerm(null) }, 650)
        }
    }

    const handleStart = () => {
        startTimeRef.current = Date.now()
        finishedRef.current = false
        scoreRef.current = INITIAL_SCORE
        penaltyRef.current = 0 // ── PENALTY REF ── DO NOT REMOVE
        setScore(INITIAL_SCORE)
        setStarted(true)
    }

    // Mid-game status polling (anti-cheat)
    const { isError: isPollError, error: pollError } = useQuery({
        queryKey: ['tmStatusPoll'],
        queryFn: () => fetchTextMatchQuestions(8),
        refetchInterval: 5000,
        retry: false,
        enabled: started && !finished
    })
    const pollDetail = (pollError as any)?.response?.data?.detail
    const pollBlocked = isPollError && (pollDetail === 'ZAWODY_ZAKONCZONE' || pollDetail === 'PRZERWA_TECHNICZNA')

    // ── game-status (already played) ──────────────────────────────────────────
    const { data: gameStatus } = useQuery({
        queryKey: ['gameStatus', user?.id],
        queryFn: () => user ? fetchGameStatus(user.id) : Promise.reject('No user'),
        enabled: !!user,
    })
    const alreadyPlayed = gameStatus?.text_match?.played === true
    const errDetail = (error as any)?.response?.data?.detail

    // ── early returns ─────────────────────────────────────────────────────────
    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center font-mono text-primary text-xl animate-pulse">
            &gt; ŁADOWANIE_PYTAŃ..._
        </div>
    )

    if (pollBlocked) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono">
            <div className="crt-border bg-surface p-8 max-w-md w-full text-center">
                <p className="text-primary/50 text-[10px] uppercase tracking-widest mb-2">&gt; SYSTEM_STATUS</p>
                <h1 className="text-2xl font-bold text-red-400 mb-4">{pollDetail === 'PRZERWA_TECHNICZNA' ? 'PRZERWA TECHNICZNA' : 'ZAWODY ZAKOŃCZONE'}</h1>
                <p className="text-primary/40 mb-8">{pollDetail === 'PRZERWA_TECHNICZNA' ? 'System chwilowo niedostępny.' : 'System zablokowany przez administratora.'}</p>
                <button onClick={() => navigate('/dashboard')} className="border border-primary/25 hover:border-primary/60 text-primary/60 hover:text-primary px-6 py-3 font-mono text-sm transition-all">&gt; POWRÓT</button>
            </div>
        </div>
    )

    if (errDetail === 'ZAWODY_ZAKONCZONE') return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono">
            <div className="crt-border bg-surface p-8 max-w-md w-full text-center">
                <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-red-400 mb-4">ZAWODY ZAKOŃCZONE</h1>
                <button onClick={() => navigate('/dashboard')} className="border border-primary/25 hover:border-primary/60 text-primary/60 hover:text-primary px-6 py-3 font-mono text-sm transition-all">&gt; POWRÓT</button>
            </div>
        </div>
    )

    if (errDetail === 'PRZERWA_TECHNICZNA') return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono">
            <div className="crt-border bg-surface p-8 max-w-md w-full text-center">
                <Clock size={48} className="text-accent mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-accent mb-4">PRZERWA TECHNICZNA</h1>
                <button onClick={() => navigate('/dashboard')} className="border border-primary/25 hover:border-primary/60 text-primary/60 hover:text-primary px-6 py-3 font-mono text-sm transition-all">&gt; POWRÓT</button>
            </div>
        </div>
    )

    if (errDetail === 'ALREADY_PLAYED' || alreadyPlayed) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono">
            <div className="crt-border bg-surface p-8 max-w-md w-full text-center">
                <CheckCircle size={48} className="text-primary mx-auto mb-4" />
                <p className="text-primary/50 text-[10px] uppercase tracking-widest mb-2">&gt; STATUS</p>
                <h1 className="text-2xl font-bold text-primary text-glow mb-2">JUŻ ZAGRANO!</h1>
                <p className="text-primary/40 mb-6 font-mono">Twój wynik: <span className="text-primary font-black">{gameStatus?.text_match?.score ?? '—'}</span> PKT</p>
                <button onClick={() => navigate('/dashboard')} className="border border-primary/25 hover:border-primary/60 text-primary/60 hover:text-primary px-6 py-3 font-mono text-sm transition-all">&gt; POWRÓT</button>
            </div>
        </div>
    )

    // ── finished ───────────────────────────────────────────────────────────────
    if (finished) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 font-mono p-8">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="crt-border bg-surface p-10 md:p-12 max-w-xl w-full text-center flex flex-col items-center gap-6"
            >
                <Trophy size={56} className={score >= 5000 ? 'text-accent text-glow' : 'text-primary/30'} />
                <p className="text-primary/50 text-[10px] uppercase tracking-widest">&gt; TEXT_MATCH // WYNIK</p>
                <h1 className="text-3xl font-bold text-white">GRA SKOŃCZONA</h1>
                <span className={`font-mono font-black tabular-nums text-glow-lg ${score >= 5000 ? 'text-primary' : 'text-red-400'}`} style={{ fontSize: 'clamp(3rem, 12vw, 6rem)' }}>{score}</span>
                <p className="text-primary/40 text-lg">PUNKTÓW</p>
                <p className="text-primary/30 text-sm">{matched.size}/{rawPairs?.length ?? 0} par dopasowanych</p>
                <button onClick={() => navigate('/dashboard')}
                    className="mt-4 px-8 py-3 border border-primary/25 hover:border-primary/60 bg-primary/[0.04] hover:bg-primary/[0.08] text-primary/60 hover:text-primary font-bold transition-all font-mono text-sm">
                    &gt; POWRÓT_DO_MENU
                </button>
            </motion.div>
        </div>
    )

    // ── start screen ───────────────────────────────────────────────────────────
    if (!started) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 font-mono p-8">
            {/* Grid bg */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
                backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />
            <img src={sparkSomeLogo} alt="SparkSome" className="h-12 invert opacity-50 mb-2 relative z-10" />
            <div className="crt-border bg-surface p-8 md:p-10 max-w-lg w-full text-center relative z-10">
                {/* Terminal titlebar */}
                <div className="flex items-center gap-2 pb-4 mb-6 border-b border-primary/20">
                    <div className="w-2 h-2 bg-primary/40" />
                    <div className="w-2 h-2 bg-primary/20" />
                    <div className="w-2 h-2 bg-primary/20" />
                    <span className="text-primary/40 text-[10px] ml-2">text_match.sh</span>
                </div>

                <Link2 size={48} className="text-primary text-glow mx-auto mb-4" />
                <p className="text-primary/50 text-[10px] uppercase tracking-widest mb-2">&gt; GAME</p>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-4">TEXT_MATCH</h1>
                <p className="text-primary/40 text-sm leading-relaxed mt-2 mb-6">
                    Dopasuj pojęcia IT do ich definicji.<br />
                    Kliknij termin po lewej, potem definicję po prawej.<br />
                    Punkty <span className="text-accent font-bold">uciekają z czasem</span> —{' '}
                    za błąd dodatkowe <span className="text-red-400 font-bold">-500 pkt</span>!
                </p>
                <div className="flex items-center gap-3 justify-center mb-4 border border-primary/20 bg-primary/[0.04] px-5 py-3">
                    <span className="font-mono font-black text-primary text-glow-lg text-2xl">10 000</span>
                    <span className="text-primary/40 text-sm">punktów startowych</span>
                </div>
                <div className="text-primary/30 text-xs mb-6 font-mono">{rawPairs?.length ?? 0} PAR DO DOPASOWANIA</div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleStart}
                    className="w-full py-4 bg-primary hover:bg-green-300 text-black font-black text-lg tracking-widest uppercase transition-colors font-mono">
                    &gt; START_GIER
                </motion.button>
            </div>
        </div>
    )

    // ── game screen ────────────────────────────────────────────────────────────
    const total = rawPairs?.length ?? 0
    const pct = total > 0 ? matched.size / total : 0
    const rows = total || 1

    return (
        <div className="fixed inset-0 flex flex-col p-2 md:p-3 font-mono text-white overflow-hidden">

            {/* ── particles overlay ── */}
            <div className="fixed inset-0 pointer-events-none z-[200]">
                <AnimatePresence>
                    {particles.map(p => (
                        <motion.div key={p.id}
                            style={{
                                position: 'absolute', top: 0, left: 0, width: p.size, height: p.size,
                                backgroundColor: p.color,
                                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                                transform: 'translate(-50%,-50%)'
                            }}
                            initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                            animate={{ x: p.x + p.vx, y: p.y + p.vy + 60, opacity: 0, scale: 0 }}
                            exit={{}}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* ── header ── */}
            <div className="flex items-center justify-between shrink-0 mb-2 crt-border bg-surface px-3 py-2">
                <img src={sparkSomeLogo} alt="SparkSome" className="h-7 md:h-9 invert opacity-50" />
                <div className="flex items-center gap-2">
                    <Link2 size={14} className="text-primary" />
                    <span className="text-sm md:text-base font-bold tracking-widest font-mono text-primary text-glow">TEXT_MATCH</span>
                </div>
                <div className="flex flex-col items-end leading-none">
                    <motion.span
                        key={score}
                        initial={{ scale: 1.15 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.15 }}
                        className="font-mono font-black text-primary text-glow tabular-nums text-xl md:text-2xl"
                    >
                        {score.toString().padStart(5, '0')}
                    </motion.span>
                    <span className="text-[9px] text-primary/40 uppercase tracking-widest">PKT</span>
                </div>
            </div>

            {/* ── progress bar ── */}
            <div className="shrink-0 mb-1.5">
                <div className="flex justify-between text-[10px] text-primary/40 mb-0.5 font-mono">
                    <span>Pozostało: <b className="text-white">{total - matched.size}</b>/{total}</span>
                    <span className="text-primary font-bold">{matched.size} ✓</span>
                </div>
                <div className="h-px bg-primary/10 overflow-hidden">
                    <motion.div className="h-full bg-primary shadow-[0_0_8px_rgba(0,255,65,0.8)]"
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ duration: 0.35 }} />
                </div>
            </div>

            {/* ── column headers ── */}
            <div className="flex gap-2 shrink-0 mb-1">
                <div className="flex-1 text-center text-[10px] font-bold text-primary/40 uppercase tracking-widest">&gt; POJĘCIA</div>
                <div className="w-px" />
                <div className="flex-1 text-center text-[10px] font-bold text-primary/40 uppercase tracking-widest">&gt; DEFINICJE</div>
            </div>

            {/* ── card grid ── */}
            <div className="flex gap-2 flex-1 min-h-0">

                {/* LEFT – terms */}
                <div
                    className="flex-1 grid min-h-0"
                    style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, gap: '6px' }}
                >
                    {termOrder.map(id => {
                        const pair = pairsById[id]
                        if (!pair) return <div key={`t${id}`} />
                        const isMatched = matched.has(id)
                        const sel = selectedTerm === id
                        const wrong = wrongPair?.term === id
                        return (
                            <AnimatePresence key={`t${id}`} mode="wait">
                                {isMatched ? (
                                    <motion.div
                                        key="matched"
                                        initial={{ opacity: 1, scale: 1, y: 0 }}
                                        animate={{ opacity: 0, scale: 0.7, y: -30 }}
                                        transition={{ duration: 0.45, ease: 'backIn' }}
                                        className="border border-transparent bg-transparent"
                                    />
                                ) : (
                                    <motion.div
                                        key="card"
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={wrong
                                            ? { x: [0, -10, 10, -6, 6, 0], opacity: 1, scale: 1 }
                                            : { x: 0, opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.28 }}
                                        ref={(el: HTMLDivElement | null) => {
                                            if (el) termCardRefs.current.set(id, el)
                                            else termCardRefs.current.delete(id)
                                        }}
                                        onClick={() => handleTermClick(id)}
                                        className={[
                                            'flex items-center justify-center px-3 border min-h-0',
                                            'text-center text-sm md:text-base font-bold select-none cursor-pointer',
                                            'transition-colors leading-snug overflow-hidden',
                                            sel ? 'bg-primary/15 border-primary text-white shadow-[0_0_20px_rgba(0,255,65,0.3)]'
                                                : wrong
                                                    ? 'bg-red-500/10 border-red-500 text-red-300'
                                                    : 'bg-primary/[0.03] border-primary/20 hover:border-primary/50 hover:bg-primary/[0.07] text-primary/70 hover:text-white',
                                        ].join(' ')}
                                    >
                                        <span className="text-center font-mono">{pair.term}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )
                    })}
                </div>

                {/* Divider */}
                <div className="w-px bg-primary/15 shrink-0 self-stretch" />

                {/* RIGHT – definitions */}
                <div
                    className="flex-1 grid min-h-0"
                    style={{ gridTemplateRows: `repeat(${rows}, 1fr)`, gap: '6px' }}
                >
                    {defOrder.map(id => {
                        const pair = pairsById[id]
                        if (!pair) return <div key={`d${id}`} />
                        const isMatched = matched.has(id)
                        const wrong = wrongPair?.def === id
                        const hilight = selectedTerm !== null
                        return (
                            <AnimatePresence key={`d${id}`} mode="wait">
                                {isMatched ? (
                                    <motion.div
                                        key="matched"
                                        initial={{ opacity: 1, scale: 1, y: 0 }}
                                        animate={{ opacity: 0, scale: 0.7, y: -30 }}
                                        transition={{ duration: 0.45, ease: 'backIn' }}
                                        className="border border-transparent bg-transparent"
                                    />
                                ) : (
                                    <motion.div
                                        key="card"
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={wrong
                                            ? { x: [0, 10, -10, 6, -6, 0], opacity: 1, scale: 1 }
                                            : { x: 0, opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.28 }}
                                        ref={(el: HTMLDivElement | null) => {
                                            if (el) defCardRefs.current.set(id, el)
                                            else defCardRefs.current.delete(id)
                                        }}
                                        onClick={() => handleDefClick(id)}
                                        className={[
                                            'flex items-center justify-center px-3 border min-h-0',
                                            'text-center text-xs md:text-sm leading-snug select-none cursor-pointer',
                                            'transition-colors overflow-hidden',
                                            wrong ? 'bg-red-500/10 border-red-500 text-red-300'
                                                : hilight
                                                    ? 'bg-primary/[0.03] border-primary/20 hover:border-primary/50 hover:bg-primary/[0.07] text-primary/60 hover:text-white ring-1 ring-primary/15'
                                                    : 'bg-primary/[0.03] border-primary/20 hover:border-primary/40 hover:bg-primary/[0.07] text-primary/50 hover:text-white',
                                        ].join(' ')}
                                    >
                                        <span className="text-center font-mono">{pair.definition}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}
