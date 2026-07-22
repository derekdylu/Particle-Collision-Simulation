import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useState } from 'react'

// Simple loading spinner component as fallback
const LoadingSpinner = () => (
  <div className="w-[400px] h-[400px] flex items-center justify-center">
    <div className="relative">
      <div className="animate-spin rounded-full h-32 w-32 border-4 border-gray-200 border-t-blue-600"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-lg font-semibold text-gray-600">載入中</div>
      </div>
    </div>
  </div>
)

// Alternative: Use only CSS animations (uncomment this section to use CSS-only version)
/*
const ArmLoading = ({ open }: { open: boolean }) => {
  return (
    <Dialog open={open}>
      <DialogContent className="min-w-[1280px] min-h-[720px]">
        <DialogTitle className="hidden">機械手臂試揮中 / 打擊中</DialogTitle>
        <div className="flex flex-col items-center justify-center w-full h-full gap-10">
          <div className="text-4xl font-bold">機械手臂試揮中 / 打擊中...</div>
          <LoadingSpinner />
          <div className="text-[8px] text-gray-300">Loading Animation</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const CatcherLoading = ({ open }: { open: boolean }) => {
  return (
    <Dialog open={open}>
      <DialogContent className="min-w-[1280px] min-h-[720px]">
        <DialogTitle className="hidden">送球裝置運作中</DialogTitle>
        <div className="flex flex-col items-center justify-center w-full h-full gap-10">
          <div className="text-4xl font-bold">送球裝置運作中...</div>
          <LoadingSpinner />
          <div className="text-[8px] text-gray-300">Loading Animation</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
*/

// Original version with error handling
const ArmLoading = ({ open }: { open: boolean }) => {
  const [animationError, setAnimationError] = useState(false)

  return (
    <Dialog open={open}>
      <DialogContent className="min-w-[1280px] min-h-[720px]">
        <DialogTitle className="hidden">機械手臂試揮中/打擊中</DialogTitle>
        <div className="flex flex-col items-center justify-center w-full h-full gap-10">
          <div className="text-4xl font-bold">
            機械手臂試揮中 / 打擊中...
            <div className="mt-1 text-center">Arm Demo / Batting...</div>
          </div>
          {!animationError ? (
            <div className="w-[400px] h-[400px] flex items-center justify-center">
              <DotLottieReact
                width={400}
                height={400}
                style={{ width: '400px', height: '400px' }}
                src="loading.lottie"
                loop
                autoplay
                onError={() => setAnimationError(true)}
              />
            </div>
          ) : (
            <LoadingSpinner />
          )}
          <div className="text-[8px] text-gray-300">Animations from LottieFiles</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const PageLoading = ({ open }: { open: boolean }) => {
  return (
    <Dialog open={open}>
      <DialogContent className="min-w-[1280px] min-h-[720px]">
        <DialogTitle className="hidden">頁面載入中</DialogTitle>
        <div className="flex flex-col items-center justify-center w-full h-full gap-10">
          <div className="text-4xl font-bold text-center">
            頁面載入中...
            <div className="mt-1 text-center">Page Loading...</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const CatcherLoading = ({ open }: { open: boolean }) => {
  const [animationError, setAnimationError] = useState(false)

  return (
    <Dialog open={open}>
      <DialogContent className="min-w-[1280px] min-h-[720px]">
        <DialogTitle className="hidden">送球裝置運作中</DialogTitle>
        <div className="flex flex-col items-center justify-center w-full h-full gap-10 text-center">
          <div className="text-4xl font-bold">
            送球裝置運作中...
            <div className="mt-1 text-center">Ball Delivery System Running...</div>
          </div>
          {!animationError ? (
            <div className="w-[400px] h-[400px] flex items-center justify-center">
              <DotLottieReact
                width={400}
                height={400}
                style={{ width: '400px', height: '400px' }}
                src="catcher-loading.lottie"
                loop
                autoplay
                onError={() => setAnimationError(true)}
              />
            </div>
          ) : (
            <LoadingSpinner />
          )}
          <div className="text-[8px] text-gray-300">Animations from LottieFiles</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ArmLoading, CatcherLoading, PageLoading }