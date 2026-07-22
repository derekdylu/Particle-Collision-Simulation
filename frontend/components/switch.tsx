import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const triggerClassName = "w-full h-full rounded-2xl data-[state=active]:border-2 data-[state=active]:border-blue-300 data-[state=active]:bg-blue-300/70 data-[state=active]:backdrop-blur-sm shadow-4xl text-3xl text-white font-bold"

const Switch = ({ onValueChange, value, disabled }: { onValueChange: (value: string) => void, value: string, disabled: boolean }) => {
  return (
    <Tabs defaultValue="h+0" value={value} onValueChange={onValueChange} className="flex flex-col items-end absolute top-1/3 right-5 -translate-y-1/3 z-10 ">
      <Label text="選手請選擇 b 值" englishText="Player, please select the b value" />
      <TabsList
        className={cn("w-[200px] h-[600px] flex flex-col justify-center items-center p-2 rounded-3xl bg-slate-400/40 backdrop-blur-md shadow-lg border border-slate-100/50", disabled && "opacity-50")}
      >
        <TabsTrigger value="1" className={triggerClassName}>+3</TabsTrigger>
        <TabsTrigger value="2" className={triggerClassName}>+2</TabsTrigger>
        <TabsTrigger value="3" className={triggerClassName}>+1</TabsTrigger>
        <TabsTrigger value="4" className={triggerClassName}>0</TabsTrigger>
        <TabsTrigger value="5" className={triggerClassName}>-1</TabsTrigger>
        <TabsTrigger value="6" className={triggerClassName}>-2</TabsTrigger>
        <TabsTrigger value="7" className={triggerClassName}>-3</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export default Switch

export const Label = ({ text, englishText }: { text: string, englishText: string }) => {
  return (
    <div className="text-white font-bold px-3 py-1 bg-gray-400 rounded-xl w-fit self-center text-xl text-center">
      {text}
      <div className="text-sm mt-1 text-center">{englishText}</div>
    </div>
  )
}