import React from 'react'
import Image from 'next/image'

const Info = () => {
  return (
    <div className="text-xl font-bold px-4 py-2 rounded-lg absolute right-2 bottom-2 text-white flex items-center gap-2 text-left">
      <Image src="/tap.png" alt="tap" width={24} height={24} className="mr-1" />
      <div className="flex flex-col">
        <div>拖曳畫面調整視角</div>
        <div className="text-sm">Drag to adjust the viewing angle</div>
      </div>
    </div>
  )
}

export default Info