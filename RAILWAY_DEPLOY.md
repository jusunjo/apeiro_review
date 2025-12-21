# Railway 배포 가이드

## Railway에 배포하기

### 1. Railway 계정 생성 및 프로젝트 생성
1. [Railway](https://railway.app)에 접속
2. GitHub 계정으로 로그인
3. "New Project" 클릭
4. "Deploy from GitHub repo" 선택
5. `jusunjo/apeiro_review` 저장소 선택

### 2. 자동 배포
Railway가 자동으로:
- `package.json`을 감지
- `npm install` 실행
- `npm run build` 실행 (railway.json에 정의됨)
- `npm start` 실행

### 3. 환경 변수 (필요시)
Railway 대시보드 → Variables 탭에서 환경 변수 추가 가능
- 현재는 특별한 환경 변수가 필요 없음

### 4. 도메인 설정
Railway 대시보드 → Settings → Domains에서 커스텀 도메인 또는 Railway 제공 도메인 사용 가능

## 프로젝트 구조

- **빌드**: `npm run build` - React 앱을 `dist` 폴더에 빌드
- **실행**: `npm start` - Express 서버가 API 프록시와 정적 파일 서빙을 모두 처리
- **포트**: Railway가 제공하는 `PORT` 환경 변수 사용 (기본값: 3001)

## 주요 파일

- `server/index.js` - Express 서버 (API 프록시 + 정적 파일 서빙)
- `railway.json` - Railway 배포 설정
- `nixpacks.toml` - Nixpacks 빌드 설정 (선택사항)
- `.railwayignore` - Railway에 업로드하지 않을 파일 목록

## 로컬 테스트

배포 전 로컬에서 테스트:
```bash
npm run build
npm start
```

http://localhost:3001 에서 확인

