import React from 'react'
import { useLanguageStore } from '@/stores/languageStore'

const Language = () => {
  const { language, setLanguage } = useLanguageStore()

  return (
    <div className="absolute top-10 left-5 z-10">
      <button onClick={() => setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW')} className="bg-gray-400 text-white px-4 py-2 font-bold rounded-full hover:bg-gray-500 active:scale-105 transition-all duration-200 w-fit">
        {language === 'zh-TW' ? 'English ver.' : '中文版'}
      </button>
    </div>
  )
}

export default Language