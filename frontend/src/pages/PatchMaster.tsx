import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPatchPanelState, submitGameScore, fetchPMQueue, joinPMQueue, leavePMQueue, startPMQueue, triggerTimeoutFlash, finishPMGame, api } from '../lib/api'
import { useGameStore } from '../hooks/useGameStore'
import { Zap, Users, ShieldAlert, PlayCircle, X } from 'lucide-react'
import clsx from 'clsx'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

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

    // Refs for auto-scroll to first disconnected port
    const portRefs = useRef<(HTMLDivElement | null)[]>([])

    // Randomized display order — shuffled once at game start so users can't memorize positions
    const [displayOrder, setDisplayOrder] = useState<number[]>([])

    // --- QUEUE DATA ---
    const { data: qState } = useQuery({
        queryKey: ['pm_queue'],
        queryFn: fetchPMQueue,
        refetchInterval: 1500
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
            api.post('/game/patch-master/queue/led', { effect: 'blink_red' }).catch(() => { })
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
        enabled: (gameStartedLocal && !isFinished) || qState?.status === 'resetting' || qState?.status === 'waiting_for_player'
    })

    const submitMutation = useMutation({
        mutationFn: submitGameScore,
        onSuccess: () => {
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
                leavePMQueue().catch(() => { })
            }
        }
    }, [user, gameStartedLocal, isFinished])

    // Load saved progress
    useEffect(() => {
        if (user && qState?.current_player?.id === user.id && qState?.status === 'playing') {
            const savedStateStr = localStorage.getItem(`patch_master_state_${user.id}`)
            if (savedStateStr) {
                try {
                    const savedState = JSON.parse(savedStateStr)
                    if (Date.now() - savedState.startTime < 3600000) {
                        setStartTime(savedState.startTime)
                        setGameStartedLocal(true)
                        return
                    }
                } catch (e) {
                    console.error("Error parsing saved state", e)
                }
            }
        }
    }, [user, qState?.current_player?.id, qState?.status])

    // Timer
    useEffect(() => {
        if (!gameStartedLocal || isFinished || !startTime) return

        const pmTotalTimeMs = (qState?.pm_total_time || 200) * 1000

        if (user) {
            localStorage.setItem(`patch_master_state_${user.id}`, JSON.stringify({ startTime }))
        }

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const score = Math.max(0, 10000 * (1 - (elapsed / pmTotalTimeMs)))

            if (score <= 0) {
                clearInterval(interval)
                setCurrentScore(0)
                setFinalDuration(elapsed)
                setIsFinished(true)
                triggerTimeoutFlash().catch(console.error)
                if (user) localStorage.removeItem(`patch_master_state_${user.id}`);
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
            if (user) localStorage.removeItem(`patch_master_state_${user.id}`);
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
            const now = Date.now()
            const newDeltas: any[] = []

            hardwareState.pairs.forEach((currentPair: any, idx: number) => {
                const prevPair = lastKnownPairs[idx]
                if (!prevPair.connected && currentPair.connected) {
                    const deltaMs = now - (lastPlugTime || startTime)
                    newDeltas.push({ port: currentPair.gpio, deltaMs, label: currentPair.label })
                    api.post('/game/patch-master/queue/led', { effect: 'wire_pulse' }).catch(() => { })
                }
            })

            if (newDeltas.length > 0) {
                setTimeDeltas(prev => [...prev, ...newDeltas])
                setLastPlugTime(now)
            }
        }
        setLastKnownPairs(hardwareState.pairs)
    }, [hardwareState?.pairs, gameStartedLocal, isFinished, startTime, lastPlugTime])

    // Auto-scroll to first disconnected port
    useEffect(() => {
        if (!gameStartedLocal || isFinished || !hardwareState?.pairs) return
        const firstDisconnectedIdx = hardwareState.pairs.findIndex((p: any) => !p.connected)
        if (firstDisconnectedIdx >= 0 && portRefs.current[firstDisconnectedIdx]) {
            portRefs.current[firstDisconnectedIdx]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            })
        }
    }, [hardwareState?.pairs, gameStartedLocal, isFinished])

    // Shuffle display order once when game starts and pairs are loaded
    useEffect(() => {
        if (gameStartedLocal && hardwareState?.pairs?.length && displayOrder.length === 0) {
            const indices = Array.from({ length: hardwareState.pairs.length }, (_, i) => i)
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]]
            }
            setDisplayOrder(indices)
        }
    }, [gameStartedLocal, hardwareState?.pairs?.length, displayOrder.length])

    // Check Interrupt Condition
    useEffect(() => {
        if (qState?.status === 'resetting' && gameStartedLocal && !isFinished) {
            setIsFinished(true)
            setDisplayOrder([])
            alert("GRA PRZERWANA PRZEZ ADMINISTRATORA. Punkty nie zostały naliczone.")
            navigate('/dashboard')
        }
    }, [qState?.status, gameStartedLocal, isFinished, navigate])


    // Derived UI States
    const isPlaying = qState?.status === 'playing' && qState?.current_player?.id === user?.id
    const isMyTurn = qState?.status === 'waiting_for_player' && qState?.current_player?.id === user?.id
    const isQueued = qState?.queue?.some((u: any) => u.id === user?.id)
    const position = qState?.position

    const someoneElsePlaying = qState?.status === 'playing' && qState?.current_player?.id !== user?.id
    const someoneElseWaiting = qState?.status === 'waiting_for_player' && qState?.current_player?.id !== user?.id
    const isResetting = qState?.status === 'resetting'

    const renderQueueUI = () => {
        const isGlobalBreak = qState?.global_status === 'technical_break'
        const isGlobalLocked = qState?.global_status === 'false'

        if (isGlobalLocked) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto z-10 text-center font-mono p-4">
                    <div className="crt-border bg-surface p-8 w-full">
                        <p className="text-primary/50 text-[10px] uppercase tracking-widest mb-2">&gt; SYSTEM_STATUS</p>
                        <h1 className="text-2xl font-bold text-red-400 mb-4">ZAWODY ZAKOŃCZONE</h1>
                        <p className="text-primary/40">Gra została zablokowana przez administratora.</p>
                    </div>
                </div>
            )
        }

        return (
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto z-10 text-center p-4">
                <div className="crt-border bg-surface p-6 md:p-8 w-full font-mono">
                    {/* Terminal titlebar */}
                    <div className="flex items-center gap-2 pb-4 mb-6 border-b border-primary/20">
                        <div className="w-2 h-2 bg-primary/40" />
                        <div className="w-2 h-2 bg-primary/20" />
                        <div className="w-2 h-2 bg-primary/20" />
                        <span className="text-primary/40 text-[10px] ml-2">patch_master.sh</span>
                    </div>

                    {/* GLOBAL BREAK */}
                    {isGlobalBreak && (
                        <div className="text-accent flex flex-col items-center animate-pulse mb-8 border border-accent/30 bg-accent/[0.04] p-6">
                            <ShieldAlert size={40} className="mb-2 text-glow" />
                            <p className="text-[10px] text-accent/60 uppercase tracking-widest mb-1">&gt; SYSTEM_STATUS</p>
                            <h2 className="text-xl font-bold">PRZYGOTOWYWANIE STANOWISKA</h2>
                            <p className="text-primary/40 text-sm mt-2">System na chwilę wstrzymany. Zachowaj miejsce w kolejce!</p>
                        </div>
                    )}

                    {/* LOCAL RESETTING */}
                    {isResetting && !isGlobalBreak && (
                        <div className="text-accent flex flex-col items-center animate-pulse mb-8">
                            <ShieldAlert size={48} className="mb-4" />
                            <p className="text-[10px] text-accent/60 uppercase tracking-widest mb-1">&gt; PRZERWA</p>
                            <h2 className="text-2xl font-bold mb-2">PRZERWA TECHNICZNA</h2>
                            <p className="text-primary/40 mb-6">Administrator oczekuje na reset kabli.</p>

                            {hardwareState?.pairs?.some((p: any) => p.connected) && (
                                <div className="border-2 border-red-500 bg-red-500/10 text-red-300 px-6 py-4 font-mono text-center shadow-[0_0_20px_rgba(255,0,0,0.3)]">
                                    <strong className="text-red-400">UWAGA ZAWODNIKU:</strong><br />
                                    Kable wciąż są podłączone w maszynie.<br />
                                    <strong>ODŁĄCZ WSZYSTKIE KABLE</strong> zanim system wpuści kolejną osobę!
                                </div>
                            )}
                        </div>
                    )}

                    {/* SOMEONE ELSE PLAYING */}
                    {!isResetting && !isGlobalBreak && someoneElsePlaying && (
                        <div className="flex flex-col items-center mb-8">
                            <p className="text-[10px] text-primary/40 uppercase tracking-widest mb-1">&gt; STATUS</p>
                            <h2 className="text-xl font-bold text-white mb-2">GRA W TOKU</h2>
                            <p className="text-primary/40">Gra aktualnie: <span className="text-primary font-black text-glow">{qState.current_player.nick}</span></p>
                        </div>
                    )}

                    {/* SOMEONE ELSE WAITING */}
                    {!isResetting && !isGlobalBreak && someoneElseWaiting && (
                        <div className="flex flex-col items-center mb-8">
                            <p className="text-[10px] text-primary/40 uppercase tracking-widest mb-1">&gt; STATUS</p>
                            <h2 className="text-xl font-bold text-white mb-2">OCZEKIWANIE NA GRACZA</h2>
                            <p className="text-primary/40">Wezwano: <span className="text-primary font-black text-glow">{qState.current_player.nick}</span></p>
                        </div>
                    )}

                    {/* IT'S YOUR TURN */}
                    {!isResetting && !isGlobalBreak && isMyTurn && (
                        <div className="flex flex-col items-center mb-8 border-2 border-primary bg-primary/[0.05] p-6 shadow-[0_0_40px_rgba(0,255,65,0.15)]">
                            <p className="text-[10px] text-primary/60 uppercase tracking-widest mb-1">&gt; TWOJA_KOLEJ</p>
                            <h2 className="text-3xl md:text-4xl font-black text-primary text-glow-lg mb-3 animate-pulse">TO TWOJA KOLEJ!</h2>
                            <p className="text-white mb-6 font-mono">Podejdź do skrzynki i kliknij start.</p>
                            <button
                                onClick={() => startMutation.mutate()}
                                className="bg-primary hover:bg-green-300 text-black px-8 py-4 font-mono font-black text-xl flex items-center gap-2 transition-all tracking-widest"
                            >
                                <PlayCircle size={28} />
                                START_GRY
                            </button>

                            {hardwareState?.pairs?.some((p: any) => p.connected) && (
                                <div className="mt-4 text-red-400 font-mono text-sm border border-red-500/30 p-2 bg-red-500/[0.04]">
                                    Pamiętaj o odłączeniu kabli po poprzedniku!
                                </div>
                            )}
                        </div>
                    )}

                    {/* IT'S YOUR TURN - DURING BREAK */}
                    {isGlobalBreak && isMyTurn && (
                        <div className="flex flex-col items-center mb-8 border border-primary/30 p-4">
                            <p className="text-[10px] text-primary/60 uppercase tracking-widest mb-1">&gt; PRIORYTET</p>
                            <h2 className="text-2xl font-bold text-primary text-glow mb-2">JESTEŚ PIERWSZY!</h2>
                            <p className="text-primary/40 text-sm">Czekaj na stanowisku na wznowienie gry.</p>
                        </div>
                    )}

                    {/* QUEUE ACTIONS */}
                    {!isMyTurn && (
                        <div className="flex flex-col items-center border-t border-primary/15 pt-6 mt-4">
                            {!isQueued && !isResetting && !isGlobalBreak && (
                                <div className="mb-6 p-4 border border-accent/30 bg-accent/[0.04] text-center w-full max-w-sm">
                                    <p className="text-[10px] text-accent/60 uppercase tracking-widest mb-2">&gt; INFO</p>
                                    <h3 className="text-accent font-bold text-base mb-2 flex items-center justify-center gap-2 text-glow"><Zap size={16} /> GRA FIZYCZNA</h3>
                                    <p className="text-primary/40 text-sm leading-relaxed">
                                        Podejdź do maszyny <strong className="text-white">PATCH MASTER</strong> i połącz kable! Zapisz się do kolejki — najszybsi mają szansę <strong className="text-accent">otworzyć skrytkę z nagrodą!</strong>
                                    </p>
                                </div>
                            )}

                            <Users size={36} className="text-primary/30 mb-4" />
                            <p className="text-[10px] text-primary/40 uppercase tracking-widest mb-1">&gt; KOLEJKA</p>
                            <h3 className="text-lg font-bold text-white mb-6 font-mono">GRACZY: {qState?.queue?.length || 0}</h3>

                            {isQueued ? (
                                <div className="flex flex-col items-center">
                                    <p className="text-[10px] text-primary/40 uppercase tracking-widest mb-1">&gt; POZYCJA</p>
                                    <span className="font-mono font-black text-primary text-glow-lg tabular-nums text-5xl mb-2">#{position}</span>
                                    <p className="text-primary/40 text-sm mb-6">Twoja pozycja w kolejce.</p>
                                    <button
                                        onClick={() => leaveMutation.mutate()}
                                        className="border border-red-500/30 text-red-400/60 hover:border-red-500/60 hover:text-red-400 px-6 py-2 font-mono text-sm transition-all"
                                    >
                                        OPUŚĆ KOLEJKĘ
                                    </button>
                                </div>
                            ) : (
                                !isGlobalBreak && !isResetting ? (
                                    <button
                                        onClick={() => joinMutation.mutate()}
                                        className="bg-primary hover:bg-green-300 text-black px-8 py-4 font-mono font-black text-lg transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)] tracking-widest"
                                    >
                                        DOŁĄCZ DO KOLEJKI
                                    </button>
                                ) : (
                                    <p className="text-primary/30 font-mono text-sm">
                                        Dołączanie zablokowane na czas przerwy technicznej.
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
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-7xl mx-auto z-10 p-2 md:p-8 overflow-x-hidden overflow-y-auto custom-scrollbar">
                <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-2">&gt; PATCH_MASTER // WYNIK</p>
                <h1 className={`text-3xl md:text-4xl font-mono font-bold mb-6 md:mb-8 text-center z-20 ${isSuccess ? 'text-primary text-glow' : 'text-red-400'}`}>
                    {isSuccess ? 'ZADANIE UKOŃCZONE' : 'CZAS MINĄŁ'}
                </h1>

                <div className="crt-border bg-surface p-4 md:p-8 w-full z-20 mb-8">
                    {/* Terminal titlebar */}
                    <div className="flex items-center gap-2 pb-4 mb-6 border-b border-primary/20">
                        <div className="w-2 h-2 bg-primary/40" />
                        <div className="w-2 h-2 bg-primary/20" />
                        <div className="w-2 h-2 bg-primary/20" />
                        <span className="text-primary/40 text-[10px] ml-2">stats.sh</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
                        <div className="text-center p-4 md:p-8 border border-primary/20 bg-black/50">
                            <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-2">&gt; WYNIK_KOŃCOWY</p>
                            <span className="font-mono font-black text-primary text-glow-lg tabular-nums" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>{currentScore}</span>
                        </div>
                        <div className="text-center p-4 md:p-8 border border-primary/20 bg-black/50">
                            <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-2">&gt; CAŁKOWITY_CZAS</p>
                            <span className="font-mono font-black text-white tabular-nums" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}>{finalDuration ? (finalDuration / 1000).toFixed(2) : '---'}s</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 mb-4 md:mb-8">
                        <div className="p-3 md:p-6 border border-primary/20 bg-primary/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-primary/50 mb-2 font-mono uppercase tracking-widest">&gt; NAJSZYBSZE</p>
                            <span className="text-2xl md:text-3xl font-bold text-primary font-mono mb-2">{fastestPlug ? (fastestPlug.deltaMs / 1000).toFixed(2) + 's' : '---'}</span>
                            <span className="text-xs text-primary/30 font-mono">{fastestPlug ? `Port: ${fastestPlug.label}` : ''}</span>
                        </div>
                        <div className="p-3 md:p-6 border border-red-500/20 bg-red-500/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-red-400/50 mb-2 font-mono uppercase tracking-widest">&gt; NAJDŁUŻSZE</p>
                            <span className="text-2xl md:text-3xl font-bold text-red-400 font-mono mb-2">{slowestPlug ? (slowestPlug.deltaMs / 1000).toFixed(2) + 's' : '---'}</span>
                            <span className="text-xs text-red-400/30 font-mono">{slowestPlug ? `Port: ${slowestPlug.label}` : ''}</span>
                        </div>
                        <div className="p-3 md:p-6 border border-primary/20 bg-primary/[0.03] flex flex-col items-center text-center">
                            <p className="text-[10px] text-primary/50 mb-2 font-mono uppercase tracking-widest">&gt; ŚREDNI_CZAS</p>
                            <span className="text-2xl md:text-3xl font-bold text-primary font-mono mb-2">{avgPlug ? (avgPlug / 1000).toFixed(2) + 's' : '---'}</span>
                            <span className="text-xs text-primary/30 font-mono">na pojedynczy port</span>
                        </div>
                    </div>
                </div>

                {/* Box Opening Notification */}
                {isSuccess && currentScore >= 5000 && (
                    <div className="mb-8 border-2 border-primary bg-primary/[0.06] text-primary text-center p-6 md:p-10 shadow-[0_0_60px_rgba(0,255,65,0.25)] animate-pulse flex flex-col items-center gap-4 z-20 w-full">
                        <p className="text-[10px] text-primary/60 uppercase tracking-widest">&gt; ACCESS_GRANTED</p>
                        <div className="text-3xl md:text-5xl font-black font-mono tracking-widest text-glow-lg">DOSTĘP PRZYZNANY</div>
                        <div className="text-xl md:text-3xl font-bold font-mono text-white text-center">
                            SKRYTKA ZOSTAŁA OTWARTA!<br />
                            <span className="text-accent text-2xl md:text-4xl text-glow mt-2 block">ZGARNIJ SWOJĄ NAGRODĘ!</span>
                        </div>
                    </div>
                )}
                {isSuccess && currentScore < 5000 && (
                    <div className="mb-8 border border-red-500/40 bg-red-500/[0.05] text-red-400 text-center p-4 md:p-6 z-20 w-full font-mono">
                        <p className="text-[10px] text-red-400/50 uppercase tracking-widest mb-2">&gt; ACCESS_DENIED</p>
                        <div className="text-lg md:text-xl font-bold tracking-widest">BRAK DOSTĘPU</div>
                        <div className="text-sm mt-2 text-red-400/60">WYMAGANE MINIMUM 5000 PUNKTÓW, ABY OTWORZYĆ SKRYTKĘ.</div>
                    </div>
                )}

                <div className="flex flex-col items-center mt-2 z-20 w-full">
                    {isSuccess && currentScore >= 5000 && (
                        <div className="my-4 flex justify-center w-full">
                            <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-12 md:h-16 invert opacity-50" />
                        </div>
                    )}
                    <button
                        onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ['pm_queue'] })
                            navigate('/dashboard')
                        }}
                        className="border border-primary/25 hover:border-primary/60 bg-primary/[0.04] hover:bg-primary/[0.08] text-primary/60 hover:text-primary px-8 py-4 font-bold font-mono text-lg transition-all"
                    >
                        &gt; POWRÓT_DO_BAZY
                    </button>
                </div>
            </div>
        )
    }

    const renderGameUI = () => {
        const pairs = hardwareState?.pairs || []
        // portInstructions[i] is tied to pairs[i] from hardware — same index = same physical pair
        const portInstructions = [
            "GÓRA 1 ↔ DÓŁ 24",
            "GÓRA 5 ↔ DÓŁ 18",
            "GÓRA 9 ↔ DÓŁ 3",
            "GÓRA 13 ↔ DÓŁ 13",
            "GÓRA 16 ↔ DÓŁ 7",
            "GÓRA 20 ↔ DÓŁ 2",
            "GÓRA 21 ↔ DÓŁ 23",
            "GÓRA 22 ↔ DÓŁ 10"
        ]

        const order = displayOrder.length === pairs.length
            ? displayOrder
            : pairs.map((_: any, i: number) => i)

        return (
            <div className="flex-1 flex flex-col w-full max-w-[90vw] xl:max-w-[80vw] mx-auto z-10 relative mt-4 md:mt-8">
                {/* HUD */}
                <div className="w-full flex justify-between items-start mb-4 crt-border bg-surface p-3 md:p-5 gap-2 z-10 relative">
                    <div className="flex flex-col gap-1 shrink-0">
                        <p className="text-primary/50 text-[9px] font-mono uppercase tracking-widest">&gt; PATCH_MASTER</p>
                        <h1 className="text-xl md:text-3xl font-mono text-primary flex items-center gap-2 font-bold text-glow">
                            <Zap size={22} className="shrink-0" /> PATCH_MASTER
                        </h1>
                        <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-6 md:h-9 w-auto object-contain invert opacity-40" />
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                        <p className="text-[9px] md:text-[10px] text-primary/40 font-mono uppercase tracking-widest mb-1">AKTUALNY WYNIK</p>
                        <span className="font-mono font-black text-primary text-glow-lg tabular-nums leading-none" style={{ fontSize: 'clamp(2.5rem, 8vw, 7rem)' }}>
                            {currentScore.toString().padStart(5, '0')}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-4 md:mt-6">
                    {order.map((originalIdx: number, displayPos: number) => {
                        const pair = pairs[originalIdx]
                        if (!pair) return null
                        return (
                            <div
                                key={originalIdx}
                                ref={(el) => { portRefs.current[displayPos] = el }}
                                className={clsx(
                                    "crt-border bg-surface p-4 md:p-8 xl:p-10 flex flex-col items-center justify-center transition-all duration-300",
                                    pair.connected
                                        ? "border-primary shadow-[0_0_30px_rgba(0,255,65,0.25)]"
                                        : "border-red-500/20 opacity-80"
                                )}
                            >
                                <p className="text-[10px] font-mono text-primary/40 mb-3 uppercase tracking-widest">&gt; {pair.label}</p>
                                <div className={clsx(
                                    "w-4 h-4 md:w-6 md:h-6 mb-4",
                                    pair.connected ? "bg-primary shadow-[0_0_15px_rgba(0,255,65,1)] animate-pulse" : "bg-red-900"
                                )} />
                                <div className={`font-black font-mono text-sm md:text-lg mb-3 ${pair.connected ? 'text-primary text-glow' : 'text-red-400/60'}`}>
                                    {pair.connected ? "POŁĄCZONY" : "ROZŁĄCZONY"}
                                </div>
                                <div className="border border-accent/40 bg-black/60 px-3 py-2 md:px-4 md:py-3 font-mono font-black text-accent text-xs md:text-base text-center w-full shadow-[0_0_15px_rgba(204,255,0,0.1)]">
                                    {portInstructions[originalIdx]}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="mt-10 md:mt-16 text-center font-mono w-full">
                    <p className="text-primary/50 text-[10px] uppercase tracking-widest mb-2">&gt; MISJA</p>
                    <p className="mb-2 md:mb-4 text-lg md:text-2xl xl:text-3xl text-white">Połącz poprawnie wszystkie 8 kabli Patch Cord.</p>
                    <p className="text-sm md:text-lg xl:text-xl text-primary/30">Wskazówki portów znajdują się na fizycznym sprzęcie oraz na ekranie powyżej.</p>
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
        <div className="min-h-[100dvh] p-4 md:p-8 flex flex-col items-center relative overflow-x-hidden overflow-y-auto custom-scrollbar">
            {/* Grid bg */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
                backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            {!isFinished && (
                <button
                    onClick={handleExit}
                    className="absolute top-4 left-4 z-50 border border-red-500/30 hover:border-red-500/60 bg-red-500/[0.04] hover:bg-red-500/[0.08] text-red-400/60 hover:text-red-400 font-mono px-4 py-2 transition-all flex items-center gap-2 text-sm"
                >
                    <X size={16} /> WYJDŹ
                </button>
            )}

            {isFinished ? renderStatsUI() : (gameStartedLocal || isPlaying) ? renderGameUI() : renderQueueUI()}
        </div>
    )
}
