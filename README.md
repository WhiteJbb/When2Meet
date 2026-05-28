# When2Work

모두의 일정을 한번에 — 팀원들의 가능한 시간을 모아 최적의 만남 시간을 찾아주는 웹 애플리케이션입니다.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06b6d4?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-free-3ecf8e?logo=supabase)

---

## 주요 기능

- **방 생성** — 제목, 날짜 범위(최대 30일), 시간 범위(00:00~24:00)를 설정하고 고유 링크 생성
  - 일수 선택 모드: 1~30일 드롭다운 선택
  - 기간 선택 모드: 시작일/종료일 직접 선택
  - 빠른 선택: 1주/2주/3주/4주 원클릭
  - 날짜 미리보기: 요일에 맞춰 7칸 그리드로 배치 (토요일 파란색, 일요일 빨간색)
- **사각형 범위 선택** — 드래그로 시작점과 끝점 사이의 모든 시간 선택 (30분 단위)
  - 단일 셀 클릭으로 토글 가능
  - 드래그 중 자동 스크롤 지원
  - 선택 상태 자동 저장 (새로고침 유지)
- **스마트 그리드** — 날짜 헤더와 시간 컬럼이 스크롤 시에도 고정
  - 스타일링된 스크롤바로 직관적인 네비게이션
  - 토요일(파란색), 일요일(빨간색), 평일(기본색) 구분 표시
- **최근 일정** — 최근 방문한 방 목록 표시 (최대 5개)
  - 방 제목으로 표시되어 쉽게 재방문 가능
  - PC: 홈 화면 왼쪽 하단에 최근 3개 표시
  - 모바일: 별도 섹션으로 최대 5개 표시
- **히트맵 결과** — 참여자가 많을수록 진한 색으로 표시되는 시각화 그리드
- **스마트 추천** — 겹치는 시간대를 분석하여 최적의 시간 자동 추천 (★ 표시)
- **사용법 튜토리얼** — 방 첫 방문 시 자동 표시되는 가이드 팝업
  - 드래그 선택, 캘린더 이동, 저장 방법 안내
  - "다시 보지 않기" 옵션 제공
- **인앱 피드백** — 개선사항·버그 제보를 앱 내에서 바로 전송 (EmailJS)
- **방 관리** — 방 생성자만 삭제 가능 + 10일 후 자동 삭제
  - 방 생성 시 생성자 토큰 저장
  - 삭제 버튼은 생성자에게만 표시
  - 삭제 확인 모달로 실수 방지
- **다크/라이트 모드** — 수동 전환, localStorage 유지
- **반응형 디자인** — 모바일 우선 + PC 2열 레이아웃 대응

---

## 기술 스택

| 역할 | 라이브러리 |
|------|-----------|
| UI 프레임워크 | React 18 + Vite 5 |
| 스타일링 | Tailwind CSS v3 |
| 아이콘 | Lucide React |
| 라우팅 | React Router v6 (HashRouter) |
| 백엔드/DB | Supabase (무료 티어) |
| 피드백 메일 | EmailJS (REST API) |
| 배포 | GitHub Pages + GitHub Actions |

---

## 프로젝트 구조

```
When2Work/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 자동 배포 워크플로우
├── public/
│   ├── favicon.svg             # 앱 아이콘
│   └── CNAME                   # 커스텀 도메인 설정 (선택)
├── src/
│   ├── components/
│   │   ├── CreateRoom.jsx      # 방 생성 페이지
│   │   ├── RoomPage.jsx        # 방 메인 페이지 (시간 입력 / 결과 탭)
│   │   ├── TimeGrid.jsx        # 드래그 선택 그리드 + 히트맵
│   │   ├── ResultsView.jsx     # 히트맵 결과 + 추천 시간대 카드
│   │   ├── FeedbackModal.jsx   # 인앱 피드백 모달 (EmailJS)
│   │   ├── DatePicker.jsx      # 날짜 선택 컴포넌트
│   │   └── Layout.jsx          # 공통 네비게이션 (PC 상단바 / 모바일 탭바)
│   ├── context/
│   │   └── ThemeContext.jsx    # 다크/라이트 테마 전역 상태
│   ├── lib/
│   │   └── supabase.js         # Supabase 클라이언트
│   ├── utils/
│   │   └── timeUtils.js        # 슬롯 생성, 히트맵 분석, 최적 시간 탐색
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css               # Tailwind + 커스텀 컴포넌트 스타일 (CSS 변수 포함)
├── .env.example                # 환경변수 템플릿
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 로컬 개발 환경 설정

### 1. Node.js 설치

[nodejs.org](https://nodejs.org) → **LTS** 버전 설치 (npm 포함)

```bash
node -v  # 설치 확인
npm -v
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경변수 설정

`.env.example`을 복사해 `.env` 파일을 만들고 실제 값을 입력합니다:

**Mac/Linux**
```bash
cp .env.example .env
```

**Windows**
```bash
copy .env.example .env
```

`.env` 파일 내용:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_BASE_URL=/
VITE_EMAILJS_SERVICE_ID=YOUR_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID=YOUR_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY=YOUR_PUBLIC_KEY
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

---

## Supabase 설정

> Supabase 없이는 방 생성/데이터 저장이 동작하지 않습니다. 무료 티어로 충분합니다.

### 1. 프로젝트 생성

[supabase.com](https://supabase.com) → **New Project** 생성

### 2. 테이블 생성

Supabase 대시보드 → **SQL Editor** → 아래 쿼리 실행:

```sql
-- 방 테이블
create table rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  dates text[] not null,
  time_start integer not null default 9,
  time_end integer not null default 21,
  created_at timestamptz default now()
);

-- 참여자 가능 시간 테이블
create table availability (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  name text not null,
  slots text[] not null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 사용자 프로필 테이블 (소셜 로그인용 백업 데이터)
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  recent_rooms jsonb not null default '[]'::jsonb,
  owned_rooms jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- Row Level Security (공개 읽기/쓰기 허용)
alter table rooms enable row level security;
alter table availability enable row level security;
alter table user_profiles enable row level security;

create policy "public read rooms"            on rooms        for select using (true);
create policy "public insert rooms"          on rooms        for insert with check (true);
create policy "public delete rooms"          on rooms        for delete using (true);
create policy "public read availability"     on availability for select using (true);
create policy "public insert availability"   on availability for insert with check (true);
create policy "public update availability"   on availability for update using (true);
create policy "public read user_profiles"     on user_profiles for select using (true);
create policy "public insert user_profiles"   on user_profiles for insert with check (auth.uid() = id);
create policy "public update user_profiles"   on user_profiles for update using (auth.uid() = id);

-- 10일 지난 방 자동 삭제 함수
create or replace function delete_old_rooms()
returns void language plpgsql security definer as $$
begin
  delete from rooms where created_at < now() - interval '10 days';
end;
$$;
```

### 3. Cron Job 설정 (자동 삭제)

Supabase 대시보드 → **Database → Extensions**에서 `pg_cron` 활성화 후 실행:

```sql
select cron.schedule(
  'delete-old-rooms',
  '0 0 * * *',
  $$select delete_old_rooms();$$
);
```

### 4. API 키 확인

**Project Settings → API** 메뉴에서 복사:

| 항목 | 복사할 값 |
|------|---------|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | `anon` `public` 키 |

---

## EmailJS 설정 (피드백 기능)

### 1. 계정 및 서비스 생성

[emailjs.com](https://emailjs.com) → 회원가입 → **Email Services**에서 Gmail 등 연결

### 2. 템플릿 생성

**Email Templates → Create New Template** 후 아래 변수 사용:

| 변수 | 내용 |
|------|------|
| `{{feedback_type}}` | 피드백 유형 (개선사항 / 버그 제보 / 기타) |
| `{{feedback_message}}` | 피드백 내용 |
| `{{contact}}` | 연락처 (선택 입력) |

### 3. API 키 확인

**Account → General**에서 Public Key 복사 후 `.env`에 입력

---

## GitHub Pages 배포

### 1. GitHub Secrets 등록

레포지토리 → **Settings → Secrets and variables → Actions**:

| Secret 이름 | 값 |
|-------------|----|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_EMAILJS_SERVICE_ID` | EmailJS Service ID |
| `VITE_EMAILJS_TEMPLATE_ID` | EmailJS Template ID |
| `VITE_EMAILJS_PUBLIC_KEY` | EmailJS Public Key |

### 2. GitHub Pages 활성화

레포지토리 → **Settings → Pages → Source** → **GitHub Actions** 선택

이후 `main` 브랜치에 push할 때마다 자동 배포됩니다.

### 3. 레포 이름이 `When2Work`가 아닌 경우

`.github/workflows/deploy.yml`의 `VITE_BASE_URL` 값을 수정합니다:

```yaml
VITE_BASE_URL: /your-repo-name/
```

---

## 사용 흐름

```
1. 방 만들기
   └─ 제목, 날짜 범위(~30일), 시간 범위(00:00~24:00) 설정 → 방 생성
   └─ 일수 선택 또는 기간 선택 모드 중 선택
   └─ 빠른 선택 버튼으로 1주/2주/3주/4주 원클릭
   └─ 날짜 미리보기에서 선택된 날짜 확인 (요일별 색상 구분)

2. 링크 공유
   └─ 링크 복사 버튼으로 팀원들에게 전달

3. 각자 시간 입력
   └─ 첫 방문 시 사용법 튜토리얼 자동 표시
   └─ 이름 입력 → 드래그로 사각형 영역 선택 → 저장
   └─ 단일 셀 클릭으로 개별 토글 가능
   └─ 초기화 버튼으로 재선택 가능
   └─ 선택 상태는 자동 저장 (새로고침해도 유지)
   └─ 캘린더 이동: 날짜/시간 표시 부분이나 여백 드래그

4. 결과 확인
   └─ "결과 보기" 탭에서 히트맵 확인
   └─ 스마트 추천 시간대 카드 (★ = 최적 시간)
   └─ 참여자 수와 응답 현황 확인

5. 방 관리
   └─ 방 생성자만 삭제 버튼 표시
   └─ 삭제 확인 모달로 실수 방지
   └─ 10일 후 자동 삭제

6. 최근 일정
   └─ 홈 화면에서 최근 방문한 방 목록 확인
   └─ 방 제목 클릭으로 빠른 재방문
```

---

## 개발 명령어

```bash
npm run dev      # 개발 서버 (localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

---

## 라이선스

MIT
