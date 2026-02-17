import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
    id: number
    nick: string
    email: string
}

interface GameState {
    user: User | null
    score: number
    setUser: (user: User) => void
    login: (user: User) => void
    logout: () => void
    setScore: (score: number) => void
    resetGame: () => void
}

export const useGameStore = create<GameState>()(
    persist(
        (set) => ({
            user: null,
            score: 0,
            setUser: (user) => set({ user }),
            login: (user) => set({ user }),
            logout: () => set({ user: null, score: 0 }),
            setScore: (score) => set({ score }),
            resetGame: () => set({ score: 0 }),
        }),
        {
            name: 'checkit-storage',
        }
    )
)
