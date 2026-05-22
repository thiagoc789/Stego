export interface Couple {
  id: string;
  name: string;
  inviteCode: string;
  user1Uid: string;
  user2Uid: string | null;
  user1DisplayName: string;
  user2DisplayName: string | null;
  createdAt: Date;
}

export interface DailyAnswer {
  date: string;
  questionId: number;
  answerUser1: string | null;
  answerUser2: string | null;
}

export interface KnowledgeRound {
  date: string;
  questionId: number;
  user1OwnAnswer: string | null;
  user1Guess: string | null;
  user2OwnAnswer: string | null;
  user2Guess: string | null;
}

export interface Note {
  id: string;
  title: string;
  text: string;
  authorUid: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Reminder {
  id: string;
  title: string;
  createdByUid: string;
  done: boolean;
  createdAt: Date;
}

export interface Photo {
  id: string;
  url: string;
  storagePath: string;
  uploaderUid: string;
  caption: string;
  place: string;
  memoryDate: string;
  createdAt: Date;
}
