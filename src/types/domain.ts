export type PostMode = "anonymous" | "named";

export type TalkMessage = {
  id: string;
  authorUid: string;
  displayName: string;
  postMode: PostMode;
  body: string;
  createdAt: Date | null;
};

export type BoardThread = {
  id: string;
  title: string;
  createdByUid: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  replyCount: number;
};

export type BoardPost = {
  id: string;
  number: number;
  authorUid: string;
  displayName: string;
  postMode: PostMode;
  body: string;
  createdAt: Date | null;
};
