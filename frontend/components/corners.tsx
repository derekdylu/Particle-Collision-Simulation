'use client'

import { cn } from "@/lib/utils"

const basicCorner = "w-120 h-30 bg-slate-200/70 backdrop-blur-sm shadow-4xl z-10 absolute"

export const TopRightCorner = () => {


  return (
    <div className={cn(basicCorner, "rounded-bl-4xl top-0 right-0")}>
      <div className="flex justify-center items-center h-full text-4xl font-bold">
        10 Streak!
      </div>
    </div>
  )
}

export const TopLeftCorner = () => {
  return (
    <div className={cn(basicCorner, "rounded-br-4xl top-0 left-0")}>
      <div className="flex justify-center items-center h-full text-2xl">
        Baseball Game - Physics Simulation
      </div>
    </div>
  )
}

export const BottomRightCorner = ({ onClick, loading }: { onClick: () => void, loading: boolean }) => {
  return (
    <div
      className={cn(basicCorner, "animate-pulse rounded-tl-4xl bottom-0 right-0 transition-all duration-200 bg-blue-500/70 hover:bg-blue-600/70 active:scale-105 cursor-pointer", loading && "animate-none bg-slate-200/70 text-slate-500 hover:bg-slate-200/70 pointer-events-none")}
      onClick={onClick}
    >
      <div className="flex justify-center items-center h-full text-4xl font-bold">
        擊球！
      </div>
    </div>
  )
}

export const BottomLeftCorner = ({ onClick, loading }: { onClick: () => void, loading: boolean }) => {
  return (
    <div
      className={cn(basicCorner, "rounded-tr-4xl bottom-0 left-0 transition-all duration-200 hover:bg-slate-300/70 active:scale-105 cursor-pointer", loading && "animate-none bg-slate-200/70 text-slate-500 hover:bg-slate-200/70 pointer-events-none")}
      onClick={onClick}
    >
      <div className="flex justify-center items-center h-full text-2xl">
        重新放球
      </div>
    </div>
  )
}
