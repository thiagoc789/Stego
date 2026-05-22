import { Injectable, inject, NgZone } from '@angular/core';
import { Firestore, collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy } from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { Photo } from '../models/couple.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private firestore = inject(Firestore);
  private storage   = inject(Storage);
  private auth      = inject(AuthService);
  private ngZone    = inject(NgZone);

  getPhotos$(coupleId: string): Observable<Photo[]> {
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, `couples/${coupleId}/photos`),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(q, snap => {
        this.ngZone.run(() =>
          observer.next(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Photo))
        );
      });
    });
  }

  uploadPhoto(
    coupleId: string,
    file: File,
    caption: string,
    place: string,
    memoryDate: string,
    onProgress: (pct: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop();
      const storagePath = `couples/${coupleId}/photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(this.storage, storagePath);
      const task = uploadBytesResumable(storageRef, file);

      task.on(
        'state_changed',
        snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        err => reject(err),
        async () => {
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            await addDoc(collection(this.firestore, `couples/${coupleId}/photos`), {
              url,
              storagePath,
              uploaderUid: this.auth.currentUserUid!,
              caption,
              place,
              memoryDate,
              createdAt: new Date(),
            } satisfies Omit<Photo, 'id'>);
            resolve();
          } catch (e) { reject(e); }
        }
      );
    });
  }

  async deletePhoto(coupleId: string, photo: Photo): Promise<void> {
    await deleteDoc(doc(this.firestore, `couples/${coupleId}/photos/${photo.id}`));
    try {
      await deleteObject(ref(this.storage, photo.storagePath));
    } catch { /* already deleted */ }
  }
}
