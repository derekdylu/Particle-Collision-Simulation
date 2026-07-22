import React, { useEffect, useState } from 'react'
import { cn, playSound } from '@/lib/utils'

const Dashboard = ({ onHit, onReset, value, disabled }: { onHit: () => void, onReset: () => void, value: string, disabled: boolean }) => {
  const [confirm, setConfirm] = useState(false)

  const handleReset = () => {
    if (disabled) return

    playSound('/switch.mp3')
    setConfirm(false)
    onReset()
  }

  const handleClickReset = () => {
    if (disabled) return

    playSound('/switch.mp3')
    setConfirm(true)
  }

  // if not confirm in 5 seconds, set confirm to false
  useEffect(() => {
    if (confirm) {
      setTimeout(() => {
        setConfirm(false)
      }, 5000)
    }
  }, [confirm])

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-[calc(50%+50px)] flex flex-row gap-5 items-center justify-center z-10">
      {!confirm && <button onClick={handleClickReset} className={cn("bg-gray-400 text-white px-4 py-2 font-bold rounded-full hover:bg-gray-500 active:scale-105 transition-all duration-200 w-25", disabled && "opacity-50")}>
        <div>重新送球</div>
        <div className="text-xs mt-1">Reset Ball</div>
      </button>}
      {confirm && <button onClick={handleReset} className={cn("bg-red-400 text-white px-4 py-2 font-bold rounded-full hover:bg-red-500 active:scale-105 transition-all duration-200 w-25", disabled && "opacity-50")}>
        <div>確認重送</div>
        <div className="text-[9px] mt-1">Confirm Reset</div>
      </button>}
      <div className="flex flex-col items-center justify-center bg-slate-400/40 backdrop-blur-md border border-slate-100/50 shadow-lg w-fit h-fit py-4 rounded-full">
        <div className="flex flex-row items-center justify-center gap-10 px-5">
          <div className="w-fit h-fit flex items-center justify-start gap-5 flex-row">
            <div className="border-2 h-28 border-slate-100/50 rounded-full px-10 py-5 w-54 flex flex-row justify-between text-white">
              <div className="text-lg font-bold text-left">目標 Target</div>
              <div className="text-7xl font-bold text-right">{value}</div>
            </div>
          </div>
          <button onClick={onHit} className={cn("w-54 h-28 bg-blue-500 text-white font-bold text-4xl px-10 py-5 rounded-full hover:bg-blue-600 active:scale-105 transition-all duration-200", disabled && "opacity-50")}>
            <div>打擊！</div>
            <div className="text-xl mt-1">Hit!</div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Dashboard