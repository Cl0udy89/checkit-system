import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../lib/api'
import { Lock } from 'lucide-react'

export default function AdminLogin() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const formData = new FormData()
            formData.append('username', username)
            formData.append('password', password)
            const data = await loginAdmin(formData)
            localStorage.setItem('admin_token', data.access_token)
            window.location.reload() // Reload to trigger admin view in parent
        } catch (err) {
            setError('Invalid Credentials')
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            <form onSubmit={handleLogin} className="bg-gray-900 double-border p-8 rounded-xl w-full max-w-md border border-green-800 shadow-[0_0_20px_rgba(0,255,0,0.1)]">
                <h1 className="text-2xl font-mono font-bold text-green-500 mb-6 flex items-center gap-2">
                    <Lock /> ADMIN_ACCESS
                </h1>
                {error && <div className="bg-red-900/30 text-red-500 p-2 mb-4 text-sm font-mono border border-red-900">{error}</div>}

                <div className="space-y-4">
                    <div>
                        <label className="block text-green-700 font-mono text-xs mb-1">IDENTIFIER</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-black border border-green-800 text-green-500 p-2 font-mono focus:border-green-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-green-700 font-mono text-xs mb-1">KEY</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black border border-green-800 text-green-500 p-2 font-mono focus:border-green-500 outline-none"
                        />
                    </div>
                    <button type="submit" className="w-full bg-green-900/20 hover:bg-green-900/40 text-green-500 border border-green-700 py-3 font-mono font-bold transition-all">
                        AUTHENTICATE
                    </button>
                </div>
            </form>
        </div>
    )
}
