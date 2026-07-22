import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { cn } from '@/lib/utils';

const Replay = ({ open, onOpenChange, result }: { open: boolean; onOpenChange: (open: boolean) => void, result: string }) => {
  return (
    <Dialog open={open}>
      <DialogContent
        className='min-w-[1280px]'
        onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className='hidden'>
          <DialogTitle>擊球結果</DialogTitle>
        </DialogHeader>
        <div
          className={cn('flex flex-col items-center justify-center  rounded-full w-fit py-2 px-6 mx-auto',
            result === 'home-run' && 'bg-red-800',
            result === 'hit' && 'bg-blue-800',
            result === 'miss' && 'bg-gray-800'
          )}>
          {result === 'home-run' && (
            <div className='text-3xl font-bold text-white'>全壘打！</div>
          )}
          {result === 'hit' && (
            <div className='text-3xl font-bold text-white'>安打！</div>
          )}
          {result === 'miss' && (
            <div className='text-3xl font-bold text-white'>未擊中</div>
          )}
        </div>
        <div className='flex flex-col items-center justify-center'>
          <video
            className="w-full rounded-lg shadow-lg"
            playsInline
            autoPlay
            muted
            onEnded={() => onOpenChange(false)}
          >
            <source src="/ball-trajectory.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default Replay