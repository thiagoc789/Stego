export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  coupleId: string | null;
  fcmToken: string | null;
}
