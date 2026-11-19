import { Loader2 } from 'lucide-react'
import { useEffect, useState, type SubmitEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth-store'

/** 设置页「账号」Tab：改昵称、改密码、退出登录、删除账号 */
export function AccountSettings() {
  const { t } = useTranslation()
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const init = useAuthStore((state) => state.init)
  const signOut = useAuthStore((state) => state.signOut)
  const updateName = useAuthStore((state) => state.updateName)
  const changePassword = useAuthStore((state) => state.changePassword)
  const deleteAccount = useAuthStore((state) => state.deleteAccount)

  const [savingName, setSavingName] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    void init()
  }, [init])

  async function handleNameSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const form = event.currentTarget
    const nextName = String(new FormData(form).get('name') ?? '').trim()
    if (!user || !nextName || nextName === user.name) return

    setSavingName(true)
    try {
      await updateName(nextName)
      toast.success(t('settings.account.nameUpdated'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.account.updateFailed'))
    } finally {
      setSavingName(false)
    }
  }

  async function handlePasswordSubmit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError(t('settings.account.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.account.passwordMismatch'))
      return
    }

    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success(t('settings.account.passwordUpdated'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.account.updateFailed'))
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleSignOut(): Promise<void> {
    await signOut()
    toast.success(t('settings.account.signedOut'))
  }

  async function handleDelete(): Promise<void> {
    if (!deletePassword) return

    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteAccount(deletePassword)
      setDeleteOpen(false)
      setDeletePassword('')
      toast.success(t('settings.account.accountDeleted'))
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : t('settings.account.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <section className="rounded-lg border border-border/60 bg-card/40 p-4">
        <p className="text-xs font-medium">{t('settings.account.notSignedIn')}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t('settings.account.notSignedInDescription')}
        </p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-lg border border-border/60 bg-card/40 p-4">
        <p className="text-xs font-medium">{user.name}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{user.email}</p>
        <form
          className="mt-3 flex items-center gap-2"
          onSubmit={(event) => void handleNameSubmit(event)}
        >
          <Input
            name="name"
            defaultValue={user.name}
            placeholder={t('settings.account.namePlaceholder')}
            aria-label={t('settings.account.nameLabel')}
            maxLength={40}
            required
          />
          <Button type="submit" size="sm" disabled={savingName}>
            {t('settings.account.saveName')}
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-border/60 bg-card/40 p-4">
        <p className="text-xs font-medium">{t('settings.account.passwordLabel')}</p>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => void handlePasswordSubmit(event)}
        >
          <Input
            type="password"
            value={currentPassword}
            placeholder={t('settings.account.currentPassword')}
            autoComplete="current-password"
            required
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            type="password"
            value={newPassword}
            placeholder={t('settings.account.newPassword')}
            autoComplete="new-password"
            minLength={8}
            required
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Input
            type="password"
            value={confirmPassword}
            placeholder={t('settings.account.confirmPassword')}
            autoComplete="new-password"
            minLength={8}
            required
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {passwordError ? <p className="text-[11px] text-destructive">{passwordError}</p> : null}
          <Button
            type="submit"
            size="sm"
            className="self-end"
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {t('settings.account.savePassword')}
          </Button>
        </form>
      </section>

      <section className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/40 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium">{t('settings.account.sessionLabel')}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{user.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
          {t('settings.account.signOut')}
        </Button>
      </section>

      <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <p className="text-xs font-medium">{t('settings.account.deleteAccount')}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t('settings.account.deleteDescription')}
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
          onClick={() => setDeleteOpen(true)}
        >
          {t('settings.account.deleteAccount')}
        </Button>
      </section>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) {
            setDeletePassword('')
            setDeleteError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.account.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('settings.account.deleteConfirmDescription')}</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
          >
            <Input
              type="password"
              value={deletePassword}
              placeholder={t('settings.account.deletePasswordPlaceholder')}
              autoComplete="current-password"
              required
              onChange={(event) => setDeletePassword(event.target.value)}
            />
            {deleteError ? <p className="text-[11px] text-destructive">{deleteError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                {t('settings.account.cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={deleting || !deletePassword}>
                {t('settings.account.deleteConfirm')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
