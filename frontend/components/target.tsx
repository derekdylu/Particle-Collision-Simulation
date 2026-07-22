import React from 'react'
import { options } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Label } from '@/components/switch'

const Target = ({ target }: { target: string }) => {
  return (
    <div className="flex flex-col gap-2 absolute top-1/3 left-5 -translate-y-1/3 z-10">
      <Label text="教練指定目標" englishText="Coach's target" />
      {options.map((option, index) => (
        <Cell key={index} value={option} isTarget={target === option} />
      ))}
    </div>
  )
}

export default Target

const Cell = ({ value, isTarget }: { value: string, isTarget: boolean }) => {
  return (
    <div
      className={cn('flex flex-col items-center justify-center bg-slate-400/40 backdrop-blur-md shadow-lg border border-slate-100/5 w-36 h-16 py-2 rounded-full',
        isTarget && 'bg-red-400/50 border-red-100/50'
      )}>
      <div className="text-3xl font-bold text-center text-white">{value}</div>
    </div>
  )
}