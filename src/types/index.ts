export interface SearchRequestBody {
  keyword: string;
  pageType: string;
  sortType: string;
  facets: Record<string, unknown>;
  pageRequest: {
    page: number;
    size: number;
  };
}

export interface SearchResponse {
  meta: {
    result: string;
  };
  data: {
    keywordTypes: string[];
    list: ProductItem[];
    pagination: {
      page: number;
      size: number;
      hasNext: boolean;
      totalCount: number;
    };
  };
}

export interface ProductItem {
  itemId: number;
  itemType: string;
  itemEvent: {
    eventProperties: {
      itemNo: number;
      itemName: string;
    };
  };
}

export interface ReviewResponse {
  result: string;
  data: {
    count: number;
    results: Review[];
  };
}

export interface Review {
  itemReviewNo: number;
  itemNo: number;
  optionValue: string[];
  userId: string;
  contents: string;
  point: number;
  insertTimestamp: string;
}

export type Platform = '29cm';

