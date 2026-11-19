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

type Mode = 'login' | 'register' | 'reset'

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { t } = useTranslation()
  const signIn = useAuthStore((state) => state.signIn)
  const signUp = useAuthStore((state) => state.signUp)
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset)
  const resetPassword = useAuthStore((state) => state.resetPassword)

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)

  const switchMode = (next: Mode): void => {
    setMode(next)
    setPassword('')
    setConfirmPassword('')
    setOtp('')
    setOtpSent(false)
  }

  const handleSendCode = async (): Promise<void> => {
    if (!email.trim() || sendingCode) return

    setSendingCode(true)
    try {
      await requestPasswordReset(email.trim())
      setOtpSent(true)
      toast.success(t('auth.codeSent'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.actionFailed'))
    } finally {
      setSendingCode(false)
    }
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting) return

    if (mode === 'reset') {
      if (!otpSent) return
      if (password.length < 8) {
        toast.error(t('auth.passwordTooShort'))
        return
      }
      if (password !== confirmPassword) {
        toast.error(t('auth.passwordMismatch'))
        return
      }
    }

    setSubmitting(true)
    try {
      if (mode === 'reset') {
        await resetPassword(email.trim(), otp.trim(), password)
        toast.success(t('auth.resetSuccess'))
        switchMode('login')
      } else if (mode === 'login') {
        await signIn(email.trim(), password)
        toast.success(t('auth.signInSuccess'))
      } else {
        await signUp(name.trim(), email.trim(), password)
        toast.success(t('auth.signUpSuccess'))
      }

      if (mode !== 'reset') {
        setName('')
        setEmail('')
        setPassword('')
        onOpenChange(false)
      }
      setPassword('')
      setConfirmPassword('')
      setOtp('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth.actionFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    mode === 'reset'
      ? t('auth.resetTitle')
      : mode === 'login'
        ? t('auth.signInTitle')
        : t('auth.signUpTitle')

  const description = mode === 'reset' ? t('auth.resetDescription') : t('auth.description')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) switchMode('login')
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-85">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {mode !== 'reset' ? (
          <Tabs value={mode} onValueChange={(value) => switchMode(value as 'login' | 'register')}>
            <TabsList className="w-full">
              <TabsTrigger value="login">{t('auth.signInTab')}</TabsTrigger>
              <TabsTrigger value="register">{t('auth.signUpTab')}</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

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

          {mode === 'reset' ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  required
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={sendingCode || !email.trim()}
                  onClick={() => void handleSendCode()}
                >
                  {otpSent ? t('auth.resendCode') : t('auth.sendCode')}
                </Button>
              </div>
              {otpSent ? (
                <>
                  <Input
                    value={otp}
                    placeholder={t('auth.otpPlaceholder')}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    onChange={(event) => setOtp(event.target.value)}
                  />
                  <Input
                    type="password"
                    value={password}
                    placeholder={t('auth.newPasswordPlaceholder')}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <Input
                    type="password"
                    value={confirmPassword}
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <Button type="submit" className="mt-1 w-full" disabled={submitting}>
                    {submitting ? t('auth.submitting') : t('auth.resetSubmit')}
                  </Button>
                </>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={() => switchMode('login')}>
                {t('auth.backToSignIn')}
              </Button>
            </>
          ) : (
            <>
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
              {mode === 'login' ? (
                <button
                  type="button"
                  className="self-end text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                  onClick={() => switchMode('reset')}
                >
                  {t('auth.forgotPassword')}
                </button>
              ) : null}
              <Button type="submit" className="mt-1 w-full" disabled={submitting}>
                {submitting
                  ? t('auth.submitting')
                  : mode === 'login'
                    ? t('auth.submitSignIn')
                    : t('auth.submitSignUp')}
              </Button>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
