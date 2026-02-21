import { fetchGameStatus } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Zap, Cpu, Search, Trophy, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../hooks/useGameStore'

import { LogOut } from 'lucide-react'

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

    const handleLogout = () => {
        if (window.confirm("Czy na pewno chcesz się wylogować?")) {
            logout()
            navigate('/')
        }
    }

    const gamesLeft = useMemo(() => {
        if (!gameStatus) return 3
        let left = 0
        if (!gameStatus.binary_brain?.played) left++
        if (!gameStatus.patch_master?.played) left++
        if (!gameStatus.it_match?.played) left++
        return left
    }, [gameStatus])

    const games = [
        {
            id: 'binary-brain',
            title: 'BINARY_BRAIN',
            desc: 'Podejmij wyzwanie IT i zgarnij punkty! Masz wiedzę? Rozwal system!',
            icon: <Cpu size={48} className="text-secondary" />,
            color: 'border-secondary',
            path: '/game/binary-brain'
        },
        {
            id: 'patch-master',
            title: 'PATCH_MASTER',
            desc: 'Zostań mistrzem serwerowni! Połącz wszystkie kable i pokaż szybkość!',
            icon: <Zap size={48} className="text-accent" />,
            color: 'border-accent',
            path: '/game/patch-master'
        },
        {
            id: 'it-match',
            title: 'IT_MATCH',
            desc: 'Szybkie tak/nie! Przesuń w prawo = BEZPIECZNE, w lewo = ZAGROŻENIE.',
            icon: <Search size={48} className="text-primary" />,
            color: 'border-primary',
            path: '/game/it-match'
        },
    ]

    return (
        <div className="min-h-screen p-4 md:p-8 flex flex-col relative overflow-x-hidden bg-transparent max-w-6xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 z-10 gap-4 mt-4 w-full">
                <div>
                    <h1 className="text-3xl md:text-4xl font-mono font-bold text-white tracking-widest leading-tight">
                        ZAWODY CHECK<span className="text-primary">IT</span> LUBLIN
                        <span className="text-xs md:text-sm text-gray-500 tracking-widest block mt-1">POWERED BY SPARKOSTREFA</span>
                    </h1>
                    <p className="text-gray-400 font-mono mt-2 flex items-center gap-2">
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-sm border border-primary/30">USER</span>
                        <span className="text-xl text-white font-bold">{user?.nick || 'GUEST'}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
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
                            {gamesLeft === 0 ? "STATUS: GRANDMASTER ELIGIBLE" : `MISJA: UKOŃCZ ${gamesLeft} GRY`}
                        </h2>
                        <p className="text-gray-400 font-mono text-sm max-w-lg">
                            {gamesLeft === 0 ? "Wszystkie systemy odblokowane! Sprawdź swoją ostateczną pozycję w rankingu głównym." : "Zagraj w pozostałe gry, aby zdobyć maksymalną ilość punktów APP i odblokować status Grandmastera."}
                        </p>
                    </div>
                    <div className="relative z-10 flex items-center justify-center bg-black/40 rounded-full w-24 h-24 border border-gray-700/50 shadow-inner">
                        <div className="text-3xl font-bold font-mono text-white">
                            {gamesLeft === 0 ? <Trophy size={40} className="text-accent drop-shadow-[0_0_15px_rgba(255,215,0,0.5)] animate-pulse" /> : `${3 - gamesLeft}/3`}
                        </div>
                    </div>
                </div>
            </div>

            {/* Symmetric Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 z-10 flex-1 w-full">
                {games.map((game) => {
                    const status = gameStatus?.[game.id.replace('-', '_')]
                    const isPlayed = status?.played
                    const score = status?.score || 0

                    return (
                        <div
                            key={game.id}
                            onClick={() => !isPlayed ? navigate(game.path) : null}
                            className={`
                                bg-surface/60 backdrop-blur-lg border border-gray-800 p-6 md:p-8 rounded-2xl
                                ${isPlayed ? 'opacity-70 grayscale-[30%]' : `hover:border-${game.color.replace('border-', '')} cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-${game.color.replace('border-', '')}/20`} 
                                transition-all duration-300 group relative overflow-hidden flex flex-col h-full
                            `}
                        >
                            {/* Color accent bar top */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${game.color.replace('border', 'bg')} ${isPlayed ? 'opacity-30' : 'opacity-80'}`}></div>

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
                                            <div className="text-5xl font-mono font-bold text-white">{score}</div>
                                            <div className="text-sm text-gray-500 font-mono mb-2">APP</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-auto flex items-center justify-between">
                                        <div className={`inline-block bg-${game.color.replace('border-', '')}/10 text-${game.color.replace('border-', '')} px-4 py-2 text-sm font-mono rounded-lg border border-${game.color.replace('border-', '')}/30 uppercase tracking-widest`}>
                                            Rozpocznij Moduł
                                        </div>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-800 group-hover:bg-${game.color.replace('border-', '')} transition-colors`}>
                                            <Zap size={18} className="text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-700 font-mono">
                SYSTEM_ID: CHECKIT_NODE_01 // SECURE_CONNECTION // POWERED BY SPARKOSTREFA
            </div>
        </div>
    )
}
