import { useState, type SubmitEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        toast.success(t('auth.signInSuccess'))
      } else {
        await signUp(name.trim(), email.trim(), password)
        toast.success(t('auth.signUpSuccess'))
      }
      setName('')
      setEmail('')
      setPassword('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.actionFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-85">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' ? t('auth.signInTitle') : t('auth.signUpTitle')}
          </DialogTitle>
          <DialogDescription>{t('auth.description')}</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as 'login' | 'register')}>
          <TabsList className="w-full">
            <TabsTrigger value="login">{t('auth.signInTab')}</TabsTrigger>
            <TabsTrigger value="register">{t('auth.signUpTab')}</TabsTrigger>
          </TabsList>
        </Tabs>

        <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
          {mode === 'register' ? (
            <Input
              value={name}
              placeholder={t('auth.namePlaceholder')}
              autoComplete="nickname"
              required
              onChange={(event) => setName(event.target.value)}
            />
          ) : null}
          <Input
            type="email"
            value={email}
            placeholder={t('auth.emailPlaceholder')}
            autoComplete="email"
            required
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            type="password"
            value={password}
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" className="mt-1 w-full" disabled={submitting}>
            {submitting
              ? t('auth.submitting')
              : mode === 'login'
                ? t('auth.submitSignIn')
                : t('auth.submitSignUp')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
