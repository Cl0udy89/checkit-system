import { fetchGameStatus } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Zap, Cpu, Search, Trophy, Link2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../hooks/useGameStore'

import { LogOut } from 'lucide-react'
import sparkLogo from '../assets/sparkSomeLogo_Black.png'
import { motion } from 'framer-motion'

export default function Dashboard() {
    const navigate = useNavigate()
    const user = useGameStore(state => state.user)
    const logout = useGameStore(state => state.logout)

    const { data: gameStatus } = useQuery({
        queryKey: ['gameStatus', user?.id],
        queryFn: () => user ? fetchGameStatus(user.id) : Promise.reject('No user'),
        enabled: !!user
    })

    useEffect(() => {
        if (!user) navigate('/')
    }, [user, navigate])

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    const handleLogout = () => setShowLogoutConfirm(true)
    const confirmLogout = () => { logout(); navigate('/') }

    const gamesLeft = useMemo(() => {
        if (!gameStatus) return 4
        let left = 0
        if (!gameStatus.binary_brain?.played) left++
        if (!gameStatus.patch_master?.played) left++
        if (!gameStatus.it_match?.played) left++
        if (!gameStatus.text_match?.played) left++
        return left
    }, [gameStatus])

    const games = [
        {
            id: 'binary-brain',
            title: 'BINARY_BRAIN',
            desc: 'Sprawdź, jak szybko myślisz w systemie zero-jedynkowym. Rozwiąż 10 zagadek logicznych i powalcz o nagrodę! Podejmiesz wyzwanie?',
            icon: <Cpu size={36} className="text-secondary" />,
            bgClass: 'bg-secondary',
            textClass: 'text-secondary',
            path: '/game/binary-brain',
            cta: 'PODEJMIJ WYZWANIE'
        },
        {
            id: 'patch-master',
            title: 'PATCH_MASTER',
            desc: 'Podejdź do fizycznej maszyny! Pokaż, że kable to Twoja specjalność, wepnij je w rekordowym czasie i otwórz skrytkę z nagrodą. Startuj!',
            icon: <Zap size={36} className="text-accent" />,
            bgClass: 'bg-accent',
            textClass: 'text-accent',
            path: '/game/patch-master',
            cta: 'SPRAWDŹ PRECYZJĘ'
        },
        {
            id: 'it-match',
            title: 'IT_MATCH',
            desc: 'Czy potrafisz rozpoznać cyfrowe zagrożenie w ułamku sekundy? Przesuwaj karty i udowodnij, że nic Cię nie zaskoczy. Sprawdź się!',
            icon: <Search size={36} className="text-primary" />,
            bgClass: 'bg-primary',
            textClass: 'text-primary',
            path: '/game/it-match',
            cta: 'ROZPOCZNIJ ANALIZĘ'
        },
        {
            id: 'text-match',
            title: 'TEXT_MATCH',
            desc: 'Dopasuj pojęcia IT do ich definicji! Kliknij termin, potem pasującą definicję i pobij rekord prędkości. Czas startuje z chwilą startu!',
            icon: <Link2 size={36} className="text-primary" />,
            bgClass: 'bg-primary',
            textClass: 'text-primary',
            path: '/game/text-match',
            cta: 'DOPASUJ POJĘCIA'
        },
    ]

    return (
        <div className="min-h-screen p-4 md:p-8 flex flex-col relative overflow-x-hidden overflow-y-auto w-full mx-auto">
            {/* Grid bg */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
                backgroundImage: 'linear-gradient(rgba(0,255,65,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            {/* Header */}
            <header className="flex flex-col lg:flex-row w-full justify-between items-center mb-6 lg:mb-10 z-10 gap-6 lg:gap-8 mt-4 relative">
                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start w-full lg:w-auto gap-6 md:gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="shrink-0"
                    >
                        <img src={sparkLogo} alt="SparkSome Logo" className="h-12 md:h-16 invert" />
                    </motion.div>

                    <div className="flex flex-col items-center md:items-start text-center md:text-left border-t border-primary/20 pt-6 md:pt-0 md:border-t-0 md:border-l md:border-l-primary/20 md:pl-8">
                        <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-1">&gt; SYSTEM_ROOT</p>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xl md:text-2xl lg:text-3xl font-mono font-bold text-white tracking-widest leading-tight animate-flicker"
                        >
                            DNI_INFORMATYKI_LUBLIN_2026
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="font-mono mt-3 flex items-center justify-center md:justify-start gap-3 w-full"
                        >
                            <span className="border border-primary/30 bg-primary/10 text-primary px-3 py-1 text-[10px] font-mono uppercase tracking-wider shrink-0">USER</span>
                            <span className="text-2xl md:text-3xl text-white font-bold truncate max-w-[200px] sm:max-w-[300px] md:max-w-none" title={user?.nick || 'GUEST'}>{user?.nick || 'GUEST'}</span>
                        </motion.p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-end shrink-0">
                    <button
                        onClick={() => navigate('/leaderboard')}
                        className="flex items-center gap-2 border border-primary/25 hover:border-primary/60 bg-primary/[0.04] hover:bg-primary/[0.08] text-primary/60 hover:text-primary px-6 py-3 font-mono text-sm transition-all"
                    >
                        <Trophy size={16} />
                        &gt; RANKING
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 border border-red-500/25 hover:border-red-500/60 bg-red-500/[0.04] hover:bg-red-500/[0.08] text-red-400/60 hover:text-red-400 px-4 py-3 font-mono text-sm transition-all"
                        title="Wyloguj"
                    >
                        <LogOut size={16} />
                        <span className="hidden md:inline">WYLOGUJ</span>
                    </button>
                </div>
            </header>

            {/* Progress Banner */}
            <div className="mb-6 lg:mb-8 z-10 w-full">
                <div className={`crt-border bg-surface p-6 md:p-8 flex flex-col md:flex-row items-center justify-between transition-all relative overflow-hidden ${gamesLeft === 0 ? 'shadow-[0_0_40px_rgba(204,255,0,0.12)]' : ''}`}>
                    <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                        <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-1">&gt; STATUS</p>
                        <h2 className={`text-2xl md:text-3xl font-mono font-bold ${gamesLeft === 0 ? 'text-accent text-glow' : 'text-white'} mb-2 tracking-tight`}>
                            {gamesLeft === 0 ? 'GRANDMASTER_ELIGIBLE' : `UKOŃCZ_${gamesLeft}_${gamesLeft === 1 ? 'GRĘ' : 'GRY'}`}
                        </h2>
                        {gamesLeft === 0 ? (
                            <button onClick={() => navigate('/leaderboard')} className="text-accent underline font-mono text-sm max-w-lg hover:text-white transition-colors text-left text-balance">
                                Wszystkie systemy odblokowane! Sprawdź swoją pozycję w rankingu.
                            </button>
                        ) : (
                            <p className="text-primary/40 font-mono text-sm max-w-lg">
                                Zagraj we wszystkie gry, aby zdobyć status Grandmastera.
                            </p>
                        )}
                    </div>
                    <div className="relative z-10 flex items-center justify-center px-4">
                        {gamesLeft === 0
                            ? <Trophy size={44} className="text-accent text-glow-lg animate-pulse" />
                            : <span className="font-mono font-black text-primary text-glow-lg text-4xl md:text-5xl tabular-nums">[{4 - gamesLeft}/4]</span>
                        }
                    </div>
                </div>
            </div>

            {/* Game Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 z-10 w-full">
                {games.map((game, i) => {
                    const status = gameStatus?.[game.id.replace('-', '_')]
                    const isPlayed = status?.played
                    const score = status?.score || 0

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.05 }}
                            whileHover={isPlayed ? {} : { y: -4 }}
                            key={game.id}
                            onClick={() => !isPlayed ? navigate(game.path) : null}
                            className={`crt-border bg-surface p-6 md:p-8 relative overflow-hidden flex flex-col ${isPlayed ? 'opacity-50' : 'cursor-pointer hover:shadow-[0_0_30px_rgba(0,255,65,0.08)]'} transition-all duration-300`}
                        >
                            {/* Color accent bar top */}
                            <div className={`absolute top-0 left-0 w-full h-0.5 ${game.bgClass} ${isPlayed ? 'opacity-30' : 'opacity-100'}`} />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="mb-4 flex justify-between items-start">
                                    <div className="p-3 border border-primary/20 bg-primary/[0.04]">
                                        {game.icon}
                                    </div>
                                    {isPlayed && (
                                        <span className="border border-primary/30 bg-primary/10 text-primary text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider">
                                            COMPLETED
                                        </span>
                                    )}
                                </div>

                                <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-1">&gt; GAME</p>
                                <h2 className="text-xl md:text-2xl font-mono font-bold text-white mb-3 tracking-tight">{game.title}</h2>
                                <p className="text-primary/40 font-mono text-sm mb-6 flex-1 leading-relaxed">{game.desc}</p>

                                {isPlayed ? (
                                    <div className="mt-auto">
                                        <p className="text-primary/50 text-[10px] font-mono uppercase tracking-widest mb-1">&gt; SCORE</p>
                                        <span className="font-mono font-black text-primary text-glow-lg text-3xl tabular-nums">{score}</span>
                                    </div>
                                ) : (
                                    <div className="mt-auto">
                                        <span className={`border border-primary/25 bg-primary/[0.04] ${game.textClass} px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest`}>
                                            {game.cta} _
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center font-mono space-y-1 z-10">
                <div>
                    <a href="/docs/regulamin.pdf" target="_blank" rel="noreferrer" className="text-[10px] text-primary/30 hover:text-primary transition-colors">
                        Regulamin
                    </a>
                </div>
                <div className="text-[10px] text-primary/20">
                    SYSTEM_ID: DNIINFORMATYKI_NODE_01 // SECURE_CONNECTION // POWERED_BY_SPARKS.ENGINE
                </div>
            </div>

            {/* Logout confirm modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85">
                    <div className="crt-border bg-surface p-8 max-w-sm w-full mx-4 flex flex-col gap-6 font-mono">
                        <div className="flex items-center gap-2 pb-4 border-b border-primary/20">
                            <div className="w-2 h-2 bg-primary/40" />
                            <div className="w-2 h-2 bg-primary/20" />
                            <div className="w-2 h-2 bg-primary/20" />
                            <span className="text-primary/40 text-[10px] ml-2">logout.sh</span>
                        </div>
                        <div className="flex flex-col gap-2">
                            <p className="text-primary/50 text-[10px] uppercase tracking-widest">&gt; CONFIRM_LOGOUT</p>
                            <span className="text-white text-lg font-bold">Wylogować się?</span>
                            <span className="text-primary/40 text-sm">Postępy są zapisane — możesz wrócić w dowolnym momencie.</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3 border border-primary/25 text-primary/60 hover:border-primary/60 hover:text-primary transition-all font-mono text-sm"
                            >
                                ANULUJ
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 py-3 border border-red-500/25 text-red-400/60 hover:border-red-500/60 hover:text-red-400 transition-all font-mono text-sm"
                            >
                                WYLOGUJ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
