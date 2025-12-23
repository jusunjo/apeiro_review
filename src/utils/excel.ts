import * as XLSX from 'xlsx';
import type { Review, Platform } from '../types';

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

