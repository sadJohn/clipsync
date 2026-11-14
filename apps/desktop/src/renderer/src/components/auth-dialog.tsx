import { useState, type SubmitEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/auth-store'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const signIn = useAuthStore((state) => state.signIn)
  const signUp = useAuthStore((state) => state.signUp)

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
        toast.success('登录成功')
      } else {
        await signUp(name.trim(), email.trim(), password)
        toast.success('注册成功，已自动登录')
      }
      setName('')
      setEmail('')
      setPassword('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-85">
        <DialogHeader>
          <DialogTitle>{mode === 'login' ? '登录 ClipSync' : '创建账号'}</DialogTitle>
          <DialogDescription>
            登录后本地记录会自动同步到云端，并在多台设备间实时推送。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as 'login' | 'register')}>
          <TabsList className="w-full">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>
        </Tabs>

        <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
          {mode === 'register' ? (
            <Input
              value={name}
              placeholder="昵称"
              autoComplete="nickname"
              required
              onChange={(event) => setName(event.target.value)}
            />
          ) : null}
          <Input
            type="email"
            value={email}
            placeholder="邮箱"
            autoComplete="email"
            required
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            value={password}
            placeholder="密码（至少 8 位）"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" className="mt-1 w-full" disabled={submitting}>
            {submitting ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
