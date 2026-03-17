import { fetchGameStatus } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Zap, Cpu, Search, Trophy, CheckCircle, Link2 } from 'lucide-react'
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
            icon: <Cpu size={48} className="text-secondary" />,
            color: 'border-secondary',
            bgClass: 'bg-secondary',
            textClass: 'text-secondary',
            hoverBorderClass: 'hover:border-secondary',
            shadowClass: 'hover:shadow-secondary/30',
            path: '/game/binary-brain',
            cta: 'PODEJMIJ WYZWANIE'
        },
        {
            id: 'patch-master',
            title: 'PATCH_MASTER',
            desc: 'Podejdź do fizycznej maszyny! Pokaż, że kable to Twoja specjalność, wepnij je w rekordowym czasie i otwórz skrytkę z nagrodą. Startuj!',
            icon: <Zap size={48} className="text-accent" />,
            color: 'border-accent',
            bgClass: 'bg-accent',
            textClass: 'text-accent',
            hoverBorderClass: 'hover:border-accent',
            shadowClass: 'hover:shadow-accent/30',
            path: '/game/patch-master',
            cta: 'SPRAWDŹ PRECYZJĘ'
        },
        {
            id: 'it-match',
            title: 'IT_MATCH',
            desc: 'Czy potrafisz rozpoznać cyfrowe zagrożenie w ułamku sekundy? Przesuwaj karty i udowodnij, że nic Cię nie zaskoczy. Sprawdź się!',
            icon: <Search size={48} className="text-primary" />,
            color: 'border-primary',
            bgClass: 'bg-primary',
            textClass: 'text-primary',
            hoverBorderClass: 'hover:border-primary',
            shadowClass: 'hover:shadow-primary/30',
            path: '/game/it-match',
            cta: 'ROZPOCZNIJ ANALIZĘ'
        },
        {
            id: 'text-match',
            title: 'TEXT_MATCH',
            desc: 'Dopasuj pojęcia IT do ich definicji! Kliknij termin, potem pasującą definicję i pobij rekord prędkości. Czas startuje z chwilą startu!',
            icon: <Link2 size={48} className="text-green-400" />,
            color: 'border-green-400',
            bgClass: 'bg-green-400',
            textClass: 'text-green-400',
            hoverBorderClass: 'hover:border-green-400',
            shadowClass: 'hover:shadow-green-400/30',
            path: '/game/text-match',
            cta: 'DOPASUJ POJĘCIA'
        },
    ]

    return (
        <div className="min-h-screen lg:h-screen p-4 md:p-8 flex flex-col relative overflow-x-hidden overflow-y-auto lg:overflow-hidden bg-transparent w-full mx-auto">
            <header className="flex flex-col lg:flex-row w-full justify-between items-center mb-12 z-10 gap-6 lg:gap-8 mt-4 relative">
                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start w-full lg:w-auto gap-6 md:gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="shrink-0"
                    >
                        <img src={sparkLogo} alt="SparkSome Logo" className="h-12 md:h-16 invert" />
                    </motion.div>

                    <div className="flex flex-col items-center md:items-start text-center md:text-left border-t border-gray-800 pt-6 md:pt-0 md:border-t-0 md:border-l md:pl-8">
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xl md:text-2xl lg:text-3xl font-mono font-bold text-white tracking-widest leading-tight"
                        >
                            SYSTEM_ROOT: CHECK_IT_LUBLIN_2026
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-gray-400 font-mono mt-3 flex items-center justify-center md:justify-start gap-3 w-full"
                        >
                            <span className="bg-primary/20 text-primary px-3 py-1 rounded text-sm border border-primary/30 font-bold tracking-wider shrink-0">USER</span>
                            <span className="text-2xl md:text-3xl text-white font-bold truncate max-w-[200px] sm:max-w-[300px] md:max-w-none" title={user?.nick || 'GUEST'}>{user?.nick || 'GUEST'}</span>
                        </motion.p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-center lg:justify-end shrink-0">
                    <button
                        onClick={() => navigate('/leaderboard')}
                        className="flex items-center gap-2 bg-surface/50 backdrop-blur-md border border-gray-700 hover:border-primary hover:text-primary px-6 py-3 font-mono transition-all rounded-lg"
                    >
                        <Trophy size={20} />
                        RANKING
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 bg-red-900/20 backdrop-blur-md border border-red-900/50 text-red-400 hover:bg-red-900/40 hover:text-red-300 px-4 py-3 font-mono transition-all rounded-lg"
                        title="Wyloguj"
                    >
                        <LogOut size={20} />
                        <span className="hidden md:inline">WYLOGUJ</span>
                    </button>
                </div>
            </header>

            {/* Grandmaster Progress Banner */}
            <div className="mb-12 z-10 w-full">
                <div className={`p-8 rounded-2xl border-2 ${gamesLeft === 0 ? 'bg-gradient-to-r from-accent/20 to-accent/5 border-accent' : 'bg-surface/80 backdrop-blur-xl border-gray-700/50'} flex flex-col md:flex-row items-center justify-between shadow-2xl transition-all relative overflow-hidden group`}>

                    {/* Background glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                    <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                        <h2 className={`text-3xl font-mono font-bold ${gamesLeft === 0 ? 'text-accent' : 'text-white'} mb-2 tracking-tight`}>
                            {gamesLeft === 0 ? "STATUS: GRANDMASTER ELIGIBLE" : `MISJA: UKOŃCZ ${gamesLeft} ${gamesLeft === 1 ? 'GRĘ' : 'GRY'}`}
                        </h2>
                        {gamesLeft === 0 ? (
                            <button onClick={() => navigate('/leaderboard')} className="text-accent underline font-mono text-sm max-w-lg hover:text-white transition-colors text-left text-balance">
                                Wszystkie systemy odblokowane! Sprawdź swoją ostateczną pozycję w rankingu głównym.
                            </button>
                        ) : (
                            <p className="text-gray-400 font-mono text-sm max-w-lg">
                                Zagraj w gry, aby zdobyć maksymalną ilość punktów i odblokować status Grandmastera.
                            </p>
                        )}
                    </div>
                    <div className="relative z-10 flex items-center justify-center bg-black/40 rounded-full w-24 h-24 border border-gray-700/50 shadow-inner">
                        <div className="text-3xl font-bold font-mono text-white">
                            {gamesLeft === 0 ? <Trophy size={40} className="text-accent drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] animate-pulse" /> : `${4 - gamesLeft}/4`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Symmetric Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 z-10 flex-1 w-full">
                {games.map((game) => {
                    const status = gameStatus?.[game.id.replace('-', '_')]
                    const isPlayed = status?.played
                    const score = status?.score || 0

                    return (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={isPlayed ? {} : { y: -8, scale: 1.02 }}
                            transition={{ duration: 0.4 }}
                            key={game.id}
                            onClick={() => !isPlayed ? navigate(game.path) : null}
                            className={`
                                bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl
                                ${isPlayed ? 'opacity-60 grayscale-[30%] bg-black/40' : `${game.hoverBorderClass} cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_64px_rgba(255,255,255,0.05)] hover:bg-white/10`} 
                                transition-all duration-300 group relative overflow-hidden flex flex-col h-full
                            `}
                        >
                            {/* Inner glass light spot */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-0"></div>

                            {/* Color accent bar top */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${game.bgClass} ${isPlayed ? 'opacity-30' : 'opacity-80'}`}></div>

                            {/* Background Icon */}
                            <div className={`absolute -bottom-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-all transform group-hover:scale-125 duration-700 rotate-12`}>
                                {game.icon}
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="mb-6 flex justify-between items-start">
                                    <div className={`p-4 rounded-xl bg-black/40 border border-gray-800 ${!isPlayed && 'group-hover:border-gray-600'} transition-colors`}>
                                        {game.icon}
                                    </div>
                                    {isPlayed && <div className="bg-green-500/10 text-green-500 p-2 rounded-full border border-green-500/30"><CheckCircle size={24} /></div>}
                                </div>

                                <h2 className="text-3xl font-mono font-bold text-white mb-3 tracking-tight">{game.title}</h2>
                                <p className="text-gray-400 font-mono text-base mb-8 flex-1 leading-relaxed max-w-md">{game.desc}</p>

                                {isPlayed ? (
                                    <div className="mt-auto">
                                        <div className="flex items-end gap-3">
                                            <div className="text-3xl md:text-4xl font-mono font-bold text-white">SCORE: {score}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-auto flex items-center justify-between">
                                        <div className={`inline-block ${game.bgClass}/20 ${game.textClass} px-4 py-2 text-sm md:text-xs font-mono font-bold rounded-lg ${game.color} border border-opacity-50 uppercase tracking-widest`}>
                                            {game.cta}
                                        </div>
                                        <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-gray-700 group-hover:${game.bgClass} transition-colors ml-2`}>
                                            <Zap size={18} className="text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-400 font-mono">
                SYSTEM_ID: CHECKIT_NODE_01 // SECURE_CONNECTION // POWERED BY SPARKS.ENGINE
            </div>

            {/* Logout confirm modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-surface border border-gray-700 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col gap-6 font-mono">
                        <div className="flex flex-col gap-2 text-center">
                            <span className="text-white text-xl font-bold tracking-tight">Wylogować się?</span>
                            <span className="text-gray-400 text-sm">Twoje postępy są zapisane — możesz wrócić w dowolnym momencie.</span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-all font-mono font-bold"
                            >
                                ANULUJ
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 py-3 rounded-lg bg-red-900/40 border border-red-700 text-red-400 hover:bg-red-900/70 hover:text-red-300 transition-all font-mono font-bold"
                            >
                                WYLOGUJ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}
