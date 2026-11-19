/** 英文语言包；同时作为其它语言包的结构基准 */
const enUS = {
  app: {
    localMode: 'Local mode · Sign in to sync across devices',
    login: 'Sign in',
    logout: 'Sign out',
    settings: 'Settings',
    searchPlaceholder: 'Search clipboard history…',
    syncFailed: 'Failed to sync new clipboard content',
    emptyNoMatch: 'No matching items',
    emptyHint: 'Copy some text and it will appear here',
    emptyShortcut: 'Press {{accelerator}} to open anytime',
    footerShortcut: '{{accelerator}} to open',
    footerCount_one: '{{count}} item',
    footerCount_other: '{{count}} items'
  },
  filters: {
    all: 'All',
    text: 'Text',
    code: 'Code',
    link: 'Link'
  },
  clipTypes: {
    TEXT: 'Text',
    CODE: 'Code',
    IMAGE: 'Image',
    LINK: 'Link'
  },
  clip: {
    synced: 'Synced',
    localOnly: 'Local only',
    pin: 'Pin',
    unpin: 'Unpin',
    delete: 'Delete',
    pinFailed: 'Failed to pin. Please try again',
    deleteFailed: 'Failed to delete. Please try again',
    confirmDeleteTitle: 'Delete pinned item?',
    confirmDeleteDescription:
      'This cannot be undone and will be removed from the cloud and your other devices.',
    cancel: 'Cancel'
  },
  auth: {
    signInTitle: 'Sign in to ClipSync',
    signUpTitle: 'Create an account',
    description:
      'After signing in, local items sync to the cloud and update across your devices in real time.',
    signInTab: 'Sign in',
    signUpTab: 'Sign up',
    namePlaceholder: 'Name',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password (at least 8 characters)',
    submitting: 'Please wait…',
    submitSignIn: 'Sign in',
    submitSignUp: 'Sign up and sign in',
    signInSuccess: 'Signed in',
    signUpSuccess: 'Account created and signed in',
    actionFailed: 'Something went wrong',
    forgotPassword: 'Forgot password?',
    resetTitle: 'Reset password',
    resetDescription: 'Enter your account email and we will send a verification code.',
    sendCode: 'Send code',
    resendCode: 'Resend code',
    codeSent: 'If the account exists, a code has been sent',
    otpPlaceholder: '6-digit code',
    newPasswordPlaceholder: 'New password (at least 8 characters)',
    confirmPasswordPlaceholder: 'Confirm new password',
    resetSubmit: 'Reset password',
    resetSuccess: 'Password reset. Please sign in again',
    backToSignIn: 'Back to sign in',
    passwordTooShort: 'Password must be at least 8 characters',
    passwordMismatch: 'The passwords do not match'
  },
  settings: {
    title: 'Settings',
    tabs: {
      general: 'General',
      account: 'Account',
      about: 'About'
    },
    autoLaunch: {
      label: 'Launch at login',
      description: 'Start ClipSync automatically after you sign in'
    },
    shortcut: {
      label: 'Toggle shortcut',
      description: 'Show or hide the floating window from any app'
    },
    hideDelay: {
      label: 'Hide on blur',
      description: 'Collapse the floating window after it loses focus'
    },
    autoSync: {
      label: 'Auto sync',
      description: 'Upload new clipboard items to the cloud automatically'
    },
    maxClips: {
      label: 'History limit',
      description: 'Maximum number of items shown in the list'
    },
    cleanup: {
      label: 'Auto cleanup',
      description: 'Delete items unused for the selected number of days'
    },
    theme: {
      label: 'Theme',
      description: 'Switch colors; System follows your OS setting'
    },
    language: {
      label: 'Language',
      description: 'Switch the app language'
    },
    options: {
      immediate: 'Immediately',
      seconds: '{{count}}s',
      never: 'Never',
      days_one: '{{count}} day',
      days_other: '{{count}} days',
      themeSystem: 'System',
      themeLight: 'Light',
      themeDark: 'Dark',
      languageSystem: 'System',
      languageZh: '中文',
      languageEn: 'English'
    },
    shortcutCapture: {
      press: 'Press keys…',
      hint: 'Use a modifier key (⌘ / Ctrl / Alt / Shift)'
    },
    account: {
      notSignedIn: 'Not signed in',
      notSignedInDescription: 'Sign in from the floating window to see your account here.',
      nameLabel: 'Display name',
      namePlaceholder: 'Your name',
      saveName: 'Save name',
      passwordLabel: 'Change password',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password',
      savePassword: 'Update password',
      passwordMismatch: 'The new passwords do not match',
      passwordTooShort: 'Password must be at least 8 characters',
      sessionLabel: 'Signed in as',
      signOut: 'Sign out',
      deleteAccount: 'Delete account',
      deleteDescription:
        'Permanently delete your account and all cloud data, including synced items.',
      deleteConfirmTitle: 'Delete account?',
      deleteConfirmDescription:
        'This cannot be undone. All signed-in devices will lose access immediately.',
      deletePasswordPlaceholder: 'Enter your password',
      deleteConfirm: 'Delete account',
      cancel: 'Cancel',
      nameUpdated: 'Name updated',
      passwordUpdated: 'Password updated',
      signedOut: 'Signed out',
      accountDeleted: 'Account deleted',
      updateFailed: 'Failed to update the account. Please try again',
      deleteFailed: 'Failed to delete the account. Please try again',
      emailLabel: 'Email',
      newEmailPlaceholder: 'New email address',
      sendEmailCode: 'Send code',
      resendEmailCode: 'Resend code',
      emailCodeSent: 'Verification code sent to the new email',
      emailOtpPlaceholder: 'Enter the code sent to the new email',
      confirmEmailChange: 'Confirm change',
      emailChanged: 'Email updated',
      emailChangeFailed: 'Failed to change email. Please try again'
    },
    about: {
      autoUpdate: {
        label: 'Auto update',
        description: 'Check for and download updates on launch'
      },
      check: 'Check for updates',
      checking: 'Checking…',
      currentVersion: 'Current version v{{version}}',
      description: 'A local-first clipboard history tool with cross-device sync after signing in.'
    },
    update: {
      checking: 'Checking for updates…',
      available: 'New version {{version}} found, downloading…',
      availableNoVersion: 'New version found, downloading…',
      downloading: 'Downloading update… ({{percent}}%)',
      downloadingWithVersion: 'Downloading {{version}}… ({{percent}}%)',
      downloaded: 'The new version will install after you quit',
      downloadedWithVersion: 'Version {{version}} will install after you quit',
      upToDate: 'You are on the latest version',
      error: 'Failed to check for updates: {{message}}',
      errorUnknown: 'Failed to check for updates',
      unsupported: 'Update checking is not available in this build'
    },
    saveFailed: 'Failed to save settings. Please try again',
    pushPendingFailed: 'Failed to upload local items. Please try again'
  },
  errors: {
    operationFailed: 'Something went wrong. Please try again',
    signInFailed: 'Sign in failed. Check your email and password',
    signUpFailed: 'Sign up failed. Please try again',
    notSignedIn: 'Not signed in',
    requestFailed: 'Request failed ({{status}})',
    syncFailedCount_one: '{{count}} local item failed to sync. Please try again',
    syncFailedCount_other: '{{count}} local items failed to sync. Please try again',
    cloudSyncFailed: 'Cloud sync failed. Check your network and try again'
  },
  common: {
    close: 'Close'
  }
}

export default enUS
