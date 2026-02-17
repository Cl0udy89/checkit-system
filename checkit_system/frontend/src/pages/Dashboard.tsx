import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../hooks/useGameStore'
import { useEffect } from 'react'
import { Zap, Cpu, Search, Trophy } from 'lucide-react'

export default function Dashboard() {
    const navigate = useNavigate()
    const user = useGameStore(state => state.user)

    // useEffect(() => {
    //   if (!user) navigate('/')
    // }, [user, navigate])

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
        <div className="min-h-screen p-8 bg-background flex flex-col relative overflow-hidden">
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

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 z-10 flex-1">
                {games.map(game => (
                    <div
                        key={game.id}
                        onClick={() => navigate(game.path)}
                        className={`bg-surface p-8 border-t-4 ${game.color} hover:bg-surface-light transition-all cursor-pointer group relative overflow-hidden`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                            {game.icon}
                        </div>
                        <div className="relative z-10">
                            <div className="mb-6">{game.icon}</div>
                            <h2 className="text-2xl font-mono font-bold text-white mb-2 group-hover:text-primary transition-colors">{game.title}</h2>
                            <p className="text-gray-400 font-mono text-sm">{game.desc}</p>
                        </div>

                        {/* Hover Effect Line */}
                        <div className="absolute bottom-0 left-0 w-0 h-1 bg-white group-hover:w-full transition-all duration-300"></div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-700 font-mono">
                SYSTEM_ID: CHECKIT_NODE_01 // SECURE_CONNECTION
            </div>
        </div>
    )
}
