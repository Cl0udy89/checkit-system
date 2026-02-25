import { useQuery } from '@tanstack/react-query'
import { fetchLeaderboard } from '../lib/api'
import { Trophy } from 'lucide-react'

export default function ScreenLeaderboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: fetchLeaderboard,
        refetchInterval: 5000 // Live updates
    })

    if (isLoading) return <div className="p-10 text-center animate-pulse font-mono text-2xl h-screen flex items-center justify-center bg-black text-white">SYNCHRONIZACJA WYNIKÓW...</div>

    const Section = ({ title, list }: { title: string, list: any[] }) => (
        <div className="bg-surface/80 border border-gray-700 rounded-lg p-4 xl:p-6 shadow-lg h-full flex flex-col">
            <h3 className="text-xl xl:text-2xl font-mono font-bold text-primary mb-4 border-b border-gray-800 pb-2 shrink-0">{title}</h3>
            <div className="flex-1 flex flex-col justify-between">
                {list?.slice(0, 10).map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center font-mono text-base xl:text-lg border-b border-gray-800/50 pb-1 xl:pb-2 last:border-0 hover:bg-white/5 px-2 py-1 rounded">
                        <span className="text-gray-300 flex items-center gap-2 truncate">
                            <span className={`font-bold ${idx < 3 ? 'text-accent' : 'text-gray-500'}`}>#{idx + 1}</span>
                            <span className="truncate max-w-[150px]">{entry.nick}</span>
                        </span>
                        <span className="text-white font-bold text-lg xl:text-xl shrink-0">{entry.score} PTS</span>
                    </div>
                ))}
                {(!list || list.length === 0) && <div className="text-gray-600 text-sm">BRAK DANYCH</div>}
            </div>
        </div>
    )

    return (
        <div className="h-screen w-screen bg-black overflow-hidden p-4 xl:p-8 flex flex-col absolute top-0 left-0 right-0 bottom-0 z-50">
            <h1 className="text-4xl xl:text-5xl font-mono font-bold text-white mb-6 xl:mb-8 text-center flex justify-center items-center gap-4 shrink-0">
                <Trophy className="text-accent" size={48} /> GLOBALNY RANKING
            </h1>

            {/* Grandmaster Section - Top Half */}
            <div className="flex-none h-[45%] mb-6">
                <div className="bg-surface/90 border-4 border-accent rounded-xl p-4 xl:p-8 shadow-[0_0_50px_rgba(243,234,95,0.2)] h-full flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-accent/10 rounded-full blur-[100px] transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <h3 className="text-2xl xl:text-3xl font-mono font-bold text-accent mb-4 xl:mb-6 border-b-2 border-accent/30 pb-2 xl:pb-4 flex justify-between items-center shrink-0">
                            <span>MISTRZOWIE (SUMA PUNKTÓW)</span>
                            <Trophy size={36} />
                        </h3>
                        <div className="flex-1 flex gap-4 xl:gap-8 justify-center overflow-hidden">
                            {/* 1st Place - Large Center Left-ish or Top */}
                            {data?.grandmaster?.length > 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(255,215,0,0.3)] bg-yellow-400/10 rounded-xl h-full">
                                    <Trophy size={64} className="text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
                                    <span className="text-yellow-400 font-black text-6xl mb-2">#1</span>
                                    <span className="text-white font-bold text-4xl xl:text-5xl mb-4 truncate w-full text-center">{data.grandmaster[0].nick}</span>
                                    <span className="text-yellow-400 font-black text-4xl xl:text-5xl">{data.grandmaster[0].score} PTS</span>
                                </div>
                            )}

                            {/* 2nd & 3rd Place - Right side */}
                            <div className="flex-1 flex flex-col gap-4 justify-center">
                                {data?.grandmaster?.slice(1, 3).map((entry: any, i: number) => {
                                    const idx = i + 1; // 1-indexed for slice
                                    return (
                                        <div key={idx} className="flex-1 flex justify-between items-center font-mono border border-accent/30 p-4 xl:p-6 rounded-xl bg-surface/50">
                                            <span className="text-gray-100 flex items-center gap-4">
                                                <span className={`font-black text-4xl xl:text-5xl w-16 ${idx === 1 ? 'text-gray-400' : 'text-amber-700'}`}>#{idx + 1}</span>
                                                <span className="text-2xl xl:text-3xl truncate max-w-[200px]">{entry.nick}</span>
                                            </span>
                                            <span className="text-accent font-black text-3xl xl:text-4xl">{entry.score} PTS</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Sections - Bottom Half (3 Columns) */}
            <div className="flex-1 flex gap-4 xl:gap-8 min-h-0">
                <div className="flex-1 min-h-0"><Section title="BINARY BRAIN" list={data?.binary_brain || []} /></div>
                <div className="flex-1 min-h-0"><Section title="PATCH MASTER" list={data?.patch_master || []} /></div>
                <div className="flex-1 min-h-0"><Section title="IT MATCH" list={data?.it_match || []} /></div>
            </div>
        </div>
    )
}
