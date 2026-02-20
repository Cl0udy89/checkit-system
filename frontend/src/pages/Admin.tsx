import { useQuery, useMutation } from '@tanstack/react-query'
import { api, fetchAdminUsers, fetchAdminScores, deleteUser, fetchSystemConfig, setSystemConfig, fetchEmailTemplates, updateEmailTemplate, sendAllEmails, clearLogs, resetDatabase } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { Shield, Zap, RefreshCw, Lock, LogOut, Settings, Mail } from 'lucide-react'
import AdminLogin from './AdminLogin'
import { useState } from 'react'

// Direct axios calls for admin to save time updating api.ts
const triggerSolenoid = async () => api.post('/admin/solenoid/trigger')
const triggerLed = async (effect: string) => api.post('/admin/hardware/led', { effect })
const fetchHardwareStatus = async () => (await api.get('/admin/hardware/status')).data
const fetchAdminLogs = async () => (await api.get('/admin/logs')).data

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

    const { data: logs, refetch: refetchLogs } = useQuery({
        queryKey: ['admin_logs'],
        queryFn: async () => (await api.get('/admin/logs')).data,
        refetchInterval: 3000,
        enabled: activeTab === 'logs'
    })

    const { data: systemStatus } = useQuery({
        queryKey: ['system_status'],
        queryFn: async () => (await api.get('/admin/system/status')).data,
        refetchInterval: 5000 // Refresh often to see new nodes
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

    const clearLogsMutation = useMutation({
        mutationFn: clearLogs,
        onSuccess: () => {
            alert("Logi wyczyszczone")
            window.location.reload()
        }
    })

    const resetDbMutation = useMutation({
        mutationFn: resetDatabase,
        onSuccess: () => {
            alert("BAZA DANYCH ZRESETOWANA.")
            window.location.reload()
        }
    })

    const solenoidMutation = useMutation({
        mutationFn: triggerSolenoid,
        onSuccess: () => alert("Solenoid Triggered")
    })

    const ledMutation = useMutation({
        mutationFn: triggerLed,
        onSuccess: (_, variables) => alert(`LED Effect Queued: ${variables}`)
    })

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-4 md:p-8 border-x-0 md:border-4 border-green-900 overflow-x-hidden">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-green-800 pb-4 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-center md:text-left">
                        <Shield /> ADMIN_CONSOLE // ROOT_ACCESS
                    </h1>
                    {/* Connected Nodes Indicator */}
                    <div className="flex gap-2 ml-4 hidden md:flex">
                        {systemStatus?.connected_nodes && Object.values(systemStatus.connected_nodes).length > 0 ? (
                            Object.values(systemStatus.connected_nodes).map((node: any, idx) => {
                                const isOnline = node.status === 'online';
                                return (
                                    <div key={idx} className={`px-2 py-1 border text-xs rounded font-mono flex items-center gap-2 ${isOnline ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-gray-900/50 border-gray-600 text-gray-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        {node.is_rpi ? "RPi" : "PC"} [{node.node_id}]
                                    </div>
                                )
                            })
                        ) : (
                            <div className="px-2 py-1 bg-yellow-900/50 border border-yellow-500 text-yellow-500 text-xs rounded font-mono flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                NO NODES
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => { localStorage.removeItem('admin_token'); window.location.reload() }} className="hover:text-red-500 flex items-center gap-2"><LogOut size={16} /> WYLOGUJ</button>
                    <button onClick={() => navigate('/dashboard')} className="hover:text-white">WYJŚCIE</button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 w-full no-scrollbar">
                <button onClick={() => setActiveTab('hardware')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'hardware' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>SPRZĘT</button>
                <button onClick={() => setActiveTab('users')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'users' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>UŻYTKOWNICY</button>
                <button onClick={() => setActiveTab('scores')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'scores' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>WYNIKI</button>
                <button onClick={() => setActiveTab('logs')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'logs' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>LOGI</button>
                <button onClick={() => setActiveTab('settings')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'settings' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>USTAWIENIA</button>
                <button onClick={() => setActiveTab('email')} className={`whitespace-nowrap px-3 py-2 text-sm border ${activeTab === 'email' ? 'bg-green-900/30 border-green-500 text-white' : 'border-green-900 text-green-700'}`}>EMAIL</button>
            </div>

            {activeTab === 'hardware' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Solenoid Control */}
                    <div className="border border-green-800 p-6 bg-green-900/10">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Lock /> RELAY_CONTROL</h2>
                        <p className="mb-4 text-sm text-green-400">Manual override for solenoid lock.</p>

                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => solenoidMutation.mutate()}
                                className="bg-red-900 text-white px-6 py-4 font-bold rounded hover:bg-red-700 transition w-full flex justify-center items-center gap-2"
                            >
                                <Zap /> FORCE OPEN (5s)
                            </button>

                            <div className="flex justify-between items-center border border-green-800 p-3 bg-black">
                                <div className="text-center w-1/2 border-r border-green-800">
                                    <div className="text-xs text-gray-500 mb-1">KOMENDA</div>
                                    <span className={`font-bold ${status?.solenoid?.is_active ? "text-red-500 animate-pulse" : "text-green-500"}`}>
                                        {status?.solenoid?.is_active ? "ACTIVE" : "IDLE"}
                                    </span>
                                </div>
                                <div className="text-center w-1/2">
                                    <div className="text-xs text-gray-500 mb-1">CZUJNIK FIZYCZNY</div>
                                    <span className={`font-bold flex items-center justify-center gap-2 ${status?.solenoid?.is_open ? "text-yellow-500" : "text-green-500"}`}>
                                        {status?.solenoid?.is_open ? (
                                            <>🔓 OTWARTE</>
                                        ) : (
                                            <>🔒 ZAMKNIĘTE</>
                                        )}
                                    </span>
                                </div>
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

                    {/* LED Control */}
                    <div className="border border-green-800 p-6 bg-green-900/10 md:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2"><Zap /> LED_CONTROL</h2>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500 hidden md:inline">DOWOLNY KOLOR:</span>
                                {/* By setting a background with border rounded tight, the color input fits nicer. Some browsers stylize it weirdly anyway */}
                                <input
                                    type="color"
                                    onChange={(e) => ledMutation.mutate(e.target.value)}
                                    className="w-10 h-10 cursor-pointer bg-black border border-green-800 p-1"
                                    title="Wybierz z palety kolorów"
                                />
                            </div>
                        </div>
                        <p className="mb-4 text-sm text-green-400">Manual override for Neopixel Strip. Wybierz kolor obok, lub uruchom gotowy efekt poniżej.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            <button onClick={() => ledMutation.mutate('rainbow')} className="bg-purple-900 border border-purple-500 text-white p-2 text-sm hover:bg-purple-700 transition">RAINBOW</button>
                            <button onClick={() => ledMutation.mutate('chase')} className="bg-blue-900 border border-blue-500 text-white p-2 text-sm hover:bg-blue-700 transition">CHASE</button>
                            <button onClick={() => ledMutation.mutate('police')} className="bg-red-900 border border-blue-500 text-white p-2 text-sm hover:bg-red-700 transition">POLICE</button>
                            <button onClick={() => ledMutation.mutate('green')} className="bg-green-900 border border-green-500 text-white p-2 text-sm hover:bg-green-700 transition">SOLID GREEN</button>
                            <button onClick={() => ledMutation.mutate('red')} className="bg-red-900 border border-red-500 text-white p-2 text-sm hover:bg-red-700 transition">SOLID RED</button>
                            <button onClick={() => ledMutation.mutate('off')} className="bg-gray-900 border border-gray-500 text-white p-2 text-sm hover:bg-gray-700 transition">TURN OFF</button>
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

            {activeTab === 'logs' && (
                <div className="overflow-x-auto border border-green-800 font-mono text-xs">
                    <div className="flex justify-between items-center bg-green-900/20 p-2 border-b border-green-800">
                        <span className="text-green-400 font-bold">OSTATNIE ZDARZENIA (MAX 50)</span>
                        <button onClick={() => { if (confirm("Wyczyścić logi?")) clearLogsMutation.mutate() }} className="text-xs border border-green-600 px-2 py-1 text-green-400 hover:bg-green-900">WYCZYŚĆ</button>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-green-900/20 text-green-400 hidden md:table-header-group">
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
            )}

            {activeTab === 'settings' && (
                <div className="border border-green-800 p-6 bg-green-900/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings /> KONFIGURACJA SYSTEMU</h2>

                    <div className="flex items-center justify-between p-4 border border-green-800 bg-black mb-4 flex-col md:flex-row gap-4">
                        <div>
                            <div className="text-white font-bold">ZAWODY AKTYWNE</div>
                            <div className="text-xs text-gray-400">Gdy wyłączone, gry są zablokowane dla uczestników.</div>
                        </div>
                        <div className="flex gap-2">
                            {config?.competition_active !== 'false' ? (
                                <button onClick={() => configMutation.mutate({ key: 'competition_active', value: 'false' })} className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-500 w-full md:w-auto">ZAKOŃCZ ZAWODY</button>
                            ) : (
                                <button onClick={() => configMutation.mutate({ key: 'competition_active', value: 'true' })} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-500 w-full md:w-auto">WZNÓW ZAWODY</button>
                            )}
                        </div>
                    </div>

                    <div className="mb-4 p-4 border border-green-800 bg-black">
                        <label className="block text-white font-bold mb-4 border-b border-gray-800 pb-2">KONFIGURACJA EMAIL (SMTP)</label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">NADAWCA (FROM)</label>
                                <input
                                    type="email"
                                    placeholder="noreply@checkit.com"
                                    defaultValue={config?.email_sender || ""}
                                    onBlur={(e) => configMutation.mutate({ key: 'email_sender', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">SMTP HOST</label>
                                <input
                                    placeholder="smtp.gmail.com"
                                    defaultValue={config?.smtp_host || ""}
                                    onBlur={(e) => configMutation.mutate({ key: 'smtp_host', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">SMTP PORT</label>
                                <input
                                    placeholder="587"
                                    defaultValue={config?.smtp_port || "587"}
                                    onBlur={(e) => configMutation.mutate({ key: 'smtp_port', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">SMTP USER</label>
                                <input
                                    placeholder="user@example.com"
                                    defaultValue={config?.smtp_user || ""}
                                    onBlur={(e) => configMutation.mutate({ key: 'smtp_user', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">SMTP PASSWORD</label>
                                <input
                                    type="password"
                                    placeholder="******"
                                    defaultValue={config?.smtp_password || ""}
                                    onBlur={(e) => configMutation.mutate({ key: 'smtp_password', value: e.target.value })}
                                    className="bg-gray-900 border border-green-800 p-2 text-white w-full"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 p-4 border border-red-800/50 bg-red-900/5">
                        <div className="text-red-400 font-bold mb-2">STREFA NIEBEZPIECZNA</div>
                        <button
                            onClick={() => { if (confirm("POWAŻNIE: TO USUNIE WSZYSTKICH UŻYTKOWNIKÓW, WYNIKI I LOGI. CZY NA PEWNO?")) resetDbMutation.mutate() }}
                            className="text-red-500 hover:text-white border border-red-500 px-4 py-2 text-xs w-full md:w-auto"
                        >
                            RESET DATABASE (WIPE ALL)
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'email' && (
                <div className="border border-green-800 p-6 bg-green-900/10">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Mail /> POWIADOMIENIA EMAIL</h2>

                    {emailSuccess && <div className="mb-4 p-4 bg-green-500/20 text-white border border-green-500">{emailSuccess}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-green-400 font-bold mb-4">SZABLONY WIADOMOŚCI</h3>
                            <div className="space-y-4">
                                {templates?.map((t: any) => (
                                    <div key={t.slug} className="p-4 border border-green-800 bg-black hover:bg-green-900/10 cursor-pointer" onClick={() => setEditingTemplate(t)}>
                                        <div className="text-xs text-gray-500 uppercase">{t.slug}</div>
                                        <div className="font-bold text-white">{t.subject}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            {editingTemplate ? (
                                <div className="border border-green-500 p-4 bg-black h-full">
                                    <h3 className="text-white font-bold mb-4">EDYCJA: {editingTemplate.slug}</h3>
                                    <div className="mb-4">
                                        <label className="block text-xs text-gray-500 mb-1">TEMAT</label>
                                        <input
                                            value={editingTemplate.subject}
                                            onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                            className="w-full bg-gray-900 border border-green-800 p-2 text-white"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs text-gray-500 mb-1">TREŚĆ (Obsługuje: {'{nick}'}, {'{score}'}, {'{game}'})</label>
                                        <textarea
                                            value={editingTemplate.body}
                                            onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                                            className="w-full h-40 bg-gray-900 border border-green-800 p-2 text-white font-mono text-sm"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 text-gray-400 hover:text-white">ANULUJ</button>
                                        <button onClick={() => updateTemplateMutation.mutate()} className="px-4 py-2 bg-green-600 text-white hover:bg-green-500">ZAPISZ</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="border border-green-800 p-4 bg-black h-full flex flex-col justify-center items-center text-center">
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-white mb-2">MASOWA WYSYŁKA</h3>
                                        <p className="text-gray-400 text-sm">
                                            System automatycznie wyłoni zwycięzców (Top 3 Grandmaster + Kategorie) i wyśle im odpowiednie wiadomości.
                                            Pozostali otrzymają podziękowanie.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { if (confirm("Czy na pewno wysłać e-maile do WSZYSTKICH?")) sendEmailsMutation.mutate() }}
                                        className="bg-white text-black font-bold px-8 py-4 rounded hover:bg-gray-200 transition"
                                    >
                                        WYŚLIJ NAGRODY I PODZIĘKOWANIA
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div >
    )
}
