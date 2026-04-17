import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard, api, fetchPatchPanelState } from '../lib/api'
import { useState, useEffect, useRef, useMemo, memo } from 'react'
import { Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import sparkSomeLogo from '../assets/sparkSomeLogo_Black.png'

// ─── Matrix background ─────────────────────────────────────────────────────────
// TV-safe: no backdrop-blur, no canvas, only CSS (compositor layers via willChange)
const MatrixBackground = memo(() => (
    <>
        <style>{`
            @keyframes nb1{0%,100%{transform:translate(0px,0px) scale(1)}50%{transform:translate(60px,-40px) scale(1.06)}}
            @keyframes nb2{0%,100%{transform:translate(0px,0px)}50%{transform:translate(-50px,50px)}}
        `}</style>
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-background">
            {/* Primary green glow — top-left */}
            <div style={{
                position: 'absolute', top: '5%', left: '10%',
                width: '45vw', height: '45vw', maxWidth: 640, maxHeight: 640,
                background: 'radial-gradient(circle, rgba(0,255,65,0.10) 0%, rgba(0,255,65,0.03) 55%, transparent 80%)',
                filter: 'blur(80px)',
                animation: 'nb1 18s ease-in-out infinite',
                willChange: 'transform',
            }} />
            {/* Secondary green glow — bottom-right */}
            <div style={{
                position: 'absolute', bottom: '5%', right: '8%',
                width: '40vw', height: '40vw', maxWidth: 580, maxHeight: 580,
                background: 'radial-gradient(circle, rgba(0,255,65,0.07) 0%, transparent 75%)',
                filter: 'blur(90px)',
                animation: 'nb2 24s ease-in-out infinite',
                willChange: 'transform',
            }} />
            {/* Matrix grid */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.035,
                backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
            }} />
            {/* Scanlines */}
            <div style={{
                position: 'absolute', inset: 0, opacity: 0.04,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.4) 2px, rgba(0,255,65,0.4) 4px)',
                pointerEvents: 'none',
            }} />
        </div>
    </>
))

// ─── Leaderboard section ───────────────────────────────────────────────────────
// memo + defined outside parent → never remounts on pmQueue re-render
const Section = memo(({ title, list }: { title: string; list: any[] }) => (
    <div className="bg-surface border border-primary/20 p-3 xl:p-5 shadow-lg h-full flex flex-col">
        {/* Terminal titlebar */}
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-primary/15">
            <div className="w-2 h-2 bg-primary/40 shrink-0" />
            <div className="w-2 h-2 bg-primary/20 shrink-0" />
            <div className="w-2 h-2 bg-primary/20 shrink-0" />
            <span className="text-primary/30 text-[9px] ml-1 font-mono">{title.toLowerCase().replace(' ', '_')}.sh</span>
        </div>
        <p className="text-primary/40 text-[9px] font-mono uppercase tracking-widest mb-1">&gt; RANKING</p>
        <h3 className="text-lg xl:text-xl 2xl:text-2xl font-mono font-bold text-primary mb-3 shrink-0" style={{ textShadow: '0 0 10px rgba(0,255,65,0.5)' }}>{title}</h3>
        <div className="flex justify-between text-[10px] xl:text-xs text-primary/30 font-mono mb-1.5 px-1 shrink-0 uppercase tracking-widest">
            <span>POS / NICK</span>
            <span>PKT</span>
        </div>
        <div className="flex-1 overflow-hidden relative flex flex-col">
            <div className={`flex flex-col gap-0 w-full shrink-0 ${list?.length > 6 ? 'animate-scroll' : ''}`}>
                {list?.map((entry, idx) => (
                    <div key={`item-${idx}`} className={`flex justify-between items-center font-mono text-sm xl:text-base 2xl:text-lg border-b border-primary/[0.07] pb-1 xl:pb-1.5 last:border-0 px-1 py-1 shrink-0 ${idx === 0 ? 'bg-primary/[0.04]' : ''}`}>
                        <span className="flex items-center gap-2 truncate flex-1 min-w-0 mr-3">
                            <span className={`font-bold shrink-0 text-sm xl:text-base ${idx === 0 ? 'text-primary' : idx < 3 ? 'text-primary/60' : 'text-primary/25'}`}
                                style={idx === 0 ? { textShadow: '0 0 8px rgba(0,255,65,0.7)' } : undefined}>
                                #{idx + 1}
                            </span>
                            <span className={`truncate ${idx === 0 ? 'text-white font-black' : 'text-primary/50'}`}>{entry.nick}</span>
                        </span>
                        <span className={`font-bold text-sm xl:text-base shrink-0 tabular-nums ${idx === 0 ? 'text-primary' : 'text-primary/50'}`}
                            style={idx === 0 ? { textShadow: '0 0 8px rgba(0,255,65,0.6)' } : undefined}>
                            {entry.score}
                        </span>
                    </div>
                ))}
                {list?.length > 6 && list.map((entry, idx) => (
                    <div key={`dup-${idx}`} className={`flex justify-between items-center font-mono text-sm xl:text-base 2xl:text-lg border-b border-primary/[0.07] pb-1 xl:pb-1.5 last:border-0 px-1 py-1 shrink-0`}>
                        <span className="flex items-center gap-2 truncate flex-1 min-w-0 mr-3">
                            <span className={`font-bold shrink-0 ${idx < 3 ? 'text-primary/60' : 'text-primary/25'}`}>#{idx + 1}</span>
                            <span className="truncate text-primary/50">{entry.nick}</span>
                        </span>
                        <span className="font-bold text-sm xl:text-base shrink-0 tabular-nums text-primary/50">{entry.score}</span>
                    </div>
                ))}
                {(!list || list.length === 0) && <div className="text-primary/20 text-xs font-mono">BRAK_DANYCH</div>}
            </div>
        </div>
    </div>
))

// ─── Main component ────────────────────────────────────────────────────────────

export default function ScreenLeaderboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: fetchLeaderboard,
        refetchInterval: 5000,
        staleTime: 4000,
        refetchIntervalInBackground: true,
    })

    const { data: pmQueue } = useQuery({
        queryKey: ['pm_queue_global'],
        queryFn: async () => (await api.get('/game/patch-master/queue')).data,
        refetchInterval: 1000,
        refetchIntervalInBackground: true,
        select: (d: any) => ({
            status: d.status as string | undefined,
            current_player: d.current_player as any,
            start_time: d.start_time as number | undefined,
            pm_total_time: d.pm_total_time as number | undefined,
        }),
    })

    // Hardware state — port mini-grid visible on screen during PM game
    const { data: hwState } = useQuery({
        queryKey: ['pm_hw_screen'],
        queryFn: fetchPatchPanelState,
        refetchInterval: 500,
        enabled: pmQueue?.status === 'playing',
        refetchIntervalInBackground: true,
    })

    // Score countdown: direct DOM write, never triggers React re-render
    const pmScoreRef = useRef(10000)
    const scoreDisplayRef = useRef<HTMLDivElement>(null)

    // Saved snapshot displayed for 5 s after the game ends
    const [finishedData, setFinishedData] = useState<{ player: any; score: number } | null>(null)

    const prevStatusRef = useRef<string | undefined>(undefined)
    const currentPlayerRef = useRef<any>(null)
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Cable connection flash animations
    const [cableFlashes, setCableFlashes] = useState<{ id: number; label: string }[]>([])
    const prevPairsRef = useRef<any[] | null>(null)

    useEffect(() => {
        if (!hwState?.pairs || pmQueue?.status !== 'playing') {
            prevPairsRef.current = null
            return
        }
        if (prevPairsRef.current) {
            const newFlashes: { id: number; label: string }[] = []
            hwState.pairs.forEach((pair: any, idx: number) => {
                const prev = prevPairsRef.current![idx]
                if (prev && !prev.connected && pair.connected) {
                    newFlashes.push({ id: Date.now() + Math.random(), label: pair.label })
                }
            })
            if (newFlashes.length > 0) {
                setCableFlashes(prev => [...prev, ...newFlashes])
                const ids = newFlashes.map(f => f.id)
                setTimeout(() => setCableFlashes(prev => prev.filter(f => !ids.includes(f.id))), 1400)
            }
        }
        prevPairsRef.current = hwState.pairs
    }, [hwState?.pairs, pmQueue?.status])

    // Keep player ref fresh so it's captured at the exact moment the game ends
    useEffect(() => {
        if (pmQueue?.current_player) currentPlayerRef.current = pmQueue.current_player
    }, [pmQueue?.current_player])

    // Effect 1: live score countdown → direct DOM, no React state, no re-render
    useEffect(() => {
        if (pmQueue?.status !== 'playing' || !pmQueue?.start_time) return
        pmScoreRef.current = 10000
        const startTime = pmQueue.start_time
        const totalMs = (pmQueue.pm_total_time || 200) * 1000
        const tick = () => {
            const elapsed = Date.now() - startTime * 1000
            const score = Math.floor(Math.max(0, 10000 * (1 - elapsed / totalMs)))
            pmScoreRef.current = score
            if (scoreDisplayRef.current) {
                scoreDisplayRef.current.textContent = score.toString().padStart(5, '0')
            }
        }
        tick()
        const interval = setInterval(tick, 50)
        return () => clearInterval(interval)
    }, [pmQueue?.status, pmQueue?.start_time, pmQueue?.pm_total_time])

    // Effect 2: overlay state machine – ref-based timer survives status skips
    useEffect(() => {
        const status = pmQueue?.status
        const prev = prevStatusRef.current
        prevStatusRef.current = status

        if (status === 'playing') {
            if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null }
            setFinishedData(null)
            return
        }

        if (prev === 'playing' || status === 'finished') {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
            const player = pmQueue?.current_player ?? currentPlayerRef.current
            setFinishedData({ player, score: pmScoreRef.current })
            hideTimerRef.current = setTimeout(() => {
                setFinishedData(null)
                hideTimerRef.current = null
            }, 5000)
        }
    }, [pmQueue?.status])

    // Grandmaster section — plain div, memo, no motion.div (performance)
    const grandmasterSection = useMemo(() => (
        <div className="flex-none h-[45%] mb-4 xl:mb-6 relative z-10">
            <div className="bg-surface border border-accent/30 p-4 xl:p-6 shadow-[0_0_40px_rgba(204,255,0,0.06)] h-full flex flex-col relative overflow-hidden">
                {/* Terminal titlebar */}
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-accent/20 shrink-0">
                    <div className="w-2 h-2 bg-accent/60" />
                    <div className="w-2 h-2 bg-accent/30" />
                    <div className="w-2 h-2 bg-accent/30" />
                    <span className="text-accent/30 text-[9px] ml-1 font-mono">grandmaster.sh</span>
                </div>
                <p className="text-accent/40 text-[10px] font-mono uppercase tracking-widest mb-1 shrink-0">&gt; TOP_SCORE</p>
                <h3 className="text-xl xl:text-2xl 2xl:text-3xl font-mono font-extrabold text-accent mb-4 xl:mb-5 shrink-0"
                    style={{ textShadow: '0 0 15px rgba(204,255,0,0.5)' }}>
                    ALL GAMES: GRANDMASTER
                </h3>
                <div className="flex-1 flex gap-4 xl:gap-6 justify-center overflow-hidden">
                    {data?.grandmaster?.length > 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 border border-accent/40 bg-accent/[0.04] h-full relative">
                            <div className="flex items-center justify-center gap-4 w-full mb-3">
                                <span className="text-accent font-black shrink-0"
                                    style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', textShadow: '0 0 20px rgba(204,255,0,0.8)' }}>
                                    #1
                                </span>
                                <span className="text-white font-bold truncate"
                                    style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}>
                                    {data.grandmaster[0].nick}
                                </span>
                            </div>
                            <span className="font-mono font-black text-primary tabular-nums"
                                style={{ fontSize: 'clamp(1.8rem, 4vw, 3.5rem)', textShadow: '0 0 15px rgba(0,255,65,0.8)' }}>
                                {data.grandmaster[0].score}
                            </span>
                        </div>
                    )}
                    <div className="flex-1 flex flex-col gap-3 justify-center">
                        {data?.grandmaster?.slice(1, 3).map((entry: any, i: number) => {
                            const idx = i + 1
                            return (
                                <div
                                    key={idx}
                                    className="flex-1 flex justify-between items-center font-mono border border-primary/15 p-3 xl:p-4 bg-surface/40"
                                >
                                    <span className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                                        <span className={`font-black shrink-0 ${idx === 1 ? 'text-primary/50' : 'text-primary/30'}`}
                                            style={{ fontSize: 'clamp(1.5rem, 3.5vw, 3rem)' }}>
                                            #{idx + 1}
                                        </span>
                                        <span className="text-white truncate"
                                            style={{ fontSize: 'clamp(1rem, 2.5vw, 2rem)' }}>
                                            {entry.nick}
                                        </span>
                                    </span>
                                    <span className="text-primary/70 font-black tabular-nums"
                                        style={{ fontSize: 'clamp(1rem, 2.5vw, 2rem)' }}>
                                        {entry.score}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    ), [data?.grandmaster])

    if (isLoading) return (
        <div className="fixed inset-0 flex items-center justify-center bg-background font-mono text-primary text-xl animate-pulse">
            &gt; SYNCHRONIZACJA_WYNIKÓW..._
        </div>
    )

    const isPlaying = pmQueue?.status === 'playing' && !!pmQueue?.current_player
    const overlayVisible = isPlaying || finishedData !== null
    const displayPlayer = isPlaying ? pmQueue.current_player : finishedData?.player
    const displayScore = finishedData?.score ?? 0
    const isFinishedMode = !isPlaying && finishedData !== null

    return (
        <>
            {/* MatrixBackground at z-[0] – always below content at z-[10] */}
            <MatrixBackground />

            {/* Content layer at z-[10] */}
            <div className="fixed inset-0 overflow-hidden p-4 xl:p-6 flex flex-col z-10">

                {/* Header */}
                <div className="flex flex-col items-center w-full mb-4 xl:mb-6 shrink-0">
                    <div className="flex items-center w-full relative justify-center mb-3">
                        <div className="absolute left-0 flex flex-col items-start gap-1">
                            <img src={sparkSomeLogo} alt="SparkSome Logo" className="h-8 md:h-10 lg:h-12 xl:h-16 w-auto invert opacity-50" />
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <p className="text-primary/40 text-[10px] font-mono uppercase tracking-widest mb-1">&gt; SYSTEM_RANKING</p>
                            <h1 className="font-mono font-bold text-white tracking-tighter animate-flicker"
                                style={{ fontSize: 'clamp(1.8rem, 5vw, 4.5rem)', textShadow: '0 0 20px rgba(0,255,65,0.15)' }}>
                                RANKING_OGÓLNY
                            </h1>
                        </div>
                    </div>
                    {data?.leaderboard_message && (
                        <div className="text-base xl:text-2xl font-bold font-mono text-accent px-6 py-3 border border-accent/30 bg-accent/[0.05] text-center"
                            style={{ textShadow: '0 0 15px rgba(204,255,0,0.5)' }}>
                            {data.leaderboard_message}
                        </div>
                    )}
                </div>

                {grandmasterSection}

                {/* Section grid */}
                <div className="flex-1 flex gap-3 xl:gap-5 min-h-0">
                    <div className="flex-1 min-h-0"><Section title="BINARY BRAIN" list={data?.binary_brain || []} /></div>
                    <div className="flex-1 min-h-0"><Section title="PATCH MASTER" list={data?.patch_master || []} /></div>
                    <div className="flex-1 min-h-0"><Section title="IT MATCH" list={data?.it_match || []} /></div>
                    <div className="flex-1 min-h-0"><Section title="TEXT MATCH" list={data?.text_match || []} /></div>
                </div>
            </div>

            {/* ── Live Patch Master Overlay ─────────────────────────────────────────
                fixed inset-0 → always viewport-centred, unaffected by parent flex.
                Framer Motion used ONLY here (infrequent: appears/disappears ~2×/game).
                bg-black/70 dims leaderboard cheaply without backdrop-blur.
                Inner div: simple easeOut tween (cheaper than spring on low-end CPU). */}
            <AnimatePresence>
                {overlayVisible && displayPlayer && (
                    <motion.div
                        key="overlay-wrapper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="fixed inset-0 flex items-center justify-center z-[100] bg-black/75"
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className={`bg-background border-2 p-8 xl:p-12 flex flex-col items-center gap-4 w-[88vw] max-w-5xl text-center ${
                                isFinishedMode
                                    ? displayScore >= 5000
                                        ? 'border-primary shadow-[0_0_80px_rgba(0,255,65,0.4)]'
                                        : 'border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.4)]'
                                    : 'border-accent shadow-[0_0_80px_rgba(204,255,0,0.25)]'
                            }`}
                        >
                            {/* Terminal titlebar */}
                            <div className="flex items-center gap-2 w-full pb-4 border-b border-primary/20 mb-2">
                                <div className="w-2.5 h-2.5 bg-primary/60" />
                                <div className="w-2.5 h-2.5 bg-primary/30" />
                                <div className="w-2.5 h-2.5 bg-primary/30" />
                                <span className="text-primary/30 text-[10px] ml-2 font-mono">patch_master_live.sh</span>
                            </div>

                            {isFinishedMode ? (
                                <>
                                    <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest">&gt; GRA_ZAKOŃCZONA</p>
                                    <div className="font-bold text-primary/60 font-mono uppercase"
                                        style={{ fontSize: 'clamp(1.2rem, 3vw, 2.5rem)' }}>
                                        GRA ZAKOŃCZONA
                                    </div>
                                    <div className="text-white font-black font-mono truncate w-full"
                                        style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}>
                                        {displayPlayer.nick}
                                    </div>
                                    <div className={`font-black font-mono tracking-widest ${displayScore >= 5000 ? 'text-primary' : 'text-red-400'}`}
                                        style={{
                                            fontSize: 'clamp(3rem, 10vw, 8rem)',
                                            textShadow: displayScore >= 5000 ? '0 0 30px rgba(0,255,65,0.8)' : '0 0 30px rgba(239,68,68,0.8)'
                                        }}>
                                        {displayScore >= 5000 ? 'WYGRANA!' : 'PRZEGRANA'}
                                    </div>
                                    <div className="font-mono text-white font-black tabular-nums"
                                        style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}>
                                        {displayScore.toString().padStart(5, '0')} PKT
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 text-primary/60 font-mono uppercase font-bold"
                                        style={{ fontSize: 'clamp(1rem, 2.5vw, 2rem)' }}>
                                        <Zap size={28} className="text-accent animate-pulse shrink-0" />
                                        &gt; GRA W TOKU: PATCH_MASTER
                                    </div>
                                    <div className="text-white font-black font-mono truncate w-full"
                                        style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}>
                                        {displayPlayer.nick}
                                    </div>
                                    <div
                                        ref={scoreDisplayRef}
                                        className="font-black font-mono tracking-widest tabular-nums"
                                        style={{
                                            fontSize: 'clamp(4rem, 12vw, 9rem)',
                                            color: '#00ff41',
                                            textShadow: '0 0 30px rgba(0,255,65,0.9)',
                                        }}
                                    >
                                        {pmScoreRef.current.toString().padStart(5, '0')}
                                    </div>

                                    {/* Port mini-grid + cable flash animations */}
                                    <div className="relative w-full mt-1">
                                        <AnimatePresence>
                                            {cableFlashes.map(f => (
                                                <motion.div
                                                    key={f.id}
                                                    initial={{ opacity: 1, y: 0, scale: 0.9 }}
                                                    animate={{ opacity: 0, y: -70, scale: 1.3 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                                    className="absolute inset-x-0 -top-6 flex justify-center pointer-events-none z-10"
                                                >
                                                    <span className="text-primary font-black font-mono bg-black/70 px-4 py-1"
                                                        style={{ fontSize: 'clamp(1rem, 2.5vw, 1.8rem)', textShadow: '0 0 20px rgba(0,255,65,1)' }}>
                                                        ✓ {f.label} POŁĄCZONY!
                                                    </span>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        <div className="grid grid-cols-4 gap-2 xl:gap-3 w-full">
                                            {(hwState?.pairs ?? []).map((pair: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className={`border p-2 xl:p-3 flex flex-col items-center gap-1 transition-all duration-300 ${
                                                        pair.connected
                                                            ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(0,255,65,0.4)]'
                                                            : 'border-primary/15 bg-black/40 opacity-50'
                                                    }`}
                                                >
                                                    <div className={`w-3 h-3 xl:w-4 xl:h-4 ${pair.connected ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(0,255,65,1)]' : 'bg-red-900'}`} />
                                                    <div className={`text-[9px] xl:text-[10px] font-mono font-bold ${pair.connected ? 'text-primary' : 'text-primary/20'}`}>
                                                        {pair.label}
                                                    </div>
                                                    <div className={`text-[8px] xl:text-[9px] font-mono ${pair.connected ? 'text-primary/80' : 'text-primary/15'}`}>
                                                        {pair.connected ? 'OK' : '---'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {hwState?.pairs && (
                                            <div className="mt-3 font-mono font-bold text-center"
                                                style={{ fontSize: 'clamp(1rem, 2.5vw, 1.6rem)' }}>
                                                <span className="text-primary" style={{ textShadow: '0 0 10px rgba(0,255,65,0.7)' }}>
                                                    {hwState.pairs.filter((p: any) => p.connected).length}
                                                </span>
                                                <span className="text-primary/40"> / {hwState.pairs.length} PORTÓW POŁĄCZONYCH</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="font-bold text-red-400 font-mono animate-pulse flex items-center gap-3 border border-red-500/30 bg-red-500/[0.04] px-6 py-3"
                                        style={{ fontSize: 'clamp(0.9rem, 2vw, 1.4rem)' }}>
                                        Musi mieć powyżej 5000 punktów, żeby odebrać nagrodę!
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
