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
    const [startTime] = useState(Date.now())
    const [answers, setAnswers] = useState<Record<string, any>>({})
    const [floatingPoints, setFloatingPoints] = useState<{ id: number, val: number }[]>([])

    const showPoints = (val: number) => {
        const id = Date.now() + Math.random()
        setFloatingPoints(prev => [...prev, { id, val }])
        setTimeout(() => setFloatingPoints(prev => prev.filter(p => p.id !== id)), 1000)
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
        if (data) setQuestions(data)
    }, [data])

    const handleSwipe = (direction: 'left' | 'right') => {
        const currentQ = questions[currentIndex]
        // logic: right = accept/safe (is_correct=true), left = reject/danger (is_correct=false)
        const isSafe = currentQ.is_correct
        const userChoiceSafe = direction === 'right'

        if (userChoiceSafe === isSafe) {
            setScore(prev => prev + 100)
            showPoints(100)
        } else {
            setScore(prev => Math.max(0, prev - 50)) // Penalty
            showPoints(-50)
        }

        // Record answer: '1' (Safe/Right) or '0' (Danger/Left)
        // Backend expects comparison with is_correct (bool/1/0)
        // Let's send what the user chose as "safe" logic?
        // Actually backend ContentService checks: correct and ans == correct.
        // If question is_correct=True (Safe).
        // User swipes Right (Safe).
        // We should send "True" or "1"?
        // Let's assume we send boolean of "User thinks it is safe".
        setAnswers(prev => ({ ...prev, [currentQ.id]: userChoiceSafe }))

        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
        } else {
            finishGame()
        }
    }

    const finishGame = async () => {
        setGameOver(true)
        const endTime = Date.now()
        const duration = endTime - startTime

        if (user) {
            submitMutation.mutate({
                user_id: user.id,
                game_type: 'it_match',
                answers: answers, // Backend will recalculate score based on this
                duration_ms: duration
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
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center font-mono text-white p-4">
                <h1 className="text-4xl font-bold text-primary mb-4">LICZENIE PUNKTÓW...</h1>
                <div className="text-2xl mb-8">TWÓJ WYNIK: {score}</div>
                <button onClick={() => navigate('/dashboard')} className="bg-primary text-black px-8 py-3 rounded font-bold hover:bg-green-400">
                    POWRÓT DO BAZY
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-transparent flex flex-col items-center justify-between p-4 overflow-x-hidden relative">
            <header className="w-full max-w-lg mt-4 flex justify-between items-center z-10 font-mono text-white text-lg md:text-xl">
                <div className="relative font-bold">
                    SCORE: <span className="text-accent">{score}</span>
                    <AnimatePresence>
                        {floatingPoints.map(fp => (
                            <motion.div
                                key={fp.id}
                                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                                animate={{ opacity: 1, y: -40, scale: 1.5 }}
                                exit={{ opacity: 0 }}
                                className={`absolute left-1/2 -top-4 transform -translate-x-1/2 font-bold z-50 pointer-events-none drop-shadow-md text-2xl ${fp.val > 0 ? 'text-green-400' : 'text-red-500'}`}
                            >
                                {fp.val > 0 ? `+${fp.val}` : fp.val}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                <div className="text-gray-400">PROG: {currentIndex + 1}/{questions.length}</div>
            </header>

            <div className="w-full max-w-md h-[70vh] relative flex items-center justify-center mt-10">
                <AnimatePresence>
                    {questions.length > 0 && currentIndex < questions.length && (
                        <Card
                            key={questions[currentIndex].id}
                            question={questions[currentIndex]}
                            onSwipe={handleSwipe}
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

function Card({ question, onSwipe }: { question: Question, onSwipe: (dir: 'left' | 'right') => void }) {
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-30, 30])
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0])
    const bg = useTransform(x, [-100, 0, 100], ['rgba(255, 0, 0, 0.3)', 'rgba(0,0,0,0)', 'rgba(0, 255, 0, 0.3)'])

    useEffect(() => {
        const handler = (e: any) => {
            const dir = e.detail
            if (dir === 'left') x.set(-250) // Animate out
            if (dir === 'right') x.set(250)
            setTimeout(() => onSwipe(dir), 200)
        }
        document.addEventListener('manual-swipe', handler)
        return () => document.removeEventListener('manual-swipe', handler)
    }, [onSwipe, x])

    return (
        <motion.div
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
                if (info.offset.x > 100) onSwipe('right')
                else if (info.offset.x < -100) onSwipe('left')
            }}
            className="absolute w-full h-full bg-black border border-gray-700 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center cursor-grab active:cursor-grabbing select-none"
        >
            <motion.div className="absolute inset-0 rounded-2xl pointer-events-none z-0" style={{ backgroundColor: bg }} />

            <div className="w-full aspect-square md:aspect-[4/5] bg-gray-800 rounded-xl mb-6 flex items-center justify-center overflow-hidden relative z-10">
                {question.image && question.image !== 'none' ? (
                    // Image fetched from backend
                    <img src={`${BACKEND_URL}/content/it_match/images/${question.image}`} alt="Quiz" className="object-cover w-full h-full" onError={(e) => e.currentTarget.style.display = 'none'} />
                ) : (
                    <span className="text-gray-600 font-mono">BRAK ZDJĘCIA</span>
                )}
            </div>

            <h3 className="text-xl md:text-2xl font-bold text-white mb-4 z-10">{question.question}</h3>

            <div className="mt-auto text-gray-400 text-sm font-mono z-10">
                Przesuń w PRAWO jeśli BEZPIECZNE<br />
                Przesuń w LEWO jeśli ZAGROŻENIE
            </div>
        </motion.div>
    )
}
