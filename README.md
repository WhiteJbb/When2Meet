# When2Meet

모두의 일정을 한번에 — 팀원들의 가능한 시간을 모아 최적의 만남 시간을 찾아주는 웹 애플리케이션입니다.

![React](https://img.shields.io/badge/React-18-61dafb?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06b6d4?logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)

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
- **방 관리** — 방 생성자만 삭제 가능 + 마지막 날짜로부터 5일 후 자동 삭제
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
| 백엔드/DB | Node.js + Express + PostgreSQL |
| 피드백 메일 | EmailJS (REST API) |
| 배포 | Docker Compose + 서버 reverse proxy |

---

## 프로젝트 구조

```
When2Work/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 자동 배포 워크플로우
├── public/
│   └── favicon.svg             # 앱 아이콘
├── server/
│   ├── index.js                # API 서버 및 정적 파일 서버
│   └── schema.sql              # PostgreSQL 스키마
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
│   │   └── api.js              # 백엔드 API 클라이언트
│   ├── utils/
│   │   └── timeUtils.js        # 슬롯 생성, 히트맵 분석, 최적 시간 탐색
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css               # Tailwind + 커스텀 컴포넌트 스타일 (CSS 변수 포함)
├── .env.example                # 환경변수 템플릿
├── .env.server.example          # 서버 환경변수 템플릿
├── docker-compose.yml            # PostgreSQL + API 실행 설정
├── Dockerfile                   # production 이미지
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
VITE_API_BASE_URL=/api
VITE_BASE_URL=/
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=when2meet
DB_USER=when2meet
DB_PASSWORD=change-this-password
VITE_EMAILJS_SERVICE_ID=YOUR_SERVICE_ID
VITE_EMAILJS_TEMPLATE_ID=YOUR_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY=YOUR_PUBLIC_KEY
```

### 4. 개발 서버 실행

터미널을 두 개 열고 API 서버와 Vite 개발 서버를 각각 실행합니다.

```bash
npm run server
```

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속합니다. Vite가 `/api` 요청을 `http://localhost:3000`으로 전달합니다.

---

## 로컬 서버 및 DB 실행

Docker Desktop을 실행한 뒤 PostgreSQL과 API 서버를 함께 시작합니다.

```bash
docker compose up -d --build
```

API 상태 확인:

```bash
curl http://localhost:3000/api/health
```

브라우저에서 `http://localhost:3000`에 접속하면 production 빌드가 실행됩니다. DB 스키마는 `server/schema.sql`을 서버 시작 시 자동으로 생성합니다. 데이터는 `when2meet-db` Docker volume에 저장됩니다.

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

## 서버 배포

서비스 주소: https://when2meet.nangman.cloud

서버에 Docker와 Docker Compose를 설치한 뒤 저장소를 받고 서버용 환경변수를 준비합니다.

```bash
cp .env.server.example .env
# .env의 DB_PASSWORD를 긴 임의 문자열로 변경
docker compose --env-file .env up -d --build
```

`deploy/nginx.conf`를 Nginx 설정에 연결하고 `when2meet.nangman.cloud`의 DNS A/AAAA 레코드를 서버로 지정합니다. HTTPS는 Let’s Encrypt 등으로 설정하고 Nginx에서 `127.0.0.1:3000`으로 reverse proxy합니다.

GitHub Actions 자동 배포를 사용하려면 다음 Secrets를 등록합니다:

| Secret 이름 | 값 |
|-------------|----|
| `DEPLOY_HOST` | 서버 호스트명 또는 IP |
| `DEPLOY_USER` | SSH 사용자 |
| `DEPLOY_PATH` | 서버의 저장소 경로 |
| `DEPLOY_SSH_KEY` | 배포용 SSH private key |

workflow는 `main`에 push될 때 서버에서 `git pull` 후 Docker 이미지를 다시 빌드합니다. 운영 DB 포트(기본 5432)는 외부에 공개하지 않고, PostgreSQL volume은 정기적으로 백업합니다.

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
   └─ 마지막 날짜로부터 5일 후 자동 삭제

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
