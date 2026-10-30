import { useState } from 'react'
import { X, AlertCircle, Lightbulb, Bug, MessageCircle, CheckCircle2, Send, FileText, Mail } from 'lucide-react'

const EMAILJS_SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const TYPES = [
  { label: '개선사항', value: '개선사항', icon: Lightbulb },
  { label: '버그 제보', value: '버그 제보', icon: Bug },
  { label: '기타',     value: '기타',     icon: MessageCircle },
]

export default function FeedbackModal({ onClose }) {
  const [form, setForm] = useState({ type: '개선사항', message: '', contact: '' })
  const [status, setStatus] = useState('idle')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.message.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY,
          template_params: { feedback_type: form.type, feedback_message: form.message, contact: form.contact || '(미입력)' },
        }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch { setStatus('error') }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0" style={{ background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)' }} onClick={onClose}/>

      <div className="relative w-full sm:max-w-md bg-white dark:bg-[#232329] p-6 pb-24 sm:pb-6 modal-sheet"
        style={{ boxShadow:'0 -4px 32px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' }}
      >
        {/* 핸들 */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full sm:hidden bg-[#e4e4ec] dark:bg-[#3a3a45]" />

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-extrabold text-lg flex items-center gap-2 text-[#111] dark:text-[#e4e4e7]">
            <MessageCircle className="w-5 h-5 text-[#0066cc] dark:text-[#80bbff]" /> 의견 보내기
          </p>
          <button aria-label="닫기" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center active:scale-90 transition-all bg-[#f0f0f5] dark:bg-[#2c2c35] border border-[#e4e4ec] dark:border-[#3a3a45]"
            style={{ borderRadius:'999px' }}
          >
            <X className="w-4 h-4 text-[#888] dark:text-[#b3aabe]"/>
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-14 h-14 text-[#0066cc] dark:text-[#80bbff]" />
            <p className="font-extrabold text-lg text-[#111] dark:text-[#e4e4e7]">전송 완료!</p>
            <p className="text-sm font-medium text-[#999] dark:text-[#b3aabe]">소중한 의견 감사합니다. 검토 후 반영할게요.</p>
            <button aria-label="닫기" onClick={onClose} className="btn-primary mt-3 px-10">닫기</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 유형 */}
            <div className="flex gap-2">
              {TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setForm(f => ({...f, type: t.value}))}
                  className={`flex-1 py-2.5 text-sm font-extrabold transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                    form.type === t.value
                      ? 'text-white'
                      : 'bg-[#f0f0f5] dark:bg-[#2c2c35] text-[#888] dark:text-[#b3aabe] border-2 border-[#e4e4ec] dark:border-[#3a3a45]'
                  }`}
                  style={form.type === t.value ? {
                    borderRadius:'999px', background:'var(--brand)',
                    boxShadow:'0 4px 12px var(--brand-shadow)', border:'2px solid transparent',
                  } : { borderRadius:'999px' }}
                >
                  {t.icon && <t.icon className="w-3.5 h-3.5" />}
                  {t.label}
                </button>
              ))}
            </div>

            {/* 내용 */}
            <div>
              <label htmlFor="feedback-message" className="label flex items-center gap-1"><FileText className="w-3 h-3" /> 내용 <span className="text-[#e11d48]">*</span></label>
              <textarea id="feedback-message" className="input resize-none" rows={4}
                placeholder="어떤 점이 불편하셨나요? 자유롭게 적어주세요."
                value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} maxLength={1000}
              />
              <p className="text-right text-xs font-semibold mt-1 text-[#7b7488] dark:text-[#b3aabe]">{form.message.length}/1000</p>
            </div>

            {/* 연락처 */}
            <div>
              <label htmlFor="feedback-contact" className="label flex items-center gap-1"><Mail className="w-3 h-3" /> 연락처 <span className="normal-case font-medium text-[#7b7488] dark:text-[#b3aabe]">(선택)</span></label>
              <input id="feedback-contact" type="text" className="input" placeholder="이메일 또는 연락처"
                value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))}
              />
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold bg-[#fff1f2] dark:bg-[#2d1a1d] text-[#e11d48] border border-[#fecdd3] dark:border-[#4a2028]"
                style={{ borderRadius:'999px' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0"/> 전송에 실패했습니다. 다시 시도해주세요.
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-4"
              disabled={status === 'sending' || !form.message.trim()}
            >
              {status === 'sending' ? '전송 중...' : <><Send className="w-4 h-4" /> 제출하기</>}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
