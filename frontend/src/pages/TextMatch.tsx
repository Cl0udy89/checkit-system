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
const PARTICLE_COLORS = ['#4ade80', '#86efac', '#facc15', '#a78bfa', '#60a5fa', '#f87171', '#fb923c', '#34d399', '#f472b6']

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
            const next = Math.max(0, Math.floor(INITIAL_SCORE - elapsed * DECAY_PER_S))
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
            setScore(prev => { const n = Math.max(0, prev - WRONG_PENALTY); scoreRef.current = n; return n })
            setTimeout(() => { setWrongPair(null); setSelectedTerm(null) }, 650)
        }
    }

    const handleStart = () => {
        startTimeRef.current = Date.now()
        finishedRef.current = false
        scoreRef.current = INITIAL_SCORE
        setScore(INITIAL_SCORE)
        setStarted(true)
    }

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
        <div className="min-h-screen flex items-center justify-center font-mono text-white text-2xl animate-pulse">
            ŁADOWANIE PYTAŃ...
        </div>
    )

    if (errDetail === 'ZAWODY_ZAKONCZONE') return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono text-white">
            <XCircle size={64} className="text-red-500" />
            <h1 className="text-4xl font-bold text-red-500">ZAWODY ZAKOŃCZONE</h1>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 border border-gray-600 rounded-lg hover:border-white transition-colors">POWRÓT</button>
        </div>
    )

    if (errDetail === 'PRZERWA_TECHNICZNA') return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono text-white">
            <Clock size={64} className="text-yellow-400" />
            <h1 className="text-4xl font-bold text-yellow-400">PRZERWA TECHNICZNA</h1>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 border border-gray-600 rounded-lg hover:border-white transition-colors">POWRÓT</button>
        </div>
    )

    if (errDetail === 'ALREADY_PLAYED' || alreadyPlayed) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 font-mono text-white">
            <CheckCircle size={64} className="text-green-500" />
            <h1 className="text-4xl font-bold text-green-500">JUŻ ZAGRANO!</h1>
            <p className="text-gray-400 text-xl">Twój wynik: {gameStatus?.text_match?.score ?? '—'} PKT</p>
            <button onClick={() => navigate('/dashboard')} className="px-6 py-3 border border-gray-600 rounded-lg hover:border-white transition-colors">POWRÓT</button>
        </div>
    )

    // ── finished ───────────────────────────────────────────────────────────────
    if (finished) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 font-mono text-white p-8">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="flex flex-col items-center gap-6 bg-surface/80 border-2 border-gray-700 rounded-3xl p-12 max-w-xl w-full text-center"
            >
                <Trophy size={72} className={score >= 5000 ? 'text-yellow-400' : 'text-gray-500'} />
                <h1 className="text-5xl font-bold">GRA SKOŃCZONA</h1>
                <div className={`text-8xl font-black ${score >= 5000 ? 'text-green-400' : 'text-red-400'}`}>{score}</div>
                <p className="text-gray-400 text-xl">PUNKTÓW</p>
                <p className="text-gray-500 text-sm">{matched.size}/{rawPairs?.length ?? 0} par dopasowanych</p>
                <button onClick={() => navigate('/dashboard')}
                    className="mt-4 px-8 py-3 bg-primary/20 border border-primary text-primary rounded-xl font-bold hover:bg-primary/40 transition-all">
                    POWRÓT DO MENU
                </button>
            </motion.div>
        </div>
    )

    // ── start screen ───────────────────────────────────────────────────────────
    if (!started) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 font-mono text-white p-8">
            <img src={sparkSomeLogo} alt="SparkSome" className="h-12 invert mb-4" />
            <div className="flex flex-col items-center gap-4 bg-surface/80 border-2 border-secondary/50 rounded-3xl p-10 max-w-lg w-full text-center">
                <Link2 size={56} className="text-secondary mb-2" />
                <h1 className="text-4xl font-bold tracking-tight">TEXT_MATCH</h1>
                <p className="text-gray-400 text-base leading-relaxed mt-2">
                    Dopasuj pojęcia IT do ich definicji.<br />
                    Kliknij termin po lewej, potem definicję po prawej.<br />
                    Punkty <span className="text-yellow-400 font-bold">uciekają z czasem</span> –{' '}
                    za błąd dodatkowe <span className="text-red-400 font-bold">-500 pkt</span>!
                </p>
                <div className="flex items-center gap-3 mt-3 px-5 py-2.5 bg-accent/10 border border-accent/30 rounded-xl">
                    <span className="text-accent font-black text-2xl">10 000</span>
                    <span className="text-gray-400 text-sm">punktów startowych</span>
                </div>
                <div className="text-gray-600 text-sm mt-1">{rawPairs?.length ?? 0} par do dopasowania</div>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={handleStart}
                    className="mt-6 w-full py-4 bg-secondary text-black font-black text-xl rounded-xl tracking-widest hover:brightness-110 transition-all">
                    START
                </motion.button>
            </div>
        </div>
    )

    // ── game screen ────────────────────────────────────────────────────────────
    const total = rawPairs?.length ?? 0
    const pct = total > 0 ? matched.size / total : 0
    // Keep grid rows fixed at total count — matched cards become invisible placeholders
    const rows = total || 1

    return (
        <div className="fixed inset-0 flex flex-col p-2 md:p-3 font-mono text-white overflow-hidden bg-transparent">

            {/* ── particles overlay ── */}
            <div className="fixed inset-0 pointer-events-none z-[200]">
                <AnimatePresence>
                    {particles.map(p => (
                        <motion.div key={p.id}
                            style={{
                                position: 'absolute', top: 0, left: 0, width: p.size, height: p.size,
                                borderRadius: '50%', backgroundColor: p.color,
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
            <div className="flex items-center justify-between shrink-0 mb-1.5">
                <img src={sparkSomeLogo} alt="SparkSome" className="h-7 invert" />
                <span className="text-sm font-bold tracking-widest">TEXT_MATCH</span>
                <div className="flex flex-col items-end leading-none">
                    <motion.span
                        key={score}
                        initial={{ scale: 1.2, color: '#facc15' }}
                        animate={{ scale: 1, color: '#facc15' }}
                        transition={{ duration: 0.15 }}
                        className="text-2xl font-black text-accent tabular-nums"
                    >
                        {score.toString().padStart(5, '0')}
                    </motion.span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">pkt</span>
                </div>
            </div>

            {/* ── progress bar ── */}
            <div className="shrink-0 mb-1.5">
                <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                    <span>Pozostało: <b className="text-white">{total - matched.size}</b>/{total}</span>
                    <span className="text-green-400 font-bold">{matched.size} ✓</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-green-400 rounded-full"
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ duration: 0.35 }} />
                </div>
            </div>

            {/* ── column headers ── */}
            <div className="flex gap-2 shrink-0 mb-1">
                <div className="flex-1 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pojęcia</div>
                <div className="w-px" />
                <div className="flex-1 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">Definicje</div>
            </div>

            {/* ── card grid — FIXED rows, matched cards are transparent placeholders ── */}
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
                                    // Invisible placeholder — keeps the grid row alive
                                    <motion.div
                                        key="matched"
                                        initial={{ opacity: 1, scale: 1, y: 0 }}
                                        animate={{ opacity: 0, scale: 0.7, y: -30 }}
                                        transition={{ duration: 0.45, ease: 'backIn' }}
                                        className="rounded-xl border-2 border-transparent bg-transparent"
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
                                            'flex items-center justify-center px-3 rounded-xl border-2 min-h-0',
                                            'text-center text-sm md:text-base lg:text-lg font-bold select-none cursor-pointer',
                                            'transition-colors leading-snug overflow-hidden',
                                            sel ? 'bg-secondary/25 border-secondary text-white shadow-[0_0_18px_rgba(99,102,241,0.5)]'
                                                : wrong
                                                    ? 'bg-red-500/20 border-red-500 text-red-300'
                                                    : 'bg-white/5 border-gray-600 hover:border-secondary/70 hover:bg-secondary/10 text-white',
                                        ].join(' ')}
                                    >
                                        <span className="text-center">{pair.term}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )
                    })}
                </div>

                {/* Divider */}
                <div className="w-px bg-gray-700 shrink-0 self-stretch" />

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
                                        className="rounded-xl border-2 border-transparent bg-transparent"
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
                                            'flex items-center justify-center px-3 rounded-xl border-2 min-h-0',
                                            'text-center text-xs md:text-sm lg:text-base leading-snug select-none cursor-pointer',
                                            'transition-colors overflow-hidden',
                                            wrong ? 'bg-red-500/20 border-red-500 text-red-300'
                                                : hilight
                                                    ? 'bg-white/5 border-gray-600 hover:border-primary hover:bg-primary/10 text-gray-100 ring-1 ring-primary/20'
                                                    : 'bg-white/5 border-gray-600 hover:border-primary/60 hover:bg-primary/10 text-gray-300',
                                        ].join(' ')}
                                    >
                                        <span className="text-center">{pair.definition}</span>
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
