import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchITMatchQuestions, submitGameScore, BACKEND_URL } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Check, X, Info, Search } from 'lucide-react'
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
        onSuccess: () => {
            // navigate('/dashboard') // Optional: wait for user to click button
        }
    })

    // Fetch questions
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['it_match_questions'],
        queryFn: fetchITMatchQuestions,
        refetchOnWindowFocus: false,
        retry: false
    })

    useEffect(() => {
        if (data && user) {
            let loadedQuestions = [...data]
            const savedStateStr = localStorage.getItem(`it_match_state_${user.id}`)

            if (savedStateStr) {
                try {
                    const savedState = JSON.parse(savedStateStr)

                    if (savedState.currentIndex >= savedState.questions?.length) {
                        // Game was finished, restart
                        localStorage.removeItem(`it_match_state_${user.id}`)
                    } else if (savedState.questions && savedState.questions.length > 0) {
                        setQuestions(savedState.questions)
                        setCurrentIndex(savedState.currentIndex || 0)
                        setScore(savedState.score || 0)
                        setAnswers(savedState.answers || {})
                        setAnswerStats(savedState.answerStats || [])

                        // Restore precise time if available, otherwise it will just be from 0 again
                        if (savedState.questionStartTime) {
                            setQuestionStartTime(savedState.questionStartTime)
                        } else {
                            setQuestionStartTime(Date.now())
                        }

                        return // Skip shuffling since we re-loaded the old pool
                    }
                } catch (e) { }
            }

            // If no saved state, setup a new shuffled game
            for (let i = loadedQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [loadedQuestions[i], loadedQuestions[j]] = [loadedQuestions[j], loadedQuestions[i]];
            }

            setQuestions(loadedQuestions)
            setCurrentIndex(0)
            setScore(0)
            setAnswers({})
            setAnswerStats([])
            setQuestionStartTime(Date.now())
            setCurrentPotentialScore(MAX_Q_POINTS)
        }
    }, [data, user])

    // Save progress continuously
    useEffect(() => {
        if (user && questions.length > 0 && !gameOver && gameState === 'playing') {
            const stateToSave = {
                currentIndex,
                score,
                answers,
                answerStats,
                questionStartTime,
                questions
            }
            localStorage.setItem(`it_match_state_${user.id}`, JSON.stringify(stateToSave))
        }
    }, [currentIndex, score, answers, answerStats, questionStartTime, user, questions, gameOver, gameState])

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

        // Force anti-cheat save immediately for the next state
        if (user) {
            const stateToSave = {
                currentIndex: currentIndex + 1,
                score: newScore,
                answers: newAnswers,
                answerStats: newAnswerStats,
                questionStartTime: Date.now(), // Will be reset on setTimeout anyway
                questions: questions
            }
            localStorage.setItem(`it_match_state_${user.id}`, JSON.stringify(stateToSave))
        }

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
        setGameOver(true)
        if (user) {
            localStorage.removeItem(`it_match_state_${user.id}`)
        }
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

    if (isLoading) return <div className="text-white text-center mt-20 font-mono">LOADING_ASSETS...</div>

    if (isError) {
        // @ts-ignore
        if (error?.response?.status === 403) {
            // @ts-ignore
            const isBreak = error?.response?.data?.detail === "PRZERWA_TECHNICZNA"
            return (
                <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center text-red-500 font-mono">
                    <h1 className="text-4xl font-bold mb-4">{isBreak ? "PRZERWA TECHNICZNA" : "ZAWODY ZAKOŃCZONE"}</h1>
                    <p className="mb-8 text-xl">{isBreak ? "System chwilowo niedostępny. Zostań na stanowisku!" : "System został zablokowany przez administratora."}</p>
                    <button onClick={() => navigate('/dashboard')} className="border border-red-500 text-red-500 px-6 py-3 hover:bg-red-900/20">POWRÓT</button>
                </div>
            )
        }
        return <div className="text-red-500 text-center mt-20">CONNECTION_ERROR</div>
    }

    if (gameOver) {
        const stats = answerStats || []
        const fastestAnswer = stats.length > 0 ? stats.reduce((min, s) => s.timeMs < min.timeMs ? s : min, stats[0]) : null
        const slowestAnswer = stats.length > 0 ? stats.reduce((max, s) => s.timeMs > max.timeMs ? s : max, stats[0]) : null
        const correctCount = stats.filter(s => s.isCorrect).length
        const incorrectCount = stats.length - correctCount

        return (
            <div className="min-h-[100dvh] bg-transparent p-4 md:p-8 flex flex-col justify-center items-center relative md:touch-none overflow-x-hidden overflow-y-auto custom-scrollbar">
                <h1 className="text-4xl md:text-5xl font-mono font-bold text-primary mb-6 md:mb-8 glow-text text-center drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]">LICZENIE PUNKTÓW...</h1>

                <div className="bg-surface border-2 border-gray-700 rounded-2xl p-4 md:p-8 shadow-2xl w-full max-w-4xl z-20 relative mb-8">
                    <div className="text-center mb-6 md:mb-8 border border-gray-700 rounded-lg bg-black/50 p-6 md:p-8 flex flex-col items-center">
                        <div className="text-gray-400 font-mono mb-2 text-sm md:text-base">WYNIK KOŃCOWY</div>
                        <div className="text-5xl md:text-7xl font-bold text-accent font-mono">{score}</div>
                        {!user && <div className="text-red-500 mt-4 text-sm font-mono tracking-widest">BRAK SESJI LOGOWANIA. WYNIK NIE ZOSTAŁ ZAPISANY.</div>}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
                        <div className="p-3 md:p-4 border border-green-900/50 bg-green-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-green-500/80 mb-2 font-mono">NAJSZYBSZA ODPOWIEDŹ</div>
                            <div className="text-xl md:text-2xl font-bold text-green-400 font-mono mb-1">{fastestAnswer ? (fastestAnswer.timeMs / 1000).toFixed(2) + 's' : '---'}</div>
                        </div>
                        <div className="p-3 md:p-4 border border-red-900/50 bg-red-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-red-500/80 mb-2 font-mono">NAJDŁUŻSZE ZASTANOWIENIE</div>
                            <div className="text-xl md:text-2xl font-bold text-red-400 font-mono mb-1">{slowestAnswer ? (slowestAnswer.timeMs / 1000).toFixed(2) + 's' : '---'}</div>
                        </div>
                        <div className="p-3 md:p-4 border border-blue-900/50 bg-blue-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-blue-500/80 mb-2 font-mono">POPRAWNE</div>
                            <div className="text-xl md:text-2xl font-bold text-blue-400 font-mono mb-1">{correctCount}</div>
                        </div>
                        <div className="p-3 md:p-4 border border-orange-900/50 bg-orange-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-orange-500/80 mb-2 font-mono">BŁĘDNE</div>
                            <div className="text-xl md:text-2xl font-bold text-orange-400 font-mono mb-1">{incorrectCount}</div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center mt-6 md:mt-8">
                        <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-16 md:h-24 invert mb-8 opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="bg-primary text-black px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold font-mono text-lg md:text-xl transition-colors shadow-[0_0_20px_rgba(74,222,128,0.5)] hover:bg-green-400"
                        >
                            POWRÓT DO BAZY
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[100dvh] bg-transparent flex flex-col items-center justify-between p-2 md:p-4 relative touch-none select-none overflow-hidden">
            {/* HUD */}
            <div className="w-full max-w-lg flex justify-between items-start mb-2 md:mb-4 border-b border-gray-800 pb-2 md:pb-4 gap-2 z-10 relative px-2">
                <div className="flex flex-col gap-1 md:gap-2 shrink-0">
                    <h1 className="text-base md:text-2xl font-mono text-primary flex items-center gap-1 md:gap-2">
                        <Search size={18} className="md:w-6 md:h-6 shrink-0" /> IT_MATCH
                    </h1>
                    <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-4 md:h-6 w-auto object-contain invert opacity-70" />
                </div>
                <div className="flex gap-3 md:gap-8 text-right shrink-0">
                    <div className="flex flex-col items-end">
                        <div className="text-[9px] md:text-xs text-gray-500 font-mono">WYNIK ({currentIndex + 1}/{questions.length})</div>
                        <div className="text-xl md:text-4xl font-mono font-bold text-accent">{score}</div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="text-[9px] md:text-xs text-gray-500 font-mono">PULA</div>
                        <div className="text-2xl md:text-5xl font-mono font-bold tracking-widest text-shadow-neon text-white">
                            {currentPotentialScore.toString().padStart(4, '0')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full max-w-md relative flex justify-center items-center my-2 min-h-0">
                <AnimatePresence>
                    {floatingPoints.map(fp => (
                        <motion.div
                            key={fp.id}
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 1, y: -100, scale: 1.5 }}
                            exit={{ opacity: 0 }}
                            className={`absolute z-[60] font-bold pointer-events-none text-4xl md:text-5xl whitespace-nowrap drop-shadow-2xl ${fp.val > 0 ? 'text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,1)]' : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,1)]'}`}
                        >
                            {fp.val > 0 ? `+${fp.val}` : fp.val}
                            <div className="text-xl md:text-2xl text-center opacity-90 mt-2">{fp.label}</div>
                        </motion.div>
                    ))}
                </AnimatePresence>
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

            <div className="flex gap-4 w-full max-w-md mb-2 md:mb-4 z-10 shrink-0">
                <button
                    onClick={() => document.dispatchEvent(new CustomEvent('manual-swipe', { detail: 'left' }))}
                    className="flex-1 bg-red-600/80 hover:bg-red-500 py-3 md:py-4 rounded-full flex justify-center items-center"
                >
                    <X size={28} color="white" className="md:w-8 md:h-8" />
                </button>
                <div className="flex items-center text-gray-500 text-[10px] md:text-xs font-mono uppercase tracking-widest whitespace-nowrap">
                    <span className="mr-1 md:mr-2">Zagrożenie</span>
                    <Info size={14} className="md:w-4 md:h-4" />
                    <span className="ml-1 md:ml-2">Bezpieczny</span>
                </div>
                <button
                    onClick={() => document.dispatchEvent(new CustomEvent('manual-swipe', { detail: 'right' }))}
                    className="flex-1 bg-green-600/80 hover:bg-green-500 py-3 md:py-4 rounded-full flex justify-center items-center"
                >
                    <Check size={28} color="white" className="md:w-8 md:h-8" />
                </button>
            </div>
        </div>
    )
}

function Card({ question, onSwipe, gameState }: { question: Question, onSwipe: (dir: 'left' | 'right') => void, gameState: string }) {
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-30, 30])
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])
    const bg = useTransform(x, [-100, 0, 100], ['rgba(255, 0, 0, 0.3)', 'rgba(0,0,0,0)', 'rgba(0, 255, 0, 0.3)'])

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
            className="absolute w-full h-full bg-black border border-gray-700 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center cursor-grab active:cursor-grabbing select-none relative overflow-hidden"
        >
            <motion.div className="absolute inset-0 rounded-2xl pointer-events-none z-0" style={{ backgroundColor: bg }} />

            {/* Feedback overlay INSIDE the card so only the card darkens */}
            {gameState === 'feedback' && (
                <div className="absolute inset-0 bg-black/70 z-40 rounded-2xl pointer-events-none backdrop-blur-sm transition-all duration-300"></div>
            )}

            <div className="w-full h-auto flex-1 bg-gray-800 rounded-xl mb-3 md:mb-6 flex items-center justify-center overflow-hidden relative z-10 max-h-[45vh] md:max-h-[55vh]">
                {question.image && question.image !== 'none' ? (
                    // Image fetched from backend
                    <img src={`${BACKEND_URL}/content/it_match/images/${question.image}`} alt="Quiz" draggable={false} className="object-cover w-full h-full pointer-events-none" onError={(e) => e.currentTarget.style.display = 'none'} />
                ) : (
                    <span className="text-gray-600 font-mono">BRAK ZDJĘCIA</span>
                )}
            </div>

            <h3 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-4 z-10 select-none pointer-events-none line-clamp-4">{question.question}</h3>
        </motion.div>
    )
}
