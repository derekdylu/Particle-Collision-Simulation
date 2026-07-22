'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/api/api';
import type { ServerStatus } from '@/app/api/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Result from '@/components/result';
import { useRouter } from 'next/navigation';
import { normalizeFilename } from '@/lib/utils';
const CORRECT_PASSWORD = '0628';
const IS_AUTH = false;

export function DebugPanel() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(IS_AUTH);
  const [password, setPassword] = useState('');
  const [catcherStatus, setCatcherStatus] = useState(false);
  const [hitGoal, setHitGoal] = useState<number>(-1);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({ server: false, arm: false, catcher: false, goal_camera: false, replay_camera: false });
  const [openResultDialog, setOpenResultDialog] = useState(false);
  const [armCommand, setArmCommand] = useState('');
  const [replayCameraRecordingFilename, setReplayCameraRecordingFilename] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      toast.success('Access granted');
    } else {
      toast.error('Incorrect password');
    }
  };

  const handleCheckBallReady = async () => {
    const response = await api.getCatcherStatus();
    if (response.data.is_connected) {
      setCatcherStatus(response.data.ball_ready);
      toast.success('Ball ready checked');
    } else {
      toast.error('Catcher is not connected');
    }
  };

  const handleArmPreset = async (preset: number) => {
    try {
      await api.setArmPreset(preset);
      toast.success(`Arm moved to preset ${preset}`);
    } catch (error: unknown) {
      console.error('Failed to move arm:', error);
      toast.error('Failed to move arm');
    }
  };

  const handleResetBall = async () => {
    try {
      await api.resetBall();
      toast.success('Ball reset');
    } catch (error: unknown) {
      console.error('Failed to reset ball:', error);
      toast.error('Failed to reset ball');
    }
  };

  const handleCameraAutoRecording = async () => {
    toast.info('Camera auto recording started');
    try {
      await api.startReplayCameraAutoRecording();
      toast.success('Camera auto recording completed');
    } catch (error: unknown) {
      console.error('Failed to start camera auto recording:', error);
      toast.error('Failed to start camera auto recording');
    }
  };

  const handleCameraRecording = async (start: boolean) => {
    try {
      if (start) {
        await api.startReplayCameraRecording();
        toast.success('Camera recording started');
      } else {
        await api.stopReplayCameraRecording();
        toast.success('Camera recording stopped');
      }
    } catch (error: unknown) {
      console.error('Failed to control camera recording:', error);
      toast.error('Failed to control camera recording');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    toast.success('Logged out');
  };

  const handleTest = async () => {
    toast.info('Testing server...');
    try {
      const response = await api.testBackend();
      setServerStatus(response.data);
      console.log(response.data);
      toast.success('Tested server');
    } catch (error: unknown) {
      console.error('Failed to test server:', error);
      toast.error('Failed to test server');
    }
  };

  const handleGetGoalCameraResult = async () => {
    const response = await api.getGoalCameraResult();
    console.log(response);
    setHitGoal(response.data.result);
    toast.success('Goal camera result fetched');
  };

  const handleArmRate100 = async () => {
    const response = await api.setArmRate100();
    console.log(response);
    toast.success('Arm rate 100');
  };

  const handleArmRateUp = async () => {
    const response = await api.setArmRateUp();
    console.log(response);
    toast.success('Arm rate up');
  };

  const handleArmRateDown = async () => {
    const response = await api.setArmRateDown();
    console.log(response);
    toast.success('Arm rate down');
  };

  const handleArmMode = async (auto: boolean) => {
    const response = await api.setArmMode(auto);
    console.log(response);
    toast.success('Arm mode set');
  };

  const handleSendArmCommand = async (command: string) => {
    if (command === '') {
      toast.error('Please enter a command');
      return;
    }
    const response = await api.sendArmCommand(command);
    console.log(response);
    if (response.status === 'success') {
      toast.success('Arm command sent', {
        description: command,
      });
      setArmCommand('');
    } else {
      toast.error('Failed to send arm command', {
        description: response.message,
      });
    }
  };

  const handleArmHit = async () => {
    const response = await api.postArmHit();
    if (response.status === 'success') {
      toast.success('Arm hit');
    } else {
      toast.error('Failed to hit');
    }
  };

  const handleResetLastHitArea = async () => {
    const response = await api.postResetLastHitArea();
    if (response.status === 'success') {
      toast.success('Last hit area reset');
    } else {
      toast.error('Failed to reset last hit area');
    }
  };

  const handleGetReplayCameraRecordingFilename = async () => {
    const response = await api.getReplayCameraRecordingFilename();
    console.log(response);
    setReplayCameraRecordingFilename(normalizeFilename(response.data.filename));
    if (response.status === 'success') {
      toast.success('Replay camera recording filename fetched');
    } else {
      toast.error('Failed to get replay camera recording filename');
    }
  };

  useEffect(() => {
    handleTest();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
              <Button className="w-full" variant="outline" onClick={() => router.push('/')}>
                Back to Game
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => handleTest()}>
          Test Server
        </Button>
        <div className="flex flex-row gap-2">
          <Button variant="outline" onClick={() => router.push('/')}>
            Back to Game
          </Button>
          <Button variant="outline" onClick={() => handleLogout()}>
            Logout
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Server Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${serverStatus.server ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Server</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${serverStatus.arm ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Arm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${serverStatus.catcher ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Catcher</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${serverStatus.goal_camera ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Goal Camera</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${serverStatus.replay_camera ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Replay Camera</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Arm Control */}
        <Card>
          <CardHeader>
            <CardTitle>Arm Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-row justify-between items-center gap-2">
              <div className="flex flex-row items-center gap-2">
                <Button onClick={() => handleArmMode(true)}>Auto Mode</Button>
                <Button onClick={() => handleArmMode(false)}>Manual Mode</Button>
              </div>
              <div className="flex flex-row items-center gap-2">
                <Button onClick={() => handleArmRateDown()}>Rate Down</Button>
                <Button onClick={() => handleArmRateUp()}>Rate Up</Button>
                <Button onClick={() => handleArmRate100()}>Rate 100</Button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((preset) => (
                <Button
                  key={preset}
                  onClick={() => handleArmPreset(preset)}
                  variant="outline"
                >
                  Preset {preset}
                </Button>
              ))}
            </div>
            <div className="flex flex-row justify-end items-center gap-2">
              <Button onClick={handleArmHit} variant="highlight" className="w-60">Hit</Button>
            </div>
            <div className="flex flex-row justify-between items-center gap-2">
              <Input className="w-full" type="text" placeholder="Enter command" value={armCommand} onChange={(e) => setArmCommand(e.target.value)} />
              <Button onClick={() => setArmCommand('')} variant="ghost">Clear</Button>
              <Button onClick={() => handleSendArmCommand(armCommand)} className="w-60">Send</Button>
            </div>
          </CardContent>
        </Card>

        {/* Catcher Control */}
        <Card>
          <CardHeader>
            <CardTitle>Catcher Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-row items-center gap-2">
                <Button onClick={handleCheckBallReady}>Check Ball Ready?</Button>
                <p>Ball Ready: <span className={`${catcherStatus ? 'text-green-500' : 'text-red-500'}`}>{catcherStatus ? 'Yes' : 'No'}</span></p>
              </div>
              <Button onClick={handleResetBall}>Reset Ball</Button>
            </div>
          </CardContent>
        </Card>

        {/* Goal Camera Control */}
        <Card>
          <CardHeader>
            <CardTitle>Goal Camera Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-row justify-between items-center">
              <div className="flex flex-row items-center gap-2">
                <Button onClick={handleGetGoalCameraResult}>Get Goal Camera Result</Button>
                <Button onClick={handleResetLastHitArea}>Reset Last Hit Area</Button>
              </div>
              <div className="p-4 rounded-lg text-center border-2 w-24">
                {hitGoal}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Replay Camera Control */}
        <Card>
          <CardHeader>
            <CardTitle>Replay Camera Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handleCameraRecording(true)}>Start Recording</Button>
              <Button onClick={() => handleCameraRecording(false)}>Stop Recording</Button>
              <Button onClick={handleCameraAutoRecording}>Start Auto Recording</Button>
              <Button onClick={handleGetReplayCameraRecordingFilename} variant="outline">Get Recording Filename</Button>
            </div>
            {replayCameraRecordingFilename && (
              <div>
                <div className="flex flex-row justify-between items-center gap-2">
                  <Button variant="outline" onClick={() => setOpenResultDialog(true)}>Show Video</Button>
                  <p>Replay Camera Recording Filename: {replayCameraRecordingFilename}</p>
                </div>
                <Result
                  open={openResultDialog}
                  setOpen={setOpenResultDialog}
                  debug={true}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div >
  );
} 