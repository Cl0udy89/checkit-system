import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchITMatchQuestions, submitGameScore, BACKEND_URL } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Check, X, Search } from 'lucide-react'
import { useGameStore } from '../hooks/useGameStore'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

interface Question {
    id: number
    question: string
    image: string
    is_correct: boolean // true = RIGHT (Safe), false = LEFT (Danger)
}

export default function ITMatch() {
    const navigate = useNavigate()
    const { user } = useGameStore()
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [score, setScore] = useState(0)
    const [gameOver, setGameOver] = useState(false)
    const [gameState, setGameState] = useState<'playing' | 'feedback'>('playing')
    const [startTime] = useState(Date.now())
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [answerStats, setAnswerStats] = useState<{ isCorrect: boolean, timeMs: number }[]>([])
    const [floatingPoints, setFloatingPoints] = useState<{ id: number, val: number, label: string }[]>([])

    const DECAY_PER_MS = 0.05 // 50 points per second
    const MAX_Q_POINTS = 1000
    const [questionStartTime, setQuestionStartTime] = useState(Date.now())
    const [currentPotentialScore, setCurrentPotentialScore] = useState(MAX_Q_POINTS)

    const showPoints = (val: number, label: string) => {
        const id = Date.now() + Math.random()
        setFloatingPoints(prev => [...prev, { id, val, label }])
        setTimeout(() => setFloatingPoints(prev => prev.filter(p => p.id !== id)), 1200)
    }

    const submitMutation = useMutation({
        mutationFn: submitGameScore,
        onSuccess: () => { }
    })

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['it_match_questions'],
        queryFn: fetchITMatchQuestions,
        refetchOnWindowFocus: false,
        retry: false
    })

    // Mid-game status polling (anti-cheat — mirrors BinaryBrain approach)
    const { isError: isPollError, error: pollError } = useQuery({
        queryKey: ['itmStatusPoll'],
        queryFn: fetchITMatchQuestions,
        refetchInterval: 5000,
        retry: false,
        enabled: !gameOver && questions.length > 0
    })

    // Poll only blocks on explicit 403 — ignore transient network errors
    const pollBlocked = isPollError && (pollError as any)?.response?.status === 403
    const pollIsBreak = (pollError as any)?.response?.data?.detail === "PRZERWA_TECHNICZNA"

    // ── SESSION PERSISTENCE ── DO NOT REMOVE (preserves in-progress game on accidental navigation)
    // Restores question order, index and score from sessionStorage. Cleared on game finish.
    useEffect(() => {
        if (!data || !user) return
        const sessionKey = `itm_session_${user.id}`
        const saved = sessionStorage.getItem(sessionKey)
        if (saved) {
            try {
                const s = JSON.parse(saved)
                if (Array.isArray(s.questionIds) && s.questionIds.length === data.length) {
                    const qMap = new Map(data.map((q: Question) => [q.id, q]))
                    const restored = s.questionIds.map((id: number) => qMap.get(id)).filter(Boolean) as Question[]
                    if (restored.length === data.length) {
                        setQuestions(restored)
                        setCurrentIndex(s.currentIndex ?? 0)
                        setScore(s.score ?? 0)
                        setAnswers(s.answers ?? {})
                        setAnswerStats(s.answerStats ?? [])
                        setQuestionStartTime(s.questionStartTime ?? Date.now())
                        setCurrentPotentialScore(MAX_Q_POINTS)
                        return
                    }
                }
            } catch { /* corrupt – fall through to fresh start */ }
        }
        const loadedQuestions = [...data]
        for (let i = loadedQuestions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [loadedQuestions[i], loadedQuestions[j]] = [loadedQuestions[j], loadedQuestions[i]]
        }
        setQuestions(loadedQuestions)
        setCurrentIndex(0)
        setScore(0)
        setAnswers({})
        setAnswerStats([])
        setQuestionStartTime(Date.now())
        setCurrentPotentialScore(MAX_Q_POINTS)
    }, [data, user])

    // ── SESSION PERSISTENCE ── DO NOT REMOVE
    // Saves current progress after each answered question.
    useEffect(() => {
        if (!user || !questions.length || gameOver) return
        sessionStorage.setItem(`itm_session_${user.id}`, JSON.stringify({
            questionIds: questions.map(q => q.id),
            currentIndex, score, answers, answerStats, questionStartTime
        }))
    }, [currentIndex, score]) // eslint-disable-line react-hooks/exhaustive-deps

    // Timer Effect (Per Question)
    useEffect(() => {
        if (gameOver || questions.length === 0 || gameState !== 'playing') return

        const interval = setInterval(() => {
            if (gameState !== 'playing') return

            const elapsed = Date.now() - questionStartTime
            const scoreVal = Math.max(0, MAX_Q_POINTS - (elapsed * DECAY_PER_MS))

            if (scoreVal <= 0) {
                clearInterval(interval)
                setCurrentPotentialScore(0)
                handleSwipe('timeout')
            } else {
                setCurrentPotentialScore(Math.floor(scoreVal))
            }
        }, 50)
        return () => clearInterval(interval)
    }, [questionStartTime, gameOver, questions, gameState, currentIndex, score, answers, user])

    const handleSwipe = (direction: 'left' | 'right' | 'timeout') => {
        if (gameState !== 'playing') return

        const currentQ = questions[currentIndex]
        const isSafe = currentQ.is_correct
        const userChoiceSafe = direction === 'right'

        let pointsEarned = 0
        if (direction === 'timeout') {
            showPoints(0, "CZAS MINĄŁ")
        } else if (userChoiceSafe === isSafe) {
            pointsEarned = currentPotentialScore
            showPoints(currentPotentialScore, "POPRAWNIE")
        } else {
            showPoints(0, "BŁĄD")
        }

        const newScore = score + pointsEarned
        const newAnswers = { ...answers, [currentQ.id]: userChoiceSafe }

        const timeElapsed = Date.now() - questionStartTime
        const newAnswerStats = [...answerStats, { isCorrect: userChoiceSafe === isSafe, timeMs: timeElapsed }]

        setScore(newScore)
        setAnswers(newAnswers)
        setAnswerStats(newAnswerStats)
        setGameState('feedback')

        setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex(prev => prev + 1)
                setQuestionStartTime(Date.now())
                setCurrentPotentialScore(MAX_Q_POINTS)
                setGameState('playing')
            } else {
                finishGame(newScore)
            }
        }, 1200)
    }

    const finishGame = async (finalScore: number) => {
        // ── SESSION PERSISTENCE ── DO NOT REMOVE — clear session on game completion
        if (user) sessionStorage.removeItem(`itm_session_${user.id}`)
        setGameOver(true)
        const endTime = Date.now()
        const duration = endTime - startTime

        if (user) {
            submitMutation.mutate({
                user_id: user.id,
                game_type: 'it_match',
                answers: answers,
                duration_ms: duration,
                score: finalScore
            })
        }
    }

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center font-mono text-primary text-xl animate-pulse">
            &gt; LOADING_ASSETS..._
        </div>
    )

    if (isError) return <div className="text-red-500 text-center mt-20 font-mono">CONNECTION_ERROR</div>

    if (pollBlocked) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center font-mono">
            <div className="crt-border bg-surface p-8 max-w-md w-full">
                <p className="text-primary/50 text-[10px] uppercase tracking-widest mb-2">&gt; SYSTEM_STATUS</p>
                <h1 className="text-2xl font-bold text-red-400 mb-4">{pollIsBreak ? "PRZERWA TECHNICZNA" : "ZAWODY ZAKOŃCZONE"}</h1>
                <p className="text-primary/40 mb-8">{pollIsBreak ? "System chwilowo niedostępny. Zostań na stanowisku!" : "System został zablokowany przez administratora."}</p>
                <button onClick={() => navigate('/dashboard')} className="border border-primary/25 hover:border-primary/60 text-primary/60 hover:text-primary px-6 py-3 font-mono text-sm transition-all">&gt; POWRÓT</button>
            </div>
        </div>
    )

    if (gameOver) {
        const stats = answerStats || []
        const fastestAnswer = stats.length > 0 ? stats.reduce((min, s) => s.timeMs < min.timeMs ? s : min, stats[0]) : null
        const slowestAnswer = stats.length > 0 ? stats.reduce((max, s) => s.timeMs > max.timeMs ? s : max, stats[0]) : null
        const correctCount = stats.filter(s => s.isCorrect).length
        const incorrectCount = stats.length - correctCount

        return (
            <div className="min-h-[100dvh] p-4 md:p-8 flex flex-col items-center relative overflow-x-hidden overflow-y-auto custom-scrollbar pt-8 md:pt-12">
                {/* Grid bg */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
                    backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />

                <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-2 z-10">&gt; IT_MATCH</p>
                <h1 className="text-3xl md:text-4xl font-mono font-bold text-primary text-glow mb-8 text-center z-10">LICZENIE PUNKTÓW</h1>

                <div className="crt-border bg-surface p-4 md:p-8 w-full max-w-4xl z-10 mb-8">
                    <div className="flex items-center gap-2 pb-4 mb-6 border-b border-primary/20">
                        <div className="w-2 h-2 bg-primary/40" />
                        <div className="w-2 h-2 bg-primary/20" />
                        <div className="w-2 h-2 bg-primary/20" />
                        <span className="text-primary/40 text-[10px] ml-2">results.sh</span>
                    </div>

                    <div className="text-center mb-6 md:mb-8 border border-primary/20 bg-black/50 p-6 md:p-8 flex flex-col items-center">
                        <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-2">&gt; WYNIK_KOŃCOWY</p>
                        <span className="font-mono font-black text-primary text-glow-lg tabular-nums" style={{ fontSize: 'clamp(3rem, 10vw, 5rem)' }}>{score}</span>
                        {!user && <div className="text-red-500 mt-4 text-sm font-mono tracking-widest">BRAK SESJI LOGOWANIA. WYNIK NIE ZOSTAŁ ZAPISANY.</div>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
                        <div className="p-3 md:p-4 border border-primary/20 bg-primary/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-primary/50 mb-2 font-mono uppercase tracking-widest">&gt; NAJSZYBSZA</p>
                            <span className="text-xl md:text-2xl font-bold text-primary font-mono">{fastestAnswer ? (fastestAnswer.timeMs / 1000).toFixed(2) + 's' : '---'}</span>
                        </div>
                        <div className="p-3 md:p-4 border border-red-500/20 bg-red-500/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-red-400/50 mb-2 font-mono uppercase tracking-widest">&gt; NAJDŁUŻSZA</p>
                            <span className="text-xl md:text-2xl font-bold text-red-400 font-mono">{slowestAnswer ? (slowestAnswer.timeMs / 1000).toFixed(2) + 's' : '---'}</span>
                        </div>
                        <div className="p-3 md:p-4 border border-primary/20 bg-primary/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-primary/50 mb-2 font-mono uppercase tracking-widest">&gt; POPRAWNE</p>
                            <span className="text-xl md:text-2xl font-bold text-primary font-mono">{correctCount}</span>
                        </div>
                        <div className="p-3 md:p-4 border border-red-500/20 bg-red-500/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-red-400/50 mb-2 font-mono uppercase tracking-widest">&gt; BŁĘDNE</p>
                            <span className="text-xl md:text-2xl font-bold text-red-400 font-mono">{incorrectCount}</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center mt-6 md:mt-8">
                        <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-12 md:h-16 invert mb-8 opacity-60" />
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="border border-primary/25 hover:border-primary/60 bg-primary/[0.04] hover:bg-primary/[0.08] text-primary/60 hover:text-primary px-8 py-4 font-bold font-mono text-lg transition-all"
                        >
                            &gt; POWRÓT_DO_BAZY
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[100dvh] flex flex-col items-center justify-between p-2 md:p-4 relative touch-none select-none overflow-hidden">
            {/* Grid bg */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
                backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            {/* HUD */}
            <div className="w-full max-w-lg md:max-w-xl lg:max-w-3xl flex justify-between items-start mb-2 md:mb-4 gap-2 z-10 relative crt-border bg-surface px-3 py-3">
                <div className="flex flex-col gap-1 shrink-0">
                    <p className="text-primary/50 text-[9px] font-mono uppercase tracking-widest">&gt; IT_MATCH</p>
                    <h1 className="text-lg md:text-2xl font-mono text-primary flex items-center gap-2 font-bold">
                        <Search size={18} className="shrink-0" />
                        <span className="text-glow">IT_MATCH</span>
                    </h1>
                    <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-5 md:h-7 w-auto object-contain invert opacity-40" />
                </div>
                <div className="flex gap-4 md:gap-8 text-right shrink-0">
                    <div className="flex flex-col items-end">
                        <p className="text-[9px] md:text-[10px] text-primary/40 font-mono uppercase tracking-widest">WYNIK ({currentIndex + 1}/{questions.length})</p>
                        <span className="font-mono font-black text-primary text-glow tabular-nums text-xl md:text-3xl">{score}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <p className="text-[9px] md:text-[10px] text-primary/40 font-mono uppercase tracking-widest">PULA</p>
                        <span className="text-2xl md:text-4xl font-mono font-bold tracking-widest text-white tabular-nums">
                            {currentPotentialScore.toString().padStart(4, '0')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full max-w-md lg:max-w-2xl relative flex justify-center items-center my-2 min-h-0">
                {/* Floating points */}
                <div className="absolute inset-0 flex justify-center items-center pointer-events-none z-[60]">
                    <AnimatePresence>
                        {floatingPoints.map(fp => (
                            <motion.div
                                key={fp.id}
                                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                animate={{ opacity: 1, y: -80, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                className={`w-full font-bold text-4xl md:text-5xl text-center ${fp.val > 0 ? 'text-primary text-glow-lg' : 'text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,1)]'}`}
                            >
                                {fp.val > 0 ? `+${fp.val}` : fp.val}
                                <div className="text-xl md:text-2xl text-center opacity-90 mt-2">{fp.label}</div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                <AnimatePresence>
                    {questions.length > 0 && currentIndex < questions.length && (
                        <Card
                            key={questions[currentIndex].id}
                            question={questions[currentIndex]}
                            onSwipe={handleSwipe}
                            gameState={gameState}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Swipe buttons — terminal DANGER / SAFE style */}
            <div className="flex gap-3 w-full max-w-md lg:max-w-2xl mb-2 md:mb-4 z-10 shrink-0">
                <button
                    onClick={() => document.dispatchEvent(new CustomEvent('manual-swipe', { detail: 'left' }))}
                    className="flex-1 border-2 border-red-500/60 bg-red-500/[0.06] hover:bg-red-500/[0.15] py-3 md:py-4 font-mono font-bold text-red-400 tracking-widest text-sm transition-all flex items-center justify-center gap-2"
                >
                    <X size={20} /> ZAGROŻENIE
                </button>
                <button
                    onClick={() => document.dispatchEvent(new CustomEvent('manual-swipe', { detail: 'right' }))}
                    className="flex-1 border-2 border-primary/60 bg-primary/[0.06] hover:bg-primary/[0.15] py-3 md:py-4 font-mono font-bold text-primary tracking-widest text-sm transition-all flex items-center justify-center gap-2"
                >
                    <Check size={20} /> BEZPIECZNY
                </button>
            </div>
        </div>
    )
}

function Card({ question, onSwipe, gameState }: { question: Question, onSwipe: (dir: 'left' | 'right') => void, gameState: string }) {
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-15, 15])
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])

    // Danger/Safe overlay opacity
    const dangerOpacity = useTransform(x, [-150, 0], [1, 0])
    const safeOpacity = useTransform(x, [0, 150], [0, 1])

    useEffect(() => {
        const handler = (e: any) => {
            if (gameState !== 'playing') return
            const dir = e.detail
            onSwipe(dir)
        }
        document.addEventListener('manual-swipe', handler)
        return () => document.removeEventListener('manual-swipe', handler)
    }, [onSwipe, gameState])

    return (
        <motion.div
            style={{ x, rotate, opacity }}
            drag={gameState === 'playing' ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
                if (gameState !== 'playing') return
                if (info.offset.x > 100) onSwipe('right')
                else if (info.offset.x < -100) onSwipe('left')
                x.set(0)
            }}
            className="absolute w-full h-full bg-surface border border-primary/25 shadow-[0_0_30px_rgba(0,0,0,0.8)] p-4 flex flex-col items-center text-center cursor-grab active:cursor-grabbing select-none relative overflow-hidden"
        >
            {/* Danger label overlay */}
            <motion.div
                style={{ opacity: dangerOpacity }}
                className="absolute top-6 left-6 z-20 border-2 border-red-500 text-red-400 font-mono font-black text-xl px-4 py-2 tracking-widest"
            >
                ZAGROŻENIE
            </motion.div>

            {/* Safe label overlay */}
            <motion.div
                style={{ opacity: safeOpacity }}
                className="absolute top-6 right-6 z-20 border-2 border-primary text-primary font-mono font-black text-xl px-4 py-2 tracking-widest text-glow"
            >
                BEZPIECZNY
            </motion.div>

            {/* Feedback overlay */}
            {gameState === 'feedback' && (
                <div className="absolute inset-0 bg-black/70 z-40 pointer-events-none transition-all duration-300" />
            )}

            <div className="w-full h-auto flex-1 bg-black/40 border border-primary/10 mb-3 md:mb-6 flex items-center justify-center overflow-hidden relative z-10 max-h-[45vh] md:max-h-[55vh]">
                {question.image && question.image !== 'none' ? (
                    <img src={`${BACKEND_URL}/content/it_match/images/${question.image}`} alt="Quiz" draggable={false} className="object-cover w-full h-full pointer-events-none" onError={(e) => e.currentTarget.style.display = 'none'} />
                ) : (
                    <span className="text-primary/20 font-mono text-sm">BRAK_ZDJĘCIA</span>
                )}
            </div>

            <h3 className="text-lg md:text-2xl lg:text-3xl font-bold text-white mb-2 md:mb-4 z-10 select-none pointer-events-none line-clamp-4 font-mono">{question.question}</h3>
        </motion.div>
    )
}
