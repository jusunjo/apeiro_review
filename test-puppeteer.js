// Puppeteer 테스트 스크립트
// 실행 방법: npm install puppeteer && node test-puppeteer.js

import puppeteer from 'puppeteer';

(async () => {
  console.log('=== Puppeteer Instagram Profile Test ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36');
    
    console.log('1. Navigating to Instagram profile...');
    await page.goto('https://www.instagram.com/yeon_record03/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('2. Waiting for profile stats to load...');
    await page.waitForTimeout(3000); // 추가 로딩 시간
    
    console.log('3. Extracting profile statistics...\n');
    
    // 방법 1: 제공된 HTML 구조를 기반으로 선택자 사용
    // 게시물 수 추출
    const postsCount = await page.evaluate(() => {
      // "게시물" 텍스트를 포함하는 div를 찾고, 그 안의 span에서 숫자 추출
      const divs = Array.from(document.querySelectorAll('div'));
      for (const div of divs) {
        if (div.textContent && div.textContent.includes('게시물')) {
          const spans = div.querySelectorAll('span.html-span');
          for (const span of spans) {
            const text = span.textContent.trim();
            if (text && /^\d+$/.test(text)) {
              return text;
            }
          }
        }
      }
      return null;
    });
    
    // 팔로워 수 추출
    const followersCount = await page.evaluate(() => {
      // "팔로워" 텍스트를 포함하는 a 태그를 찾고, 그 안의 span에서 숫자 추출
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        if (link.textContent && link.textContent.includes('팔로워')) {
          const spans = link.querySelectorAll('span.html-span');
          for (const span of spans) {
            const text = span.textContent.trim();
            if (text && /^\d+$/.test(text)) {
              return text;
            }
          }
        }
      }
      return null;
    });
    
    // 팔로잉 수 추출
    const followingCount = await page.evaluate(() => {
      // "팔로우" 텍스트를 포함하는 a 태그를 찾고, 그 안의 span에서 숫자 추출
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        if (link.textContent && link.textContent.includes('팔로우')) {
          const spans = link.querySelectorAll('span.html-span');
          for (const span of spans) {
            const text = span.textContent.trim();
            if (text && /^\d+$/.test(text)) {
              return text;
            }
          }
        }
      }
      return null;
    });
    
    // 방법 2: 더 안정적인 방법 - 모든 통계를 한 번에 추출
    const stats = await page.evaluate(() => {
      const result = {
        posts: null,
        followers: null,
        following: null
      };
      
      // 모든 span.html-span 요소 찾기
      const spans = Array.from(document.querySelectorAll('span.html-span'));
      
      // "게시물", "팔로워", "팔로우" 텍스트를 포함하는 부모 요소 찾기
      const divs = Array.from(document.querySelectorAll('div'));
      
      for (const div of divs) {
        const text = div.textContent || '';
        
        if (text.includes('게시물')) {
          const span = div.querySelector('span.html-span');
          if (span) {
            const num = span.textContent.trim();
            if (/^\d+$/.test(num)) {
              result.posts = num;
            }
          }
        }
      }
      
      const links = Array.from(document.querySelectorAll('a'));
      for (const link of links) {
        const text = link.textContent || '';
        const span = link.querySelector('span.html-span');
        
        if (span) {
          const num = span.textContent.trim();
          if (/^\d+$/.test(num)) {
            if (text.includes('팔로워')) {
              result.followers = num;
            } else if (text.includes('팔로우')) {
              result.following = num;
            }
          }
        }
      }
      
      return result;
    });
    
    console.log('=== 결과 (방법 1: 개별 추출) ===');
    console.log('게시물:', postsCount);
    console.log('팔로워:', followersCount);
    console.log('팔로우:', followingCount);
    console.log('');
    
    console.log('=== 결과 (방법 2: 일괄 추출) ===');
    console.log('게시물:', stats.posts);
    console.log('팔로워:', stats.followers);
    console.log('팔로우:', stats.following);
    console.log('');
    
    // HTML 일부 확인 (디버깅용)
    const htmlSnippet = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      for (const div of divs) {
        if (div.textContent && div.textContent.includes('게시물')) {
          return div.innerHTML.substring(0, 500);
        }
      }
      return 'Not found';
    });
    
    console.log('=== HTML 스니펫 (디버깅용) ===');
    console.log(htmlSnippet.substring(0, 300));
    console.log('...\n');
    
    // 최종 검증
    if (stats.posts && stats.followers && stats.following) {
      console.log('✅ 성공: 모든 값 추출 완료!');
      console.log(`   게시물: ${stats.posts}, 팔로워: ${stats.followers}, 팔로우: ${stats.following}`);
    } else {
      console.log('⚠️  일부 값 추출 실패');
      console.log(`   게시물: ${stats.posts || 'N/A'}, 팔로워: ${stats.followers || 'N/A'}, 팔로우: ${stats.following || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
})();

