export interface Couple {
  id: string;
  name: string;
  inviteCode: string;
  user1Uid: string;
  user2Uid: string | null;
  createdAt: Date;
}

export interface DailyAnswer {
  date: string; // 'YYYY-MM-DD'
  questionId: number;
  answerUser1: string | null;
  answerUser2: string | null;
}

export interface Note {
  id: string;
  text: string;
  authorUid: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  title: string;
  datetime: Date;
  createdByUid: string;
  done: boolean;
}
