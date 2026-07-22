import React from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'

const Warning = ({ open }: { open: boolean }) => {
  return (
    <Dialog open={open}>
      <DialogContent className="min-w-[1280px] min-h-[720px]">
        <DialogTitle className="hidden">系統錯誤</DialogTitle>
        <div className="flex flex-col items-center justify-center w-full h-full gap-40">
          <div className="text-2xl font-bold text-center">
            <div>系統錯誤，請聯繫工作人員</div>
            <div className="text-md mt-1">System error, please contact the staff</div>
          </div>
          <Button onClick={() => {
            window.location.reload()
          }}>
            <div>重新連線 Reload</div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default Warning