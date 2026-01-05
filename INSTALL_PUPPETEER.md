# Puppeteer 설치 가이드

## 설치

Detail 정보 추출 기능을 사용하려면 Puppeteer를 설치해야 합니다:

```bash
npm install puppeteer
```

## 기능 설명

- **포스트 개수**: Instagram 프로필의 게시물 수
- **팔로워 수**: Instagram 프로필의 팔로워 수  
- **팔로우 수**: Instagram 프로필의 팔로우 수

이 정보들은 Puppeteer를 사용하여 Instagram 프로필 페이지를 렌더링하고 HTML에서 추출합니다.

## 주의사항

1. Puppeteer는 Chrome/Chromium을 다운로드합니다 (약 170MB)
2. 서버 환경에 Chrome이 필요합니다
3. Detail 정보 추출은 시간이 걸릴 수 있습니다 (각 사용자당 약 3-5초)
4. 같은 사용자의 여러 게시물이 있으면 캐싱되어 한 번만 호출됩니다


