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

export type Platform = '29cm' | 'musinsa' | 'instagram';

export interface InstagramHeaders {
  accept?: string;
  'accept-language'?: string;
  cookie: string;
  priority?: string;
  referer?: string;
  'sec-ch-prefers-color-scheme'?: string;
  'sec-ch-ua'?: string;
  'sec-ch-ua-full-version-list'?: string;
  'sec-ch-ua-mobile'?: string;
  'sec-ch-ua-model'?: string;
  'sec-ch-ua-platform'?: string;
  'sec-ch-ua-platform-version'?: string;
  'sec-fetch-dest'?: string;
  'sec-fetch-mode'?: string;
  'sec-fetch-site'?: string;
  'user-agent'?: string;
  'x-asbd-id'?: string;
  'x-csrftoken'?: string;
  'x-ig-app-id'?: string;
  'x-ig-www-claim'?: string;
  'x-requested-with'?: string;
  'x-web-session-id'?: string;
}

export interface InstagramFollower {
  pk: string;
  pk_id: string;
  id: string;
  full_name: string;
  username: string;
  profile_pic_url: string;
  is_verified: boolean;
  is_private: boolean;
}

export interface InstagramFollowersResponse {
  users: InstagramFollower[];
  big_list: boolean;
  page_size: number;
  next_max_id?: string;
  has_more: boolean;
  status: string;
}

