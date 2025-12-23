import { mkdir, stat } from 'node:fs/promises'

export async function ensureDir(path: string): Promise<void> {
  try {
    const info = await stat(path)
    if (!info.isDirectory()) {
      throw new Error(`Path exists and is not a directory: ${path}`)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
    await mkdir(path, { recursive: true })
  }
}
