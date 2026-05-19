export type MemoType = "text" | "image" | "link" | "code";
export type MemoColor = "yellow" | "pink" | "blue" | "green";

export type Memo = {
  id: string;
  type: MemoType;
  content: string;
  /** 추가 첨부 이미지 (dataURL 배열). 본문(content) 이미지와는 별개. */
  images?: string[];
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: MemoColor;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
};
