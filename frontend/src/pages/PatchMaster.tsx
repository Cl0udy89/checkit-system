import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPatchPanelState, submitGameScore, fetchPMQueue, joinPMQueue, leavePMQueue, startPMQueue, triggerTimeoutFlash, finishPMGame } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { Zap, Users, ShieldAlert, PlayCircle, X } from 'lucide-react'
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

    // --- STATS STATE ---
    const [timeDeltas, setTimeDeltas] = useState<{ port: string, deltaMs: number, label: string }[]>([])
    const [lastPlugTime, setLastPlugTime] = useState<number | null>(null)
    const [lastKnownPairs, setLastKnownPairs] = useState<any[] | null>(null)
    const [finalDuration, setFinalDuration] = useState<number | null>(null)

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
        refetchInterval: 500, // Poll enough to see connections
        enabled: (gameStartedLocal && !isFinished) || qState?.status === 'resetting' || qState?.status === 'waiting_for_player'
    })

    const submitMutation = useMutation({
        mutationFn: submitGameScore,
        onSuccess: () => {
            // Stats UI will handle display; don't navigate yet
            // Free the queue for the next player!
            finishPMGame().catch((e) => console.error("Failed to finish PM game", e))
        },
        onError: (err: any) => {
            if (err?.response?.status === 403) {
                alert(err?.response?.data?.detail === "PRZERWA_TECHNICZNA" ? "PRZERWA TECHNICZNA: Czekaj." : "ZAWODY ZAKOŃCZONE");
            }
        }
    })

    // Auto-leave queue on unmount
    useEffect(() => {
        return () => {
            if (user && !gameStartedLocal && !isFinished) {
                // Fire and forget upon leaving the page
                leavePMQueue().catch(() => { })
            }
        }
    }, [user, gameStartedLocal, isFinished])

    // Timer
    useEffect(() => {
        if (!gameStartedLocal || isFinished || !startTime) return
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const score = Math.max(0, 10000 - (elapsed * 0.1))

            if (score <= 0) {
                clearInterval(interval)
                setCurrentScore(0)
                setFinalDuration(elapsed)
                setIsFinished(true)
                triggerTimeoutFlash().catch(console.error)
                submitMutation.mutate({
                    user_id: user?.id || 0,
                    game_type: 'patch_master',
                    answers: {},
                    duration_ms: elapsed
                })
            } else {
                setCurrentScore(Math.floor(score))
            }
        }, 100)
        return () => clearInterval(interval)
    }, [startTime, isFinished, gameStartedLocal, submitMutation, user])

    // Check win condition
    useEffect(() => {
        if ((hardwareState?.solved || qState?.force_solved) && !isFinished && gameStartedLocal && startTime) {
            setIsFinished(true)
            const duration = Date.now() - startTime
            setFinalDuration(duration)
            submitMutation.mutate({
                user_id: user?.id || 0,
                game_type: 'patch_master',
                answers: {},
                duration_ms: duration
            })
        }
    }, [hardwareState, qState?.force_solved, isFinished, startTime, user, submitMutation, gameStartedLocal])

    // Hardware Pair Plug Tracking
    useEffect(() => {
        if (!gameStartedLocal || isFinished || !startTime || !hardwareState?.pairs) return

        if (!lastPlugTime) setLastPlugTime(startTime)

        if (lastKnownPairs) {
            hardwareState.pairs.forEach((currentPair: any, idx: number) => {
                const prevPair = lastKnownPairs[idx]
                if (!prevPair.connected && currentPair.connected) {
                    const now = Date.now()
                    const deltaMs = now - (lastPlugTime || startTime)
                    setTimeDeltas(prev => [...prev, { port: currentPair.gpio, deltaMs, label: currentPair.label }])
                    setLastPlugTime(now)
                }
            })
        }
        setLastKnownPairs(hardwareState.pairs)
    }, [hardwareState?.pairs, gameStartedLocal, isFinished, startTime, lastPlugTime])

    // Check Interrupt Condition
    useEffect(() => {
        if (qState?.status === 'resetting' && gameStartedLocal && !isFinished) {
            setIsFinished(true)
            alert("GRA PRZERWANA PRZEZ ADMINISTRATORA. Punkty nie zostały naliczone.")
            navigate('/dashboard')
        }
    }, [qState?.status, gameStartedLocal, isFinished, navigate])


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
        const isGlobalBreak = qState?.global_status === 'technical_break'
        const isGlobalLocked = qState?.global_status === 'false'

        // If completely locked
        if (isGlobalLocked) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto z-10 text-center text-red-500 font-mono">
                    <h1 className="text-4xl font-bold mb-4">ZAWODY ZAKOŃCZONE</h1>
                    <p className="text-xl">Gra została zablokowana przez administratora.</p>
                </div>
            )
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto z-10 text-center">
                <div className="bg-surface border-2 border-gray-700 rounded-2xl p-8 shadow-2xl w-full">
                    {/* GLOBAL BREAK TOP HEADER */}
                    {isGlobalBreak && (
                        <div className="text-yellow-500 flex flex-col items-center animate-pulse mb-8 border-b border-gray-700 pb-6">
                            <ShieldAlert size={48} className="mb-2" />
                            <h2 className="text-2xl font-mono font-bold">PRZYGOTOWYWANIE STANOWISKA</h2>
                            <p className="text-gray-400 font-mono text-sm">System na chwilę wstrzymany. Zachowaj miejsce w kolejce!</p>
                        </div>
                    )}

                    {/* LOCAL RESETTING */}
                    {isResetting && !isGlobalBreak && (
                        <div className="text-yellow-500 flex flex-col items-center animate-pulse mb-8">
                            <ShieldAlert size={64} className="mb-4" />
                            <h2 className="text-3xl font-mono font-bold mb-2">PRZERWA TECHNICZNA</h2>
                            <p className="text-gray-400 font-mono mb-6">Administrator oczekuje na reset kabli.</p>

                            {hardwareState?.solved && (
                                <div className="bg-red-900/50 border border-red-500 text-red-200 px-6 py-4 rounded-lg font-mono text-center shadow-[0_0_20px_rgba(255,0,0,0.5)]">
                                    <strong>UWAGA ZAWODNIKU:</strong><br />
                                    Kable wciąż są podłączone w maszynie.<br />
                                    <strong>ODŁĄCZ WSZYSTKIE KABLE</strong> zanim system wpuści kolejną osobę!
                                </div>
                            )}
                        </div>
                    )}

                    {/* SOMEONE ELSE PLAYING */}
                    {!isResetting && !isGlobalBreak && someoneElsePlaying && (
                        <div className="text-blue-400 flex flex-col items-center mb-8">
                            <h2 className="text-2xl font-mono font-bold mb-2">GRA W TOKU</h2>
                            <p className="text-white font-mono text-xl">Gra aktualnie: <span className="text-accent font-bold">{qState.current_player.nick}</span></p>
                        </div>
                    )}

                    {/* SOMEONE ELSE WAITING */}
                    {!isResetting && !isGlobalBreak && someoneElseWaiting && (
                        <div className="text-purple-400 flex flex-col items-center mb-8">
                            <h2 className="text-2xl font-mono font-bold mb-2">OCZEKIWANIE NA GRACZA</h2>
                            <p className="text-white font-mono text-xl">Wezwano: <span className="text-accent font-bold">{qState.current_player.nick}</span></p>
                        </div>
                    )}

                    {/* IT'S YOUR TURN - NOT BREAK */}
                    {!isResetting && !isGlobalBreak && isMyTurn && (
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

                            {hardwareState?.solved && (
                                <div className="mt-4 text-red-400 font-mono text-sm border border-red-500/50 p-2 rounded bg-red-900/20">
                                    Pamiętaj o odłączeniu kabli po poprzedniku!
                                </div>
                            )}
                        </div>
                    )}

                    {/* IT'S YOUR TURN - DURING BREAK */}
                    {isGlobalBreak && isMyTurn && (
                        <div className="text-green-500 flex flex-col items-center mb-8 border border-green-500/50 p-4 rounded-xl">
                            <h2 className="text-3xl font-mono font-bold mb-2">JESTEŚ PIERWSZY!</h2>
                            <p className="text-gray-400 font-mono mb-4 text-sm">Czekaj na stanowisku na wznowienie gry.</p>
                        </div>
                    )}

                    {/* QUEUE ACTIONS */}
                    {!isMyTurn && (
                        <div className="flex flex-col items-center border-t border-gray-700 pt-8 mt-4">
                            <Users size={48} className="text-gray-500 mb-4" />
                            <h3 className="text-xl font-mono text-white mb-6">KOLEJKA GRACZY ({qState?.queue?.length || 0})</h3>

                            {isQueued ? (
                                <div className="flex flex-col items-center">
                                    <div className="text-6xl font-black text-accent font-mono mb-2">#{position}</div>
                                    <p className="text-gray-400 font-mono mb-6">Twoja pozycja w kolejce.</p>
                                    <button
                                        onClick={() => leaveMutation.mutate()}
                                        className="border border-red-500 text-red-500 hover:bg-red-500/20 px-6 py-2 rounded font-mono transition-colors"
                                    >
                                        OPUŚĆ KOLEJKĘ
                                    </button>
                                </div>
                            ) : (
                                !isGlobalBreak && !isResetting && !gameStartedLocal && !someoneElsePlaying ? (
                                    <button
                                        onClick={() => joinMutation.mutate()}
                                        className="bg-accent hover:bg-yellow-400 text-black px-8 py-4 rounded font-mono font-bold text-xl transition-all shadow-[0_0_20px_rgba(243,234,95,0.4)]"
                                    >
                                        DOŁĄCZ DO KOLEJKI
                                    </button>
                                ) : (
                                    <p className="text-gray-500 font-mono">
                                        {gameStartedLocal || someoneElsePlaying ? 'Trwa gra.' : 'Dołączanie zablokowane na czas przerwy.'}
                                    </p>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    const renderStatsUI = () => {
        const fastestPlug = timeDeltas.length > 0 ? timeDeltas.reduce((min, p) => p.deltaMs < min.deltaMs ? p : min, timeDeltas[0]) : null
        const slowestPlug = timeDeltas.length > 0 ? timeDeltas.reduce((max, p) => p.deltaMs > max.deltaMs ? p : max, timeDeltas[0]) : null
        const avgPlug = timeDeltas.length > 0 ? Math.round(timeDeltas.reduce((sum, p) => sum + p.deltaMs, 0) / timeDeltas.length) : 0
        const isSuccess = currentScore > 0

        return (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto z-10 p-2 md:p-4">
                <h1 className={`text-4xl md:text-5xl font-mono font-bold mb-4 md:mb-8 text-center drop-shadow-md ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
                    {isSuccess ? 'ZADANIE UKOŃCZONE' : 'CZAS MINĄŁ'}
                </h1>

                <div className="bg-surface border-2 border-gray-700 rounded-2xl p-4 md:p-8 shadow-2xl w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
                        <div className="text-center p-4 md:p-6 border border-gray-700 rounded-lg bg-black/50">
                            <div className="text-gray-400 font-mono mb-2 text-sm md:text-base">WYNIK KOŃCOWY</div>
                            <div className="text-4xl md:text-5xl font-bold text-accent font-mono">{currentScore}</div>
                        </div>
                        <div className="text-center p-4 md:p-6 border border-gray-700 rounded-lg bg-black/50">
                            <div className="text-gray-400 font-mono mb-2 text-sm md:text-base">CAŁKOWITY CZAS</div>
                            <div className="text-4xl md:text-5xl font-bold text-white font-mono">{finalDuration ? (finalDuration / 1000).toFixed(2) : '---'}s</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-8">
                        <div className="p-3 md:p-4 border border-green-900/50 bg-green-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-green-500/80 mb-2 font-mono">NAJSZYBSZE WPIĘCIE</div>
                            <div className="text-xl md:text-2xl font-bold text-green-400 font-mono mb-1">{fastestPlug ? (fastestPlug.deltaMs / 1000).toFixed(2) + 's' : '---'}</div>
                            <div className="text-[10px] md:text-sm text-gray-500 font-mono">{fastestPlug ? `Port: ${fastestPlug.label}` : ''}</div>
                        </div>
                        <div className="p-3 md:p-4 border border-red-900/50 bg-red-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-red-500/80 mb-2 font-mono">NAJDŁUŻSZE ZASTANOWIENIE</div>
                            <div className="text-xl md:text-2xl font-bold text-red-400 font-mono mb-1">{slowestPlug ? (slowestPlug.deltaMs / 1000).toFixed(2) + 's' : '---'}</div>
                            <div className="text-[10px] md:text-sm text-gray-500 font-mono">{slowestPlug ? `Port: ${slowestPlug.label}` : ''}</div>
                        </div>
                        <div className="p-3 md:p-4 border border-blue-900/50 bg-blue-900/10 rounded-lg flex flex-col items-center text-center">
                            <div className="text-[10px] md:text-xs text-blue-500/80 mb-2 font-mono">ŚREDNI CZAS AKCJI</div>
                            <div className="text-xl md:text-2xl font-bold text-blue-400 font-mono mb-1">{avgPlug ? (avgPlug / 1000).toFixed(2) + 's' : '---'}</div>
                            <div className="text-[10px] md:text-sm text-gray-500 font-mono">na pojedynczy port</div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-6 md:mt-8">
                        <button
                            onClick={() => {
                                queryClient.invalidateQueries({ queryKey: ['pm_queue'] })
                                navigate('/dashboard')
                            }}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold font-mono text-lg md:text-xl transition-colors border border-gray-600"
                        >
                            POWRÓT DO BAZY
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const renderGameUI = () => {
        const pairs = hardwareState?.pairs || []
        return (
            <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto z-10">
                <div className="w-full flex justify-between items-center mb-8 border-b border-gray-800 pb-4 gap-4 flex-wrap">
                    <h1 className="text-xl md:text-2xl font-mono text-accent flex items-center gap-2">
                        <Zap size={24} className="shrink-0" /> GRA ROZPOCZĘTA
                    </h1>
                    <div className="text-right whitespace-nowrap">
                        <div className="text-xs text-gray-500 font-mono">AKTUALNY WYNIK</div>
                        <div className="text-3xl md:text-4xl font-mono font-bold text-white tracking-widest text-shadow-neon">
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

    const handleExit = () => {
        if (isQueued || isMyTurn) {
            if (window.confirm("UWAGA!\nWyjście z tej strony automatycznie usunie Cię z kolejki graczy!\nCzy na pewno chcesz wrócić do Dashboardu?")) {
                leaveMutation.mutate()
                navigate('/dashboard')
            }
        } else {
            navigate('/dashboard')
        }
    }

    return (
        <div className="min-h-[100dvh] bg-transparent p-4 md:p-8 flex flex-col items-center relative overflow-x-hidden touch-none overflow-hidden">
            {!isFinished && (
                <button
                    onClick={handleExit}
                    className="absolute top-4 left-4 z-50 bg-red-900/60 hover:bg-red-900 text-white font-mono px-4 py-2 rounded-lg border border-red-500/50 transition-all flex items-center gap-2 shadow-lg backdrop-blur-md"
                >
                    <X size={20} /> WYJDŹ
                </button>
            )}

            {isFinished ? renderStatsUI() : (gameStartedLocal || isPlaying) ? renderGameUI() : renderQueueUI()}
        </div>
    )
}
