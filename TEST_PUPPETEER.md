# Puppeteer Instagram 프로필 테스트

## 설치 및 실행 방법

### 1. Puppeteer 설치
```bash
npm install puppeteer
```

### 2. 테스트 실행
```bash
node test-puppeteer.js
```

## 예상 결과

제공된 HTML 구조를 기반으로:
- **게시물**: 30
- **팔로워**: 3916
- **팔로우**: 4115

이 값들을 추출할 수 있어야 합니다.

## HTML 구조 분석

```html
<div class="html-div ...">
  <div>
    <span>게시물 <span><span class="html-span">30</span></span></span>
  </div>
  <div>
    <a href="/yeon_record03/followers/">
      <span>팔로워 <span title="3916"><span class="html-span">3916</span></span></span>
    </a>
  </div>
  <div>
    <a href="/yeon_record03/following/">
      <span>팔로우 <span><span class="html-span">4115</span></span></span>
    </a>
  </div>
</div>
```

## 추출 방법

1. **게시물 수**: "게시물" 텍스트를 포함하는 div 내부의 `span.html-span` 요소
2. **팔로워 수**: "팔로워" 텍스트를 포함하는 a 태그 내부의 `span.html-span` 요소
3. **팔로우 수**: "팔로우" 텍스트를 포함하는 a 태그 내부의 `span.html-span` 요소

## 주의사항

- Instagram은 구조가 자주 변경될 수 있음
- 로그인이 필요할 수 있음 (공개 프로필은 로그인 불필요)
- Rate limiting에 주의

