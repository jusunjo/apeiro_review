# 배포 가이드

## Vercel에 배포하기 (가장 간단한 방법)

### 1. GitHub에 프로젝트 푸시
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Vercel 배포
1. [Vercel](https://vercel.com)에 접속
2. "Add New Project" 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. "Deploy" 클릭

### 3. 환경 변수 (필요시)
Vercel 대시보드에서 환경 변수를 추가할 수 있습니다.

### 완료!
배포가 완료되면 Vercel에서 제공하는 URL로 접속하면 됩니다.

## 다른 배포 옵션

### Netlify
1. [Netlify](https://netlify.com)에 접속
2. GitHub 저장소 연결
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

### Render
1. [Render](https://render.com)에 접속
2. "New Static Site" 선택
3. GitHub 저장소 연결
4. Build command: `npm run build`
5. Publish directory: `dist`

