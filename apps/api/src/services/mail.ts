/**
 * Transactional email through Resend's HTTP API (docs/11-architecture-technique.md).
 * Without RESEND_API_KEY: in development the message is printed to the API console so flows can be
 * tested locally; in production sending fails loudly instead of silently dropping a security email.
 */
export interface Mail {
  to: string
  subject: string
  text: string
}

export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM
  if (!key || !from) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email is not configured (RESEND_API_KEY, MAIL_FROM)')
    console.info(`\n[mail · dev, not sent] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text }),
  })
  if (!res.ok) throw new Error(`Email provider refused the message (${res.status})`)
}
