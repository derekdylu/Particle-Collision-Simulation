import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function playSound(sound: string) {
  const audio = new Audio(sound)
  audio.play()
}

export function normalizeFilename(filename: string) {
  const publicIndex = filename.indexOf('public/');
  const normalizedFilename = publicIndex !== -1 ? filename.substring(publicIndex + 7) : filename;
  return normalizedFilename.replace(/\\/g, '/');
}
