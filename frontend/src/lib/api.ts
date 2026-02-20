import axios from 'axios'

export const api = axios.create({
    baseURL: `http://${window.location.hostname}:8000/api/v1`
})

// Auth Interceptor
api.interceptors.request.use(config => {
    const token = localStorage.getItem('admin_token')
    if (token) {
        config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            if (localStorage.getItem('admin_token')) {
                localStorage.removeItem('admin_token')
                window.location.reload()
            }
        }
        return Promise.reject(error)
    }
)

export const loginAdmin = async (formData: FormData) => {
    const res = await api.post('/auth/token', formData)
    return res.data
}

export const deleteUser = async (userId: number) => {
    const res = await api.delete(`/admin/users/${userId}`)
    return res.data
}

export const fetchAdminUsers = async () => (await api.get('/admin/users')).data
export const fetchAdminScores = async () => (await api.get('/admin/scores')).data

export const fetchITMatchQuestions = async () => (await api.get('/game/it-match/questions')).data

export const fetchLeaderboard = async () => {
    const { data } = await api.get('/leaderboard')
    return data
}

export const fetchGameContent = async (gameType: string) => {
    const { data } = await api.get(`/games/content/${gameType}`)
    return data
}

export const submitGameScore = async (payload: { user_id: number, game_type: string, answers: any, duration_ms: number, score?: number }) => {
    const { data } = await api.post('/games/submit', payload)
    return data
}

export const fetchGameStatus = async (userId: number) => {
    const { data } = await api.get('/games/status', {
        headers: { 'X-User-ID': userId.toString() }
    })
    return data
}

export const fetchPatchPanelState = async () => {
    const { data } = await api.get('/games/patch_panel/state')
    return data
}


// System Config & Email
export const fetchSystemConfig = async () => (await api.get('/admin/config')).data
export const setSystemConfig = async (key: string, value: string) => (await api.post(`/admin/config/${key}?value=${value}`)).data
export const fetchEmailTemplates = async () => (await api.get('/admin/email-templates')).data
export const updateEmailTemplate = async (slug: string, subject: string, body: string) => (await api.put(`/admin/email-templates/${slug}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)).data
export const sendAllEmails = async () => (await api.post('/admin/email/send-all')).data
export const clearLogs = async () => (await api.delete('/admin/logs')).data
export const resetDatabase = async () => (await api.delete('/admin/database')).data
