import { options } from '@/lib/constants'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface BaseballState {
  target: string
  loading: boolean
  setTarget: (target: string) => void
  setLoading: (loading: boolean) => void
  randomTarget: () => void
}

export const useBaseballStore = create<BaseballState>()(
  persist(
    (set) => ({
      target: 'A',
      loading: false,
      setTarget: (target) => set({ target }),
      setLoading: (loading) => set({ loading }),
      randomTarget: () => {
        const randomTarget = options[Math.floor(Math.random() * options.length)]
        set({ target: randomTarget })
      },
    }),
    {
      name: 'baseball-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)