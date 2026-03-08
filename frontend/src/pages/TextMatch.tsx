import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchTextMatchQuestions, submitGameScore, fetchGameStatus } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, CheckCircle, XCircle, Clock, Trophy } from 'lucide-react'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

interface Pair {
    id: number
    term: string
    definition: string
}

interface Particle {
    id: number
    x: number
    y: number
    vx: number
    vy: number
    color: string
    size: number
}

const INITIAL_SCORE = 10000
const WRONG_PENALTY = 500
const GAME_TIMEOUT_S = 300
const PARTICLE_COLORS = ['#4ade80', '#86efac', '#facc15', '#a78bfa', '#60a5fa', '#f87171', '#fb923c']

function spawnBurst(x: number, y: number, count = 14): Particle[] {
    return Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2
        const speed = 60 + Math.random() * 80
        return {
            id: Date.now() + i + Math.random(),
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 40,
            color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
            size: 5 + Math.random() * 5,
        }
    })
}

export default function TextMatch() {
    const navigate = useNavigate()
    const user = useGameStore(state => state.user)

    useEffect(() => { if (!user) navigate('/') }, [user, navigate])

    const { data: rawPairs, isLoading, error } = useQuery<Pair[]>({
        queryKey: ['textMatchQuestions'],
        queryFn: () => fetchTextMatchQuestions(8),
        retry: false,
    })

    const [started, setStarted] = useState(false)
    const [finished, setFinished] = useState(false)
    const [score, setScore] = useState(INITIAL_SCORE)
    const startTimeRef = useRef<number>(0)
    const finishedRef = useRef(false)
    const scoreRef = useRef(INITIAL_SCORE)

    const [termOrder, setTermOrder] = useState<number[]>([])
    const [defOrder, setDefOrder] = useState<number[]>([])
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
    const [matched, setMatched] = useState<Set<number>>(new Set())
    const [wrongPair, setWrongPair] = useState<{ term: number; def: number } | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const [particles, setParticles] = useState<Particle[]>([])

    // Refs for card positions (to spawn particles)
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
        if (!rawPairs || rawPairs.length === 0) return
        const ids = rawPairs.map(p => p.id)
        setTermOrder(shuffle(ids))
        setDefOrder(shuffle(ids))
    }, [rawPairs])

    const fireParticles = (id: number) => {
        const sources: Particle[] = []
        const termEl = termCardRefs.current.get(id)
        const defEl = defCardRefs.current.get(id)
        if (termEl) {
            const r = termEl.getBoundingClientRect()
            sources.push(...spawnBurst(r.left + r.width / 2, r.top + r.height / 2))
        }
        if (defEl) {
            const r = defEl.getBoundingClientRect()
            sources.push(...spawnBurst(r.left + r.width / 2, r.top + r.height / 2))
        }
        if (sources.length === 0) return
        setParticles(prev => [...prev, ...sources])
        setTimeout(() => {
            setParticles(prev => prev.filter(p => !sources.find(s => s.id === p.id)))
        }, 750)
    }

    const submitMutation = useMutation({
        mutationFn: ({ finalScore }: { finalScore: number }) =>
            submitGameScore({
                user_id: user!.id,
                game_type: 'text_match',
                answers: {},
                duration_ms: Math.round((Date.now() - startTimeRef.current)),
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

    useEffect(() => {
        if (!started || finished) return
        const t = setTimeout(() => endGame(scoreRef.current), GAME_TIMEOUT_S * 1000)
        return () => clearTimeout(t)
    }, [started, finished, endGame])

    useEffect(() => {
        if (!started || finished || !rawPairs) return
        if (matched.size === rawPairs.length && rawPairs.length > 0) {
            endGame(scoreRef.current)
        }
    }, [matched, started, finished, rawPairs, endGame])

    const handleTermClick = (id: number) => {
        if (!started || finished || matched.has(id)) return
        setSelectedTerm(prev => (prev === id ? null : id))
        setWrongPair(null)
    }

    const handleDefClick = (id: number) => {
        if (!started || finished || matched.has(id)) return
        if (selectedTerm === null) return

        if (selectedTerm === id) {
            fireParticles(id)
            setMatched(prev => new Set([...prev, id]))
            setSelectedTerm(null)
            setWrongPair(null)
        } else {
            setWrongPair({ term: selectedTerm, def: id })
            setScore(prev => {
                const next = Math.max(0, prev - WRONG_PENALTY)
                scoreRef.current = next
                return next
            })
            setTimeout(() => {
                setWrongPair(null)
                setSelectedTerm(null)
            }, 650)
        }
    }

    const handleStart = () => {
        startTimeRef.current = Date.now()
        finishedRef.current = false
        scoreRef.current = INITIAL_SCORE
        setStarted(true)
        setScore(INITIAL_SCORE)
    }

    const { data: gameStatus } = useQuery({
        queryKey: ['gameStatus', user?.id],
        queryFn: () => user ? fetchGameStatus(user.id) : Promise.reject('No user'),
        enabled: !!user,
    })
    const alreadyPlayed = gameStatus?.text_match?.played === true
    const errDetail = (error as any)?.response?.data?.detail

    // ── Loading & error states ───────────────────────────────────────────────
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

    // ── Finished screen ──────────────────────────────────────────────────────
    if (finished) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 font-mono text-white p-8">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="flex flex-col items-center gap-6 bg-surface/80 border-2 border-gray-700 rounded-3xl p-12 max-w-xl w-full text-center"
            >
                <Trophy size={72} className={score >= 5000 ? 'text-yellow-400' : 'text-gray-500'} />
                <h1 className="text-5xl font-bold text-white">GRA SKOŃCZONA</h1>
                <div className={`text-8xl font-black ${score >= 5000 ? 'text-green-400' : 'text-red-400'}`}>{score}</div>
                <p className="text-gray-400 text-xl">PUNKTÓW</p>
                <p className="text-gray-500 text-sm">{matched.size}/{rawPairs?.length ?? 0} par dopasowanych</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-4 px-8 py-3 bg-primary/20 border border-primary text-primary rounded-xl font-bold hover:bg-primary/40 transition-all"
                >
                    POWRÓT DO MENU
                </button>
            </motion.div>
        </div>
    )

    // ── Start screen ─────────────────────────────────────────────────────────
    if (!started) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 font-mono text-white p-8">
            <img src={sparkSomeLogo} alt="SparkSome" className="h-12 invert mb-4" />
            <div className="flex flex-col items-center gap-4 bg-surface/80 border-2 border-secondary/50 rounded-3xl p-10 max-w-lg w-full text-center">
                <Link2 size={56} className="text-secondary mb-2" />
                <h1 className="text-4xl font-bold text-white tracking-tight">TEXT_MATCH</h1>
                <p className="text-gray-400 text-base leading-relaxed mt-2">
                    Dopasuj pojęcia IT do ich definicji.<br />
                    Kliknij termin po lewej, potem pasującą definicję po prawej.<br />
                    Za każdą błędną odpowiedź tracisz{' '}
                    <span className="text-red-400 font-bold">500 punktów</span>!
                </p>
                <div className="flex items-center gap-3 mt-3 px-5 py-2.5 bg-accent/10 border border-accent/30 rounded-xl">
                    <span className="text-accent font-black text-2xl">10 000</span>
                    <span className="text-gray-400 text-sm">punktów startowych</span>
                </div>
                <div className="text-gray-600 text-sm mt-1">
                    {rawPairs?.length ?? 0} par do dopasowania
                </div>
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStart}
                    className="mt-6 w-full py-4 bg-secondary text-black font-black text-xl rounded-xl tracking-widest hover:brightness-110 transition-all"
                >
                    START
                </motion.button>
            </div>
        </div>
    )

    // ── Game screen ──────────────────────────────────────────────────────────
    const total = rawPairs?.length ?? 0
    const remaining = total - matched.size

    return (
        <div className="h-[100dvh] flex flex-col p-3 md:p-4 font-mono text-white overflow-hidden">

            {/* Particle overlay */}
            <div className="fixed inset-0 pointer-events-none z-[100]">
                <AnimatePresence>
                    {particles.map(p => (
                        <motion.div
                            key={p.id}
                            initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
                            animate={{ x: p.x + p.vx, y: p.y + p.vy + 60, opacity: 0, scale: 0.3 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.65, ease: 'easeOut' }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: p.size,
                                height: p.size,
                                borderRadius: '50%',
                                backgroundColor: p.color,
                                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                                transform: 'translate(-50%, -50%)',
                            }}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between shrink-0 mb-2">
                <img src={sparkSomeLogo} alt="SparkSome" className="h-7 invert" />
                <h1 className="text-base font-bold tracking-widest text-white">TEXT_MATCH</h1>
                <div className="flex flex-col items-end">
                    <div className="text-2xl font-black text-accent tabular-nums leading-none">
                        {score.toString().padStart(5, '0')}
                    </div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest">pkt</div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="shrink-0 mb-2">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Pozostało: <span className="text-white font-bold">{remaining}</span>/{total}</span>
                    <span className="text-green-400 font-bold">{matched.size} ✓</span>
                </div>
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-green-400 rounded-full"
                        animate={{ width: `${total > 0 ? (matched.size / total) * 100 : 0}%` }}
                        transition={{ duration: 0.35 }}
                    />
                </div>
            </div>

            {/* Two columns – fill remaining height */}
            <div className="flex gap-3 md:gap-4 flex-1 min-h-0">

                {/* LEFT: Terms */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest text-center mb-1.5 shrink-0 font-bold">
                        Pojęcia
                    </div>
                    <div className="flex-1 flex flex-col min-h-0 gap-1.5">
                        <AnimatePresence mode="popLayout">
                            {termOrder.filter(id => !matched.has(id)).map(id => {
                                const pair = pairsById[id]
                                if (!pair) return null
                                const isSelected = selectedTerm === id
                                const isWrong = wrongPair?.term === id
                                return (
                                    <motion.div
                                        key={`term-${id}`}
                                        layout
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={isWrong
                                            ? { x: [0, -10, 10, -6, 6, 0], opacity: 1, y: 0 }
                                            : { x: 0, opacity: 1, y: 0 }
                                        }
                                        exit={{ opacity: 0, y: -50, scale: 0.85 }}
                                        transition={{ duration: 0.3 }}
                                        ref={(el: HTMLDivElement | null) => {
                                            if (el) termCardRefs.current.set(id, el)
                                            else termCardRefs.current.delete(id)
                                        }}
                                        onClick={() => handleTermClick(id)}
                                        className={[
                                            'flex-1 min-h-0 flex items-center justify-center px-3 rounded-xl border-2',
                                            'text-center text-xs md:text-sm font-bold select-none cursor-pointer transition-colors',
                                            isSelected
                                                ? 'bg-secondary/25 border-secondary text-white shadow-[0_0_16px_rgba(99,102,241,0.4)]'
                                                : isWrong
                                                    ? 'bg-red-500/20 border-red-500 text-red-400'
                                                    : 'bg-surface/60 border-gray-700 hover:border-secondary/60 hover:bg-secondary/10 text-white',
                                        ].join(' ')}
                                    >
                                        {pair.term}
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-gray-800 shrink-0 self-stretch" />

                {/* RIGHT: Definitions */}
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest text-center mb-1.5 shrink-0 font-bold">
                        Definicje
                    </div>
                    <div className="flex-1 flex flex-col min-h-0 gap-1.5">
                        <AnimatePresence mode="popLayout">
                            {defOrder.filter(id => !matched.has(id)).map(id => {
                                const pair = pairsById[id]
                                if (!pair) return null
                                const isWrong = wrongPair?.def === id
                                const isHighlighted = selectedTerm !== null
                                return (
                                    <motion.div
                                        key={`def-${id}`}
                                        layout
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={isWrong
                                            ? { x: [0, 10, -10, 6, -6, 0], opacity: 1, y: 0 }
                                            : { x: 0, opacity: 1, y: 0 }
                                        }
                                        exit={{ opacity: 0, y: -50, scale: 0.85 }}
                                        transition={{ duration: 0.3 }}
                                        ref={(el: HTMLDivElement | null) => {
                                            if (el) defCardRefs.current.set(id, el)
                                            else defCardRefs.current.delete(id)
                                        }}
                                        onClick={() => handleDefClick(id)}
                                        className={[
                                            'flex-1 min-h-0 flex items-center justify-center px-3 rounded-xl border-2',
                                            'text-center text-xs leading-snug select-none cursor-pointer transition-colors',
                                            isWrong
                                                ? 'bg-red-500/20 border-red-500 text-red-400'
                                                : isHighlighted
                                                    ? 'bg-surface/60 border-gray-600 hover:border-primary hover:bg-primary/10 text-gray-200 ring-1 ring-primary/20'
                                                    : 'bg-surface/60 border-gray-700 hover:border-primary/60 hover:bg-primary/10 text-gray-300',
                                        ].join(' ')}
                                    >
                                        {pair.definition}
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div>
    )
}
