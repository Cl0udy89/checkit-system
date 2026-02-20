import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPatchPanelState, submitGameScore, fetchPMQueue, joinPMQueue, leavePMQueue, startPMQueue } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { Zap, Users, ShieldAlert, PlayCircle } from 'lucide-react'
import clsx from 'clsx'

export default function PatchMaster() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const user = useGameStore(state => state.user)

    // --- GAME STATE ---
    const [gameStartedLocal, setGameStartedLocal] = useState(false)
    const [startTime, setStartTime] = useState<number | null>(null)
    const [currentScore, setCurrentScore] = useState(10000)
    const [isFinished, setIsFinished] = useState(false)

    // --- QUEUE DATA ---
    const { data: qState } = useQuery({
        queryKey: ['pm_queue'],
        queryFn: fetchPMQueue,
        refetchInterval: 1500 // Poll frequently
    })

    // Mutations
    const joinMutation = useMutation({
        mutationFn: joinPMQueue,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm_queue'] }),
        onError: (err: any) => {
            if (err?.response?.status === 403) {
                alert(err?.response?.data?.detail === "PRZERWA_TECHNICZNA" ? "PRZERWA TECHNICZNA: System pauzuje grę. Spróbuj za chwilę." : "ZAWODY ZAKOŃCZONE");
            }
        }
    })
    const leaveMutation = useMutation({ mutationFn: leavePMQueue, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pm_queue'] }) })
    const startMutation = useMutation({
        mutationFn: startPMQueue,
        onSuccess: () => {
            setGameStartedLocal(true)
            setStartTime(Date.now())
            queryClient.invalidateQueries({ queryKey: ['pm_queue'] })
        },
        onError: (err: any) => {
            if (err?.response?.status === 403) {
                alert(err?.response?.data?.detail === "PRZERWA_TECHNICZNA" ? "PRZERWA TECHNICZNA: Czekaj." : "ZAWODY ZAKOŃCZONE");
            }
        }
    })

    // Hardware State Poll
    const { data: hardwareState } = useQuery({
        queryKey: ['patch_panel'],
        queryFn: fetchPatchPanelState,
        refetchInterval: 500,
        enabled: gameStartedLocal && !isFinished
    })

    // Timer
    useEffect(() => {
        if (!gameStartedLocal || isFinished || !startTime) return
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const score = Math.max(0, 10000 - (elapsed * 0.1))
            setCurrentScore(Math.floor(score))
        }, 100)
        return () => clearInterval(interval)
    }, [startTime, isFinished, gameStartedLocal])

    const submitMutation = useMutation({
        mutationFn: submitGameScore,
        onSuccess: (data) => {
            alert(`Udało się! Twój wynik to: ${data.score}`)
            navigate('/dashboard')
        }
    })

    // Check win condition
    useEffect(() => {
        if (hardwareState?.solved && !isFinished && gameStartedLocal && startTime) {
            setIsFinished(true)
            const duration = Date.now() - startTime
            submitMutation.mutate({
                user_id: user?.id || 0,
                game_type: 'patch_master',
                answers: {},
                duration_ms: duration
            })
            // Reset queue local state so we see the finish screen or dashboard
        }
    }, [hardwareState, isFinished, startTime, user, submitMutation, gameStartedLocal])


    // Derived UI States
    const isPlaying = qState?.status === 'playing' && qState?.current_player?.id === user?.id
    const isMyTurn = qState?.status === 'waiting_for_player' && qState?.current_player?.id === user?.id
    const isQueued = qState?.queue?.some((u: any) => u.id === user?.id)
    const position = qState?.position

    // Someone else holds the lock
    const someoneElsePlaying = qState?.status === 'playing' && qState?.current_player?.id !== user?.id
    const someoneElseWaiting = qState?.status === 'waiting_for_player' && qState?.current_player?.id !== user?.id
    const isResetting = qState?.status === 'resetting'

    const renderQueueUI = () => {
        return (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto z-10 text-center">
                <div className="bg-surface border-2 border-gray-700 rounded-2xl p-8 shadow-2xl w-full">
                    {/* RESETTING */}
                    {isResetting && (
                        <div className="text-yellow-500 flex flex-col items-center animate-pulse">
                            <ShieldAlert size={64} className="mb-4" />
                            <h2 className="text-3xl font-mono font-bold mb-2">PRZERWA TECHNICZNA</h2>
                            <p className="text-gray-400 font-mono">Administrator resetuje kable. Proszę czekać...</p>
                        </div>
                    )}

                    {/* SOMEONE ELSE PLAYING */}
                    {!isResetting && someoneElsePlaying && (
                        <div className="text-blue-400 flex flex-col items-center mb-8">
                            <h2 className="text-2xl font-mono font-bold mb-2">GRA W TOKU</h2>
                            <p className="text-white font-mono text-xl">Gra aktualnie: <span className="text-accent font-bold">{qState.current_player.nick}</span></p>
                        </div>
                    )}

                    {/* SOMEONE ELSE WAITING */}
                    {!isResetting && someoneElseWaiting && (
                        <div className="text-purple-400 flex flex-col items-center mb-8">
                            <h2 className="text-2xl font-mono font-bold mb-2">OCZEKIWANIE NA GRACZA</h2>
                            <p className="text-white font-mono text-xl">Wezwano: <span className="text-accent font-bold">{qState.current_player.nick}</span></p>
                        </div>
                    )}

                    {/* IT'S YOUR TURN */}
                    {!isResetting && isMyTurn && (
                        <div className="text-green-500 flex flex-col items-center mb-8 animate-pulse shadow-[0_0_50px_rgba(0,255,0,0.2)] p-4 rounded-xl border border-green-500/50">
                            <h2 className="text-4xl font-mono font-bold mb-2">TO TWOJA KOLEJ!</h2>
                            <p className="text-white font-mono text-xl mb-6">Podejdź do skrzynki i kliknij start.</p>
                            <button
                                onClick={() => startMutation.mutate()}
                                className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded font-mono font-bold text-2xl flex items-center gap-2 transition-all"
                            >
                                <PlayCircle size={32} />
                                START GRY
                            </button>
                        </div>
                    )}

                    {/* QUEUE ACTIONS */}
                    {!isResetting && !isMyTurn && (
                        <div className="flex flex-col items-center border-t border-gray-700 pt-8 mt-4">
                            <Users size={48} className="text-gray-500 mb-4" />
                            <h3 className="text-xl font-mono text-white mb-6">KOLEJKA GRACZY ({qState?.queue?.length || 0})</h3>

                            {isQueued ? (
                                <div className="flex flex-col items-center">
                                    <div className="text-6xl font-black text-accent font-mono mb-2">#{position}</div>
                                    <p className="text-gray-400 font-mono mb-6">Twoja pozycja w kolejce. Czekaj na wezwanie.</p>
                                    <button
                                        onClick={() => leaveMutation.mutate()}
                                        className="border border-red-500 text-red-500 hover:bg-red-500/20 px-6 py-2 rounded font-mono transition-colors"
                                    >
                                        OPUŚĆ KOLEJKĘ
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => joinMutation.mutate()}
                                    className="bg-accent hover:bg-yellow-400 text-black px-8 py-4 rounded font-mono font-bold text-xl transition-all shadow-[0_0_20px_rgba(243,234,95,0.4)]"
                                >
                                    DOŁĄCZ DO KOLEJKI
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderGameUI = () => {
        const pairs = hardwareState?.pairs || []
        return (
            <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto z-10">
                <div className="w-full flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                    <h1 className="text-2xl font-mono text-accent flex items-center gap-2">
                        <Zap size={24} /> GRA ROZPOCZĘTA
                    </h1>
                    <div className="text-right">
                        <div className="text-xs text-gray-500 font-mono">AKTUALNY WYNIK</div>
                        <div className="text-4xl font-mono font-bold text-white tracking-widest text-shadow-neon">
                            {currentScore.toString().padStart(5, '0')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                    {pairs.map((pair: any, idx: number) => (
                        <div
                            key={idx}
                            className={clsx(
                                "relative bg-surface border-2 p-4 md:p-6 rounded-lg flex flex-col items-center justify-center transition-all duration-300",
                                pair.connected ? "border-primary shadow-[0_0_20px_rgba(0,255,65,0.3)]" : "border-red-500/30 opacity-80"
                            )}
                        >
                            <div className="text-xs font-mono text-gray-500 mb-2">{pair.label}</div>
                            <div className={clsx(
                                "w-4 h-4 rounded-full mb-2 md:mb-4",
                                pair.connected ? "bg-primary animate-pulse" : "bg-red-900"
                            )}></div>
                            <div className="font-bold text-white font-mono text-sm md:text-base">
                                {pair.connected ? "POŁĄCZONY" : "ROZŁĄCZONY"}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 md:mt-12 text-center text-gray-400 font-mono max-w-lg mx-auto">
                    <p className="mb-2 md:mb-4">MISJA: Połącz poprawnie wszystkie 8 kabli Patch Cord.</p>
                    <p>Wskazówki portów znajdują się na fizycznym sprzęcie.</p>
                </div>
            </div>
        )
    }


    return (
        <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center relative overflow-x-hidden">
            {/* Header only for non-playing states or overall branding */}
            {!gameStartedLocal && (
                <div className="absolute top-0 right-0 p-8 text-white/5 font-mono text-6xl md:text-9xl font-bold select-none pointer-events-none z-0">
                    MASTER
                </div>
            )}

            {(gameStartedLocal || isPlaying) ? renderGameUI() : renderQueueUI()}
        </div>
    )
}
