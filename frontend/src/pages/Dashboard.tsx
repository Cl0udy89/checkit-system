import { fetchGameStatus } from '../lib/api'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { Zap, Cpu, Search, Trophy, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../hooks/useGameStore'

export default function Dashboard() {
    const navigate = useNavigate()
    const user = useGameStore(state => state.user)

    const { data: gameStatus } = useQuery({
        queryKey: ['gameStatus', user?.id],
        queryFn: () => user ? fetchGameStatus(user.id) : Promise.reject('No user'),
        enabled: !!user
    })

    useEffect(() => {
        if (!user) navigate('/')
    }, [user, navigate])

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
            desc: 'Quiz wiedzy IT + Hardware Trigger',
            icon: <Cpu size={48} className="text-secondary" />,
            color: 'border-secondary',
            path: '/game/binary-brain'
        },
        {
            id: 'patch-master',
            title: 'PATCH_MASTER',
            desc: 'Fizyczne łączenie portów RJ45',
            icon: <Zap size={48} className="text-accent" />,
            color: 'border-accent',
            path: '/game/patch-master'
        },
        {
            id: 'it-match',
            title: 'IT_MATCH',
            desc: 'Szybkie decydowanie: TAK/NIE',
            icon: <Search size={48} className="text-primary" />,
            color: 'border-primary',
            path: '/game/it-match'
        },
    ]

    return (
        <div className="min-h-screen p-4 md:p-8 bg-background flex flex-col relative overflow-x-hidden">
            {/* Header */}
            <header className="flex justify-between items-center mb-12 z-10">
                <div>
                    <h1 className="text-3xl font-mono font-bold text-white">DASHBOARD</h1>
                    <p className="text-gray-400 font-mono">USER: <span className="text-primary">{user?.nick || 'GUEST'}</span></p>
                </div>
                <button
                    onClick={() => navigate('/leaderboard')}
                    className="flex items-center gap-2 bg-surface border border-gray-700 hover:border-primary px-6 py-3 font-mono transition-all"
                >
                    <Trophy size={20} />
                    LEADERBOARD
                </button>
            </header>

            {/* Grandmaster Progress Banner */}
            <div className="mb-8 z-10 w-full max-w-4xl mx-auto">
                <div className={`p-6 rounded-xl border-2 ${gamesLeft === 0 ? 'bg-accent/20 border-accent' : 'bg-surface border-gray-700'} flex items-center justify-between shadow-lg transition-all`}>
                    <div>
                        <h2 className={`text-2xl font-mono font-bold ${gamesLeft === 0 ? 'text-accent' : 'text-white'}`}>
                            {gamesLeft === 0 ? "STATUS: GRANDMASTER ELIGIBLE" : `ZOSTAŁY ${gamesLeft} GRY DO STATUSU GRANDMASTER`}
                        </h2>
                        <p className="text-gray-400 font-mono text-sm mt-1">
                            {gamesLeft === 0 ? "Ukończyłeś wszystkie wyzwania! Sprawdź swoją pozycję w rankingu." : "Ukończ wszystkie 3 gry, aby walczyć o nagrodę główną."}
                        </p>
                    </div>
                    <div className="text-4xl font-bold font-mono text-white">
                        {gamesLeft === 0 ? <Trophy size={48} className="text-accent animate-bounce" /> : `${3 - gamesLeft}/3`}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 z-10 flex-1 max-w-6xl mx-auto w-full">
                {games.map(game => {
                    const status = gameStatus?.[game.id.replace('-', '_')]
                    const isPlayed = status?.played
                    const score = status?.score || 0

                    return (
                        <div
                            key={game.id}
                            onClick={() => !isPlayed ? navigate(game.path) : null} // Prevent replay? Or allow replay for better score? User said "completed and cannot more times".
                            // Let's allow replay but visually mark it. Or disable.
                            // User request: "wiecej ni emozna razy jak cos" (cannot play more times).
                            // So disable click if isPlayed.
                            className={`bg-surface p-8 border-t-4 ${isPlayed ? 'border-gray-600 opacity-80' : game.color} ${!isPlayed ? 'hover:bg-surface-light cursor-pointer hover:scale-105' : 'cursor-default'} transition-all group relative overflow-hidden rounded-lg shadow-xl`}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                {game.icon}
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="mb-6 flex justify-between items-start">
                                    {game.icon}
                                    {isPlayed && <CheckCircle className="text-green-500" size={32} />}
                                </div>

                                <h2 className="text-2xl font-mono font-bold text-white mb-2 group-hover:text-primary transition-colors">{game.title}</h2>
                                <p className="text-gray-400 font-mono text-sm mb-6 flex-1">{game.desc}</p>

                                {isPlayed ? (
                                    <div className="mt-auto pt-4 border-t border-gray-700">
                                        <div className="text-xs text-gray-500 font-mono mb-1">WYNIK KOŃCOWY</div>
                                        <div className="text-3xl font-mono font-bold text-green-400">{score} APP</div>
                                    </div>
                                ) : (
                                    <div className="mt-auto inline-block bg-primary/10 text-primary px-3 py-1 text-xs font-mono rounded border border-primary/30">
                                        DOSTĘPNA
                                    </div>
                                )}
                            </div>

                            {/* Hover Effect Line (only if active) */}
                            {!isPlayed && <div className="absolute bottom-0 left-0 w-0 h-1 bg-white group-hover:w-full transition-all duration-300"></div>}
                        </div>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-700 font-mono">
                SYSTEM_ID: CHECKIT_NODE_01 // SECURE_CONNECTION
            </div>
        </div>
    )
}
