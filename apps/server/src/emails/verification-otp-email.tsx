import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text
} from '@react-email/components'

export type OtpType = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email'

const TYPE_LABELS: Record<OtpType, { zh: string; en: string }> = {
  'sign-in': { zh: '登录', en: 'sign-in' },
  'email-verification': { zh: '邮箱验证', en: 'email verification' },
  'forget-password': { zh: '重置密码', en: 'password reset' },
  'change-email': { zh: '修改邮箱', en: 'email change' }
}

interface VerificationOtpEmailProps {
  otp: string
  type: OtpType
}

/** ClipSync 验证码邮件（中英双语），由 Resend 发送 */
export function VerificationOtpEmail({ otp, type }: VerificationOtpEmailProps) {
  const label = TYPE_LABELS[type]

  return (
    <Html lang="zh-CN">
      <Head />
      <Preview>{`ClipSync 验证码 ${otp}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>ClipSync 验证码</Heading>
          <Text style={text}>你正在进行{label.zh}验证，验证码：</Text>
          <Section style={codeBox}>
            <Text style={code}>{otp}</Text>
          </Section>
          <Text style={hint}>验证码 5 分钟内有效，请勿泄露给他人。</Text>
          <Hr style={hr} />
          <Text style={english}>
            Your ClipSync {label.en} verification code is above. It expires in 5 minutes. Never
            share it with anyone.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f7f9',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  padding: '24px 0'
}

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '480px',
  padding: '32px'
}

const heading = {
  color: '#111827',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px'
}

const text = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 16px'
}

const codeBox = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const
}

const code = {
  color: '#111827',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '28px',
  fontWeight: '700',
  letterSpacing: '6px',
  margin: '0'
}

const hint = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '12px 0 0'
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0'
}

const english = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '0'
}
