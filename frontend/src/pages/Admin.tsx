import { useQuery, useMutation } from '@tanstack/react-query'
import { api, fetchAdminUsers, fetchAdminScores, deleteUser, fetchSystemConfig, setSystemConfig, fetchEmailTemplates, updateEmailTemplate, sendAllEmails } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Shield, Zap, RefreshCw, Lock, LogOut, Settings, Mail } from 'lucide-react'
import AdminLogin from './AdminLogin'
import { useState } from 'react'

// Direct axios calls for admin to save time updating api.ts
const triggerSolenoid = async () => api.post('/admin/solenoid/trigger')
const fetchHardwareStatus = async () => (await api.get('/admin/hardware/status')).data
const fetchAdminLogs = async () => (await api.get('/admin/logs')).data
const fetchConfig = async () => (await api.get('/admin/config')).data

export default function Admin() {
    const navigate = useNavigate()
    const token = localStorage.getItem('admin_token')
    const [activeTab, setActiveTab] = useState<'hardware' | 'users' | 'scores' | 'logs' | 'settings' | 'email'>('hardware')
    const [emailSuccess, setEmailSuccess] = useState('')

    if (!token) return <AdminLogin />

    const { data: status } = useQuery({
        queryKey: ['admin_hardware'],
        queryFn: fetchHardwareStatus,
        refetchInterval: 2000,
        enabled: activeTab === 'hardware'
    })

    const { data: users } = useQuery({
        queryKey: ['admin_users'],
        queryFn: fetchAdminUsers,
        enabled: activeTab === 'users'
    })

    const { data: scores } = useQuery({
        queryKey: ['admin_scores'],
        queryFn: fetchAdminScores,
        enabled: activeTab === 'scores'
    })

    const { data: logs } = useQuery({
        queryKey: ['admin_logs'],
        queryFn: fetchAdminLogs,
        refetchInterval: 3000,
        enabled: activeTab === 'logs'
    })

    const { data: config, refetch: refetchConfig } = useQuery({
        queryKey: ['admin_config'],
        queryFn: fetchSystemConfig,
        enabled: activeTab === 'settings'
    })

    const { data: templates, refetch: refetchTemplates } = useQuery({
        queryKey: ['admin_templates'],
        queryFn: fetchEmailTemplates,
        enabled: activeTab === 'email'
    })

    // Mutations
    const configMutation = useMutation({
        mutationFn: ({ key, value }: { key: string, value: string }) => setSystemConfig(key, value),
        onSuccess: () => refetchConfig()
    })

    // We can use local state for editing templates, simplistic approach here
    const [editingTemplate, setEditingTemplate] = useState<{ slug: string, subject: string, body: string } | null>(null)

    const updateTemplateMutation = useMutation({
        mutationFn: () => updateEmailTemplate(editingTemplate!.slug, editingTemplate!.subject, editingTemplate!.body),
        onSuccess: () => {
            setEditingTemplate(null)
            refetchTemplates()
        }
    })

    const sendEmailsMutation = useMutation({
        mutationFn: sendAllEmails,
        onSuccess: (data: any) => {
            setEmailSuccess(`Emails Queued: ${data.count} (Winners: ${data.winner_count})`)
            setTimeout(() => setEmailSuccess(''), 5000)
        }
    })

    const solenoidMutation = useMutation({
        mutationFn: triggerSolenoid,
        onSuccess: () => alert("Solenoid Triggered")
    })

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-8 border-4 border-green-900">
            <header className="flex justify-between items-center mb-8 border-b border-green-800 pb-4">
                <h1 className="text-3xl font-bold flex items-center gap-4">
                    <Shield /> ADMIN_CONSOLE // ROOT_ACCESS
                </h1>
                <div className="flex gap-4">
                    <button onClick={() => { localStorage.removeItem('admin_token'); window.location.reload() }} className="hover:text-red-500 flex items-center gap-2"><LogOut size={16} /> WYLOGUJ</button>
                    <button onClick={() => navigate('/dashboard')} className="hover:text-white">WYJŚCIE</button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button onClick={() => setActiveTab('hardware')} className={`px-4 py-2 border ${activeTab === 'hardware' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>SPRZĘT</button>
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 border ${activeTab === 'users' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>UŻYTKOWNICY</button>

                <button onClick={() => setActiveTab('scores')} className={`px-4 py-2 border ${activeTab === 'scores' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>WYNIKI</button>
                <button onClick={() => setActiveTab('scores')} className={`px-4 py-2 border ${activeTab === 'scores' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>WYNIKI</button>
                <button onClick={() => setActiveTab('logs')} className={`px-4 py-2 border ${activeTab === 'logs' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>LOGI SYSTEMOWE</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 border ${activeTab === 'settings' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>USTAWIENIA</button>
                <button onClick={() => setActiveTab('email')} className={`px-4 py-2 border ${activeTab === 'email' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>EMAIL</button>
            </div>

            {activeTab === 'hardware' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Solenoid Control */}
                    <div className="border border-green-800 p-6 bg-green-900/10">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Lock /> RELAY_CONTROL</h2>
                        <p className="mb-4 text-sm text-green-400">Manual override for solenoid lock.</p>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => solenoidMutation.mutate()}
                                className="bg-red-900 text-white px-6 py-4 font-bold rounded hover:bg-red-700 transition w-full flex justify-center items-center gap-2"
                            >
                                <Zap /> FORCE OPEN (5s)
                            </button>
                            <div className="text-center">
                                STATUS: <span className={status?.solenoid?.is_active ? "text-red-500 animate-pulse" : "text-green-500"}>
                                    {status?.solenoid?.is_active ? "ACTIVE" : "IDLE"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* GPIO Status */}
                    <div className="border border-green-800 p-6 bg-green-900/10">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><RefreshCw /> BRIDGE_STATUS</h2>
                        <div className="grid grid-cols-4 gap-2">
                            {status?.patch_panel?.pairs?.map((p: any, idx: number) => (
                                <div key={idx} className={`text-center p-2 border ${p.connected ? 'bg-green-500 text-black border-green-500' : 'border-red-900 text-red-900'}`}>
                                    {idx + 1}: {p.connected ? 'OK' : 'ERR'}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-center font-bold">
                            SOLVED: {status?.patch_panel?.solved ? "YES" : "NO"}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="overflow-x-auto border border-green-800">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-green-900/20 text-green-400">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">NICK</th>
                                <th className="p-3">EMAIL</th>
                                <th className="p-3">UTWORZONO</th>
                                <th className="p-3">AKCJA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users?.map((u: any) => (
                                <tr key={u.id} className="border-b border-green-900 hover:bg-green-900/10">
                                    <td className="p-3">{u.id}</td>
                                    <td className="p-3 font-bold text-white">{u.nick}</td>
                                    <td className="p-3 text-gray-400">{u.email}</td>
                                    <td className="p-3">{u.created_at}</td>
                                    <td className="p-3">
                                        <button
                                            onClick={async () => {
                                                if (confirm(`Czy na pewno chcesz usunąć użytkownika ${u.nick}? To usunie również jego wyniki.`)) {
                                                    try {
                                                        await deleteUser(u.id)
                                                        alert("Użytkownik usunięty")
                                                        window.location.reload()
                                                    } catch (e) {
                                                        alert("Błąd usuwania")
                                                    }
                                                }
                                            }}
                                            className="bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white px-2 py-1 rounded text-xs border border-red-800 transition-colors"
                                        >
                                            USUŃ
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'scores' && (
                <div className="overflow-x-auto border border-green-800">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-green-900/20 text-green-400">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">GRACZ</th>
                                <th className="p-3">GRA</th>
                                <th className="p-3">WYNIK</th>
                                <th className="p-3">CZAS (ms)</th>
                                <th className="p-3">DATA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scores?.map((s: any) => (
                                <tr key={s.score.id} className="border-b border-green-900 hover:bg-green-900/10">
                                    <td className="p-3">{s.score.id}</td>
                                    <td className="p-3 font-bold text-white">{s.nick}</td>
                                    <td className="p-3 text-accent">{s.score.game_type}</td>
                                    <td className="p-3 font-bold">{s.score.score}</td>
                                    <td className="p-3 text-gray-400">{s.score.duration_ms}</td>
                                    <td className="p-3">{s.score.played_at}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {
                activeTab === 'logs' && (
                    <div className="overflow-x-auto border border-green-800 font-mono text-xs">
                        <table className="w-full text-left">
                            <thead className="bg-green-900/20 text-green-400">
                                <tr>
                                    <th className="p-2">ID</th>
                                    <th className="p-2">CZAS</th>
                                    <th className="p-2">TYP</th>
                                    <th className="p-2">SZCZEGÓŁY</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs?.map((l: any) => (
                                    <tr key={l.id} className="border-b border-green-900 hover:bg-green-900/10">
                                        <td className="p-2 text-gray-500">{l.id}</td>
                                        <td className="p-2 text-gray-400">{new Date(l.timestamp).toLocaleTimeString()}</td>
                                        <td className={`p-2 font-bold ${l.event_type === 'SOLENOID' ? 'text-red-400' : 'text-green-400'}`}>{l.event_type}</td>
                                        <td className="p-2 text-white">{l.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

        </div >
    )
}
