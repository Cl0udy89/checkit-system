import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchITMatchQuestions, submitGameScore, BACKEND_URL } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Check, X, Info } from 'lucide-react'
import { useGameStore } from '../hooks/useGameStore'

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
        if (data) {
            let loadedQuestions = [...data]
            // Default: shuffle them if it's a fresh game
            let shouldShuffle = true

            // Force reset on load rather than resuming stale sessions (DISABLED cache resume)
            if (user) {
                localStorage.removeItem(`it_match_state_${user.id}`)
                setCurrentIndex(0)
                setScore(0)
                setAnswers({})
                setQuestionStartTime(Date.now())
                setCurrentPotentialScore(MAX_Q_POINTS)
            }

            if (shouldShuffle) {
                // Fisher-Yates shuffle
                for (let i = loadedQuestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [loadedQuestions[i], loadedQuestions[j]] = [loadedQuestions[j], loadedQuestions[i]];
                }
            }
            setQuestions(loadedQuestions)
        }
    }, [data, user])

    // Save progress continuously
    useEffect(() => {
        if (user && questions.length > 0 && !gameOver && gameState === 'playing') {
            const currentElapsed = Date.now() - questionStartTime
            const stateToSave = {
                currentIndex,
                score,
                answers,
                elapsed: currentElapsed,
                questions
            }
            localStorage.setItem(`it_match_state_${user.id}`, JSON.stringify(stateToSave))
        }
    }, [currentIndex, score, answers, questionStartTime, user, questions, gameOver, gameState])

    // Timer Effect (Per Question)
    useEffect(() => {
        if (gameOver || questions.length === 0 || gameState !== 'playing') return

        const interval = setInterval(() => {
            const elapsed = Date.now() - questionStartTime
            const scoreVal = Math.max(0, MAX_Q_POINTS - (elapsed * DECAY_PER_MS))
            setCurrentPotentialScore(Math.floor(scoreVal))
        }, 50)
        return () => clearInterval(interval)
    }, [questionStartTime, gameOver, questions, gameState])

    const handleSwipe = (direction: 'left' | 'right') => {
        if (gameState !== 'playing') return

        const currentQ = questions[currentIndex]
        const isSafe = currentQ.is_correct
        const userChoiceSafe = direction === 'right'

        let pointsEarned = 0
        if (userChoiceSafe === isSafe) {
            pointsEarned = currentPotentialScore
            showPoints(currentPotentialScore, "POPRAWNIE")
        } else {
            showPoints(0, "BŁĄD")
        }

        const newScore = score + pointsEarned
        const newAnswers = { ...answers, [currentQ.id]: userChoiceSafe }

        setScore(newScore)
        setAnswers(newAnswers)
        setGameState('feedback')

        // Force anti-cheat save immediately for the next state
        if (user) {
            const stateToSave = {
                currentIndex: currentIndex + 1,
                score: newScore,
                answers: newAnswers,
                elapsed: 0, // Reset elapsed for the next question
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
        return (
            <div className="min-h-[100dvh] bg-transparent flex flex-col items-center justify-center font-mono text-white p-4">
                <h1 className="text-5xl md:text-7xl font-bold text-primary mb-8 text-center drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]">LICZENIE PUNKTÓW...</h1>
                <div className="text-4xl md:text-6xl mb-12 text-center text-gray-300">TWÓJ WYNIK: <span className="text-accent font-bold drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]">{score}</span></div>
                <button onClick={() => navigate('/dashboard')} className="bg-primary text-black text-xl md:text-2xl px-10 py-4 rounded font-bold hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(74,222,128,0.5)]">
                    POWRÓT DO BAZY
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-[100dvh] bg-transparent flex flex-col items-center justify-between p-4 relative touch-none select-none overflow-hidden">
            <header className="w-full max-w-lg mt-2 md:mt-4 flex flex-row justify-between items-start z-10 font-mono text-white px-2">
                <div className="relative font-bold flex flex-col items-start gap-1">
                    <div className="text-xl md:text-3xl text-gray-300">
                        WYNIK: <span className="text-3xl md:text-4xl text-accent drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">{score}</span>
                    </div>
                    <div className="text-base md:text-xl text-gray-400">
                        PULA: <span className="text-xl md:text-2xl text-white font-bold tracking-widest">{currentPotentialScore.toString().padStart(4, '0')}</span>
                    </div>
                </div>
                <div className="text-2xl md:text-3xl text-gray-400 font-bold tracking-widest">
                    <span className="text-sm md:text-lg block text-right text-gray-500 font-normal">PROG</span>
                    {currentIndex + 1}&nbsp;/&nbsp;{questions.length}
                </div>
            </header>

            <div className="flex-1 w-full max-w-md relative flex justify-center items-center my-4 min-h-[50dvh]">
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

            <div className="flex gap-4 w-full max-w-md mb-8 z-10">
                <button
                    onClick={() => document.dispatchEvent(new CustomEvent('manual-swipe', { detail: 'left' }))}
                    className="flex-1 bg-red-600/80 hover:bg-red-500 py-4 rounded-full flex justify-center items-center"
                >
                    <X size={32} color="white" />
                </button>
                <div className="flex items-center text-gray-500 text-xs font-mono uppercase tracking-widest">
                    <span className="mr-2">Zagrożenie</span>
                    <Info size={16} />
                    <span className="ml-2">Bezpiecznie</span>
                </div>
                <button
                    onClick={() => document.dispatchEvent(new CustomEvent('manual-swipe', { detail: 'right' }))}
                    className="flex-1 bg-green-600/80 hover:bg-green-500 py-4 rounded-full flex justify-center items-center"
                >
                    <Check size={32} color="white" />
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

            <div className="w-full aspect-square md:aspect-[4/5] bg-gray-800 rounded-xl mb-6 flex items-center justify-center overflow-hidden relative z-10">
                {question.image && question.image !== 'none' ? (
                    // Image fetched from backend
                    <img src={`${BACKEND_URL}/content/it_match/images/${question.image}`} alt="Quiz" draggable={false} className="object-cover w-full h-full pointer-events-none" onError={(e) => e.currentTarget.style.display = 'none'} />
                ) : (
                    <span className="text-gray-600 font-mono">BRAK ZDJĘCIA</span>
                )}
            </div>

            <h3 className="text-xl md:text-2xl font-bold text-white mb-4 z-10 select-none pointer-events-none">{question.question}</h3>
        </motion.div>
    )
}
