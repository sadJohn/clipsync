import { render } from '@react-email/render'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { env } from '../config/env.js'
import { VerificationOtpEmail, type OtpType } from '../emails/verification-otp-email.js'

const SUBJECTS: Record<OtpType, string> = {
  'sign-in': 'ClipSync 登录验证码 / Sign-in code',
  'email-verification': 'ClipSync 邮箱验证码 / Email verification code',
  'forget-password': 'ClipSync 重置密码验证码 / Password reset code',
  'change-email': 'ClipSync 修改邮箱验证码 / Change email code'
}

/** 配置了 RESEND_API_KEY 时优先用 Resend，否则回退到 SMTP */
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    })
  : null

export async function sendVerificationOTP(data: {
  email: string
  otp: string
  type: OtpType
}): Promise<void> {
  const html = await render(VerificationOtpEmail({ otp: data.otp, type: data.type }))
  const subject = SUBJECTS[data.type]

  if (resend) {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM ?? 'ClipSync <onboarding@resend.dev>',
      to: data.email,
      subject,
      html
    })
    if (error) {
      throw new Error(`[ClipSync] 验证码邮件发送失败（Resend）：${error.message}`)
    }
    return
  }

  if (transporter) {
    if (!env.EMAIL_FROM) {
      throw new Error('[ClipSync] 使用 SMTP 时必须配置 EMAIL_FROM')
    }
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: data.email,
      subject,
      html
    })
    return
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('[ClipSync] 未配置 RESEND_API_KEY 或 SMTP，无法发送验证码邮件')
  }
  console.warn(
    `[ClipSync] 未配置邮件服务，${data.type} 验证码（仅本地调试）：${data.email} -> ${data.otp}`
  )
}
