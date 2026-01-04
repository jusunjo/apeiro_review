import * as XLSX from 'xlsx';
import type { Review, Platform, InstagramFollower, InstagramSearchRow } from '../types';

export const exportInstagramToExcel = (username: string, followers: InstagramFollower[]) => {
  // 헤더 정의: A열(insta_id), B열(follower_id), C열(follower_txt)
  const headers = ['insta_id', 'follower_id', 'follower_txt'];
  
  // 각 팔로워를 하나의 행으로 변환
  const rows: unknown[][] = followers.map((follower) => [
    username,
    follower.username,
    follower.full_name,
  ]);
  
  // 워크북 생성
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // 컬럼 너비 조정
  ws['!cols'] = [
    { wch: 20 }, // insta_id
    { wch: 25 }, // follower_id
    { wch: 30 }, // follower_txt
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '팔로워');
  
  // 파일 저장: 날짜_인스타ID.xlsx
  const today = new Date().toISOString().split('T')[0];
  const fileName = `${today}_${username}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportToExcel = (platform: Platform, reviewsByProduct: Map<number, Review[]>) => {
  // 헤더 정의: 각 리뷰가 하나의 행으로 저장됨
  const headers = ['상품번호', '옵션값', '사용자ID', '내용', '평점', '작성일시'];

  // 모든 리뷰를 하나의 배열로 변환 (각 리뷰가 하나의 행)
  const rows: unknown[][] = [];

  reviewsByProduct.forEach((reviews, itemNo) => {
    // 무신사일 때만 사용자ID+내용 기준 중복 제거
    const seenForMusinsa = platform === 'musinsa' ? new Set<string>() : null;

    reviews.forEach((review) => {
      if (seenForMusinsa) {
        // 무신사: 같은 사용자ID가 남긴 리뷰는 하나만 남김
        const key = review.userId;
        if (!key || seenForMusinsa.has(key)) {
          return;
        }
        seenForMusinsa.add(key);
      }

      rows.push([
        itemNo,
        review.optionValue.join(', '),
        review.userId,
        review.contents,
        review.point,
        review.insertTimestamp,
      ]);
    });
  });

  // 워크북 생성
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 컬럼 너비 조정
  ws['!cols'] = [
    { wch: 15 }, // 상품번호
    { wch: 30 }, // 옵션값
    { wch: 20 }, // 사용자ID
    { wch: 50 }, // 내용
    { wch: 10 }, // 평점
    { wch: 20 }, // 작성일시
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '리뷰');

  // 파일 저장
  const prefix = platform === 'musinsa' ? 'musinsa' : '29cm';
  const fileName = `${prefix}_리뷰_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

// Instagram 검색 결과 Excel 내보내기
export const exportInstagramSearchToExcel = (rows: InstagramSearchRow[]) => {
  // 헤더 정의: 12개 컬럼
  const headers = [
    'search',        // 검색어
    'ID',            // 게시자 id
    'post',          // post 개수 (detail - 나중에)
    'followers',     // follower 수 (detail - 나중에)
    'following',     // following 수 (detail - 나중에)
    'post_date',     // 게시 날짜
    'post_like',     // 게시글 좋아요 수
    'post_content',  // 게시글 내용
    'post_comments', // 게시글 댓글 개수
    'text_comments', // 게시글 댓글 내용 (comment - 나중에)
    'comment_id',    // 댓글 작성자 (comment - 나중에)
    'comment_date', // 댓글 작성 날짜 (comment - 나중에)
  ];
  
  // 각 행을 배열로 변환
  const excelRows: unknown[][] = rows.map((row) => [
    row.search,
    row.ID,
    row.post,
    row.followers,
    row.following,
    row.post_date,
    row.post_like,
    row.post_content,
    row.post_comments,
    row.text_comments,
    row.comment_id,
    row.comment_date,
  ]);
  
  // 워크북 생성
  const wsData = [headers, ...excelRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // 컬럼 너비 조정
  ws['!cols'] = [
    { wch: 20 }, // search
    { wch: 20 }, // ID
    { wch: 10 }, // post
    { wch: 12 }, // followers
    { wch: 12 }, // following
    { wch: 15 }, // post_date
    { wch: 12 }, // post_like
    { wch: 50 }, // post_content
    { wch: 15 }, // post_comments
    { wch: 50 }, // text_comments
    { wch: 20 }, // comment_id
    { wch: 15 }, // comment_date
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '검색결과');
  
  // 파일 저장: 날짜_검색어.xlsx
  const today = new Date().toISOString().split('T')[0];
  const searchQuery = rows.length > 0 ? rows[0].search.replace(/[^a-zA-Z0-9가-힣]/g, '_') : 'search';
  const fileName = `${today}_instagram_search_${searchQuery}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

