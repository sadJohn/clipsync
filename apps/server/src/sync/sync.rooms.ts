/**
 * 同一账号的所有在线设备加入同一房间，广播时按 userId 隔离。
 */
export function userRoom(userId: string): string {
  return `user:${userId}`
}
