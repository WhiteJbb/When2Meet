import { CalendarDays, Link2, CheckCircle2, MessageCircle, ArrowRight, Shield } from 'lucide-react'

export default function WelcomePage({ onLogin, onGuest }) {
  const STEPS = [
    {
      icon: CalendarDays,
      title: '방 만들기',
      desc: '회의 제목, 날짜와 시간 범위만 설정해 간편하게 약속의 방을 개설해요.'
    },
    {
      icon: Link2,
      title: '링크 공유',
      desc: '생성된 고유 링크를 단톡방에 올리면 준비 끝! 팀원들을 초대하세요.'
    },
    {
      icon: CheckCircle2,
      title: '결과 확인',
      desc: '모두가 가능한 최적의 골든 타임을 스마트 히트맵으로 한눈에 파악해요.'
    }
  ]

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden bg-[#fafafa] dark:bg-[#0c0c0e] py-12">
      {/* ── 배경 디자인 시스템 ── */}
      {/* 1. 은은한 백그라운드 격자 패턴 */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* 2. 네온 오라 볼 (Blur Orb) */}
      <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.12] dark:opacity-[0.08] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0ecfb0 0%, #3b82f6 50%, transparent 100%)' }}
      />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.08] dark:opacity-[0.06] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00f2fe 0%, #4facfe 70%, transparent 100%)' }}
      />

      {/* ── 메인 콘텐츠 ── */}
      <div className="max-w-4xl w-full text-center relative z-10 space-y-12">
        
        {/* 서비스 타이포그래피 헤더 */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#e8faf5] dark:bg-[#0c2420] text-[#0ecfb0] dark:text-[#0ecfb0] border border-[#a8f2e4]/30 dark:border-[#1a4a44]/30 animate-fade-in shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0ecfb0] animate-ping" />
            초간단 팀 일정 조율
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-[#111] dark:text-white">
            약속 잡기를<br className="sm:hidden" />
            <span className="bg-gradient-to-r from-[#0ecfb0] via-[#05dcb8] to-[#02967e] bg-clip-text text-transparent drop-shadow-sm">
              더 쉽고 안전하게
            </span>
          </h1>
          <p className="text-sm sm:text-base font-medium text-[#888] dark:text-[#999] max-w-lg mx-auto leading-relaxed">
            카카오 1초 로그인으로 나와 팀원들의 조율 일정을 클라우드에 평생 동기화하세요. 로컬스토리지가 날아가도 데이터 유실 걱정이 없습니다.
          </p>
        </div>

        {/* ── 글래스모피즘 3D 카드 메인박스 ── */}
        <div className="card max-w-[440px] w-full mx-auto border border-white/20 dark:border-white/[0.04] shadow-2xl relative overflow-hidden backdrop-blur-2xl bg-white/70 dark:bg-[#15151a]/70 p-8 sm:p-10 rounded-[32px]">
          {/* 상단 얇은 컬러바 */}
          <div className="absolute top-0 left-0 w-full h-[4px]" style={{ background: 'linear-gradient(90deg, #a8f2e4 0%, #0ecfb0 50%, #08b094 100%)' }} />
          
          {/* 일정 조율 컨셉 추상화 SVG 그래픽 (히트맵 매칭 형상화) */}
          <div className="flex justify-center mb-6 select-none pointer-events-none">
            <svg className="w-36 h-20" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* 타임 슬롯 배경 그리드 */}
              <rect x="10" y="10" width="28" height="20" rx="6" fill="#0ecfb0" fillOpacity="0.08" className="dark:fill-white/5" />
              <rect x="42" y="10" width="28" height="20" rx="6" fill="#0ecfb0" fillOpacity="0.15" />
              <rect x="74" y="10" width="28" height="20" rx="6" fill="#0ecfb0" fillOpacity="0.4" />
              <rect x="106" y="10" width="28" height="20" rx="6" fill="#0ecfb0" fillOpacity="0.08" className="dark:fill-white/5" />
              
              <rect x="10" y="34" width="28" height="20" rx="6" fill="#0ecfb0" fillOpacity="0.6" />
              <rect x="42" y="34" width="28" height="20" rx="6" fill="#0ecfb0" fillOpacity="0.9" />
              <rect x="74" y="34" width="28" height="20" rx="6" fill="#0ecfb0" fillOpacity="0.3" />
              <rect x="106" y="34" width="28" height="20" rx="6" fill="#0ecfb0" fillOpacity="0.6" />

              {/* 매칭 골든 타임 (스타 추천 표시) */}
              <circle cx="56" cy="44" r="16" fill="white" className="dark:fill-[#202028]" filter="url(#glow)" />
              <circle cx="56" cy="44" r="12" fill="#0ecfb0" />
              <path d="M56 39L57.5 42.5H61L58.2 44.5L59.3 48L56 46L52.7 48L53.8 44.5L51 42.5H54.5L56 39Z" fill="white" />
              
              <defs>
                <filter id="glow" x="36" y="24" width="40" height="40" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
            </svg>
          </div>

          <div className="space-y-6">
            {/* 카카오 로그인 버튼 (그림자 및 트랜지션 극대화) */}
            <button
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-extrabold text-sm text-[#3C1E1E] bg-[#FEE500] hover:bg-[#FADA0A] active:scale-[0.97] transition-all shadow-[0_8px_24px_rgba(254,229,0,0.25)] hover:shadow-[0_12px_28px_rgba(254,229,0,0.35)]"
            >
              <MessageCircle className="w-5 h-5 fill-[#3C1E1E] text-transparent" />
              카카오로 1초 만에 시작하기
            </button>

            {/* 구분선 */}
            <div className="relative flex items-center justify-center py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#eee] dark:border-[#222]" />
              </div>
              <span className="relative z-10 px-4 text-xs font-bold text-[#bbb] dark:text-[#555] bg-white dark:bg-[#15151a] rounded-full">또는</span>
            </div>

            {/* 게스트 모드 진입 버튼 (유리 질감 보더라인) */}
            <button
              onClick={onGuest}
              className="group w-full py-4 px-6 rounded-2xl font-bold text-sm text-[#555] dark:text-[#bbb] border border-[#e2e2e9] dark:border-[#2b2b35] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              게스트로 시작하기
              <ArrowRight className="w-4 h-4 text-[#888] dark:text-[#aaa] group-hover:translate-x-1 transition-transform duration-200" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#aaa]">
              <Shield className="w-3.5 h-3.5 text-[#aaa]" />
              언제든 로그인하여 동기화할 수 있어요.
            </div>
          </div>
        </div>

        {/* ── 하단 기능 소개 카드 섹션 ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-6 max-w-4xl mx-auto">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="card p-6 border border-[#f0f0f5] dark:border-[#1d1d23] hover:border-[#a8f2e4] dark:hover:border-[#1a4a44]/50 shadow-md transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg bg-white/90 dark:bg-[#18181f]/90"
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 bg-[#edfdf8] dark:bg-[#0c2420] border border-[#a8f2e4]/30 dark:border-[#1a4a44]/30">
                <s.icon className="w-5 h-5 text-[#0ecfb0] dark:text-[#0ab8a0]" />
              </div>
              <h3 className="font-extrabold text-base mb-2 text-[#111] dark:text-[#e4e4e7]">{s.title}</h3>
              <p className="text-xs font-semibold text-[#888] dark:text-[#8c8c9e] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  )
}
