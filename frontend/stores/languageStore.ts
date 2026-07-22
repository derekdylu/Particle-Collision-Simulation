import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface LanguageState {
  language: string
  setLanguage: (language: string) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist((set) => ({
    language: 'zh-TW',
    setLanguage: (language) => set({ language }),
  }), {
    name: 'language-storage',
    storage: createJSONStorage(() => localStorage),
  })
)