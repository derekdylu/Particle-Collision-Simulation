'use client'

import Switch from "../components/switch";
import { useState, useEffect } from "react";
import Dashboard from "@/components/dashboard";
import { useBaseballStore } from "@/stores/baseballStore";
import Baseball from "@/components/baseball";
import { ArmLoading, CatcherLoading } from "@/components/loadings";
import Target from "@/components/target";
import Info from "@/components/info";
import { api } from "@/app/api/api";
import Result from "@/components/result";
import Warning from "@/components/warning";
import { playSound } from "@/lib/utils";
import { PageLoading } from "@/components/loadings";
// import Language from "@/components/language";
import { useLanguageStore } from "@/stores/languageStore";
import { recordHandler } from "./stats/hooks/recordHandler";

// arm procedure, 1. click hit, 2. arm demo (18s), 3. real hit (2s)
const DEMO_INTERVAL = 22 * 1000 // 22 seconds
const AUTO_RECORDING_DURATION = 2 * 1000 // 2 seconds
const CATCHER_RESET_INTERVAL = 1 * 60 * 1000 // 60 seconds
const REPLAY_DURATION = 10 * 1000 // 10 seconds
const ARM_MOVE_INTERVAL = 1.5 * 1000 // 1.5 seconds

const targetMap: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'C',
  3: 'D',
}

export default function Home() {
  const [value, setValue] = useState('4')
  const { target, randomTarget } = useBaseballStore()
  const [openResultDialog, setOpenResultDialog] = useState(false)
  const [armLoading, setArmLoading] = useState(false)
  const [catcherLoading, setCatcherLoading] = useState(false)
  const [warningOpen, setWarningOpen] = useState(false)
  const [result, setResult] = useState<'home-run' | 'hit' | 'miss' | null>(null)
  const [armMoving, setArmMoving] = useState(false)
  const [loading, setLoading] = useState(true)
  const { setLanguage } = useLanguageStore()

  useEffect(() => {
    setLanguage('zh-TW')
    setLoading(true)
    setTimeout(() => {
      randomTarget()

      checkServerStatus()

      // if no ball, reset the ball
      api.getCatcherStatus().then((res) => {
        if (!res.data.ball_ready) {
          handleReset()
        }
      })

      // wait 1 second for the arm to be ready
      setTimeout(() => {
        // set arm to default setup
        api.setArmPreset(4).then(() => {
        }).catch((err) => {
          console.log('set arm preset error', err)
        })
      }, ARM_MOVE_INTERVAL)

      setLoading(false)
    }, 1000) // 1 second for the page to be loaded
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = async () => {
    const res = await api.getCatcherStatus()
    if (res.data.ball_ready) {
      return
    }

    setCatcherLoading(true)
    api.resetBall().then(() => {
    }).catch((err) => {
      console.log('ball reset error', err)
    }).finally(() => {
      // wait CATCHER_RESET_INTERVAL for the ball to be ready
      setTimeout(() => {
        randomTarget()
        setCatcherLoading(false)
      }, CATCHER_RESET_INTERVAL)
    })
  }

  const checkServerStatus = () => {
    api.testBackend().then((res) => {
      console.log('server status', res)
      if (res.data.server && res.data.arm && res.data.catcher && res.data.goal_camera && res.data.replay_camera) {
        setWarningOpen(false)
      } else {
        setWarningOpen(true)
      }
    }).catch((err) => {
      console.log('server status error', err)
      setWarningOpen(true)
    })
  }

  const handleValueChange = (newValue: string) => {
    if (armMoving) return

    setArmMoving(true)
    playSound('/switch.mp3')
    setValue(newValue)
    // move the arm
    api.setArmPreset(parseInt(newValue)).then(() => {
    }).catch((err) => {
      console.log('move arm to preset error', err)
    })

    // wait for ARM_MOVE_INTERVAL second for the arm to move
    setTimeout(() => {
      setArmMoving(false)
    }, ARM_MOVE_INTERVAL)
  }

  const handleHit = async () => {
    if (armMoving) return

    playSound('/hit.mp3')

    setArmLoading(true)

    const catcherStatus = await api.getCatcherStatus()
    if (!catcherStatus.data.ball_ready) {
      setArmLoading(false)
      handleReset()
      return
    }

    api.postArmHit().then(() => {
    }).catch((err) => {
      console.log('arm hit error', err)
    })

    setTimeout(() => {
      api.startReplayCameraAutoRecording().then((res) => {
        console.log('start replay camera auto recording', res)
      }).catch((err) => {
        console.log('start replay camera auto recording error', err)
      }).finally(() => {
        // wait for AUTO_RECORDING_DURATION + 1s buffer for the recording to be finished and get goal camera result
        setTimeout(async () => {
          const goalCameraResult = await api.getGoalCameraResult()
          console.log('get goal camera result', goalCameraResult)
          if (targetMap[goalCameraResult.data.result] === target) {
            setResult('hit')
            await recordHandler({ bValue: parseInt(value), target, result: 'hit' })
          } else {
            setResult('miss')
            await recordHandler({ bValue: parseInt(value), target, result: 'miss' })
          }

          // show replay video
          setOpenResultDialog(true)

          // wait REPLAY_DURATION to auto close result dialog
          setTimeout(() => {
            setOpenResultDialog(false)
            setLanguage('zh-TW')
          }, REPLAY_DURATION)

          api.postResetLastHitArea().then(() => {
            console.log('reset last hit area')
          }).catch((err) => {
            console.log('reset last hit area error', err)
          })

          setValue('4')
          setArmLoading(false)
          handleReset()
        }, AUTO_RECORDING_DURATION + 1000) // 1s for the buffer
      })
    }, DEMO_INTERVAL - AUTO_RECORDING_DURATION - 1000) // 1s for the buffer
  }

  return (
    <div className="w-screen h-screen bg-white">
      <PageLoading open={loading} />
      <Warning open={warningOpen} />
      <Result
        open={openResultDialog}
        setOpen={setOpenResultDialog}
        debug={false}
        result={result}
      />
      <CatcherLoading open={!openResultDialog && catcherLoading} />
      <ArmLoading open={armLoading} />
      <Target target={target} />
      <Switch onValueChange={handleValueChange} value={value} disabled={armMoving} />
      <Dashboard onHit={handleHit} onReset={handleReset} value={target} disabled={armMoving} />
      <Baseball positionIndex={parseInt(value) - 1} />
      {/* <Language /> */}
      <Info />
    </div>
  );
}