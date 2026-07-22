'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/app/api/api'

interface ResultProps {
  open: boolean
  setOpen: (open: boolean) => void
  debug?: boolean
  result?: 'home-run' | 'hit' | 'miss' | null
}

const Result = ({ open, setOpen, debug = false, result }: ResultProps) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [videoError, setVideoError] = useState<string>('')
  const [showFallback, setShowFallback] = useState(false)
  const [isFetchingVideo, setIsFetchingVideo] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const resultText = {
    'home-run': '全壘打 Home Run',
    hit: '⚾️ 命中安打區域 Hit',
    miss: '😭 未命中目標區域 Miss',
  }

  useEffect(() => {
    if (open) {
      // Reset video state
      setIsVideoReady(false)
      setVideoError('')
      setShowFallback(false)
      setVideoUrl(null)
      setIsFetchingVideo(true)

      // Fetch video using the API
      const fetchVideo = async () => {
        try {
          console.log('Fetching replay camera recording filename...')
          const response = await api.getReplayCameraRecordingFilename()

          if (response.status === 'success' && response.data.filename) {
            console.log('Recording filename:', response.data.filename)

            // Construct video URL from the filename
            // The filename should be relative to the public/recordings directory
            const videoUrl = `${response.data.filename.split('/').pop()}`
            console.log('Video URL constructed:', videoUrl)

            // Check if the video file exists by making a HEAD request
            try {
              const checkResponse = await fetch(videoUrl, { method: 'HEAD' })
              if (checkResponse.ok) {
                console.log('Video file exists and is accessible')
                setVideoUrl(videoUrl)
              } else {
                console.error('Video file not found or not accessible:', checkResponse.status, checkResponse.statusText)
                setVideoError(`Video file not found (${checkResponse.status}): ${videoUrl}`)
                setShowFallback(true)
              }
            } catch (checkError) {
              console.error('Error checking video file existence:', checkError)
              setVideoError(`Error checking video file: ${checkError instanceof Error ? checkError.message : 'Unknown error'}`)
              setShowFallback(true)
            }
          } else {
            console.error('Failed to get recording filename:', response.message)
            setVideoError(`Failed to get recording filename: ${response.message}`)
            setShowFallback(true)
          }
        } catch (error) {
          console.error('Error fetching video:', error)
          setVideoError(`Error fetching video: ${error instanceof Error ? error.message : 'Unknown error'}`)
          setShowFallback(true)
        } finally {
          setIsFetchingVideo(false)
        }
      }

      fetchVideo()

      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.playbackRate = 0.25
      }
    }
  }, [open])

  const handleVideoReady = () => {
    console.log('Video loaded successfully')
    setIsVideoReady(true)
    setVideoError('')
    setShowFallback(false)

    // Set playback rate when video is ready
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.25
    }
  }

  const handleVideoError = (error: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = error.currentTarget
    const errorDetails = {
      error: videoElement.error,
      networkState: videoElement.networkState,
      readyState: videoElement.readyState,
      src: videoElement.src,
      currentSrc: videoElement.currentSrc,
      duration: videoElement.duration,
      videoWidth: videoElement.videoWidth,
      videoHeight: videoElement.videoHeight,
      paused: videoElement.paused,
      ended: videoElement.ended,
      seeking: videoElement.seeking,
      readyStateText: ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][videoElement.readyState],
      networkStateText: ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'][videoElement.networkState]
    }
    console.error('Video playback error details:', errorDetails)

    let errorMessage = 'Unknown video error'
    if (videoElement.error) {
      switch (videoElement.error.code) {
        case 1:
          errorMessage = 'Video loading aborted'
          break
        case 2:
          errorMessage = 'Network error while loading video'
          break
        case 3:
          errorMessage = 'Video decoding failed'
          break
        case 4:
          errorMessage = 'Video format not supported'
          break
        default:
          errorMessage = `Video error code: ${videoElement.error.code}`
      }
    } else if (videoElement.networkState === 3) {
      errorMessage = 'Video source not found (404)'
    } else if (videoElement.readyState === 0) {
      errorMessage = 'Video metadata not loaded'
    }

    setVideoError(`Video error: ${errorMessage}`)
    setShowFallback(true)
  }

  const handleVideoLoadStart = () => {
    console.log('Video load started')
    if (videoRef.current) {
      videoRef.current.currentTime = 0.5
    }
  }

  const handleVideoCanPlay = () => {
    console.log('Video can play')
    // Set playback rate when video can play
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.25
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="min-w-[1280px] min-h-[720px]" aria-describedby="video-description">
        <DialogTitle className="text-center hidden">擊球結果</DialogTitle>
        {
          !debug && result && (
            <div
              className={cn("place-self-center shadow-lg h-28 rounded-full px-10 py-5 w-fit flex flex-row justify-center items-center",
                result === 'home-run' && 'bg-red-100 text-red-500 shadow-red-500/50',
                result === 'hit' && 'bg-green-100 text-green-500 shadow-green-500/50',
                result === 'miss' && 'bg-gray-100 text-gray-500 shadow-gray-500/50',
              )}
            >
              {
                <div className="text-7xl font-bold">{resultText[result as keyof typeof resultText]}</div>
              }
            </div>
          )
        }
        <div className="relative w-full h-full min-h-[692px]">
          {isFetchingVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <div>
                  正在獲取重播影片...
                  <div className="text-sm mt-1">Loading replay video...</div>
                </div>
              </div>
            </div>
          )}
          {!isFetchingVideo && !isVideoReady && !videoError && !showFallback && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
              <div className="text-center">
                載入影片中...
                <div className="text-sm mt-1">Loading video...</div>
              </div>
            </div>
          )}
          {videoError && !showFallback && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900 text-white z-10">
              <div className="text-center">
                <div>
                  影片載入失敗
                  <div className="text-sm mt-1">Video loading failed</div>
                </div>
                <div className="text-sm mt-2">{videoError}</div>
                {debug && (
                  <div className="text-xs mt-2">
                    URL: {videoUrl}
                  </div>
                )}
              </div>
            </div>
          )}
          {showFallback && result && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 text-white z-10">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">{resultText[result as keyof typeof resultText]}</div>
                <div className="text-lg opacity-80">
                  重播影片暫時無法播放
                  <div className="text-sm mt-1">Replay video temporarily cannot be played</div>
                </div>
              </div>
            </div>
          )}
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-[1230px] h-[692px] object-contain"
              controls={debug}
              onLoadedData={handleVideoReady}
              onError={handleVideoError}
              onLoadStart={handleVideoLoadStart}
              onCanPlay={handleVideoCanPlay}
              preload="auto"
              autoPlay
            // loop
            />
          )}
          {/* Placeholder div to maintain layout when video is not mounted */}
          {!videoUrl && (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-lg">
                  等待影片載入...
                  <div className="text-sm mt-1">Waiting for video to load...</div>
                </div>
              </div>
            </div>
          )}
        </div>
        {debug && (
          <Button onClick={() => setOpen(false)}>Close</Button>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default Result