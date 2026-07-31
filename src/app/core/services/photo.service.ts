import { Injectable, inject, NgZone } from '@angular/core';
import { Firestore, collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy } from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { Photo } from '../models/couple.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private auth = inject(AuthService);
  private ngZone = inject(NgZone);

  getPhotos$(coupleId: string): Observable<Photo[]> {
    console.log('[PhotoService.getPhotos$] suscribiéndose', { coupleId });
    return new Observable(observer => {
      const q = query(
        collection(this.firestore, `couples/${coupleId}/photos`),
        orderBy('createdAt', 'desc')
      );
      return onSnapshot(
        q,
        snap => {
          console.log('[PhotoService.getPhotos$] snapshot recibido', {
            count: snap.docs.length,
            fromCache: snap.metadata.fromCache,
          });
          this.ngZone.run(() =>
            observer.next(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Photo))
          );
        },
        err => {
          console.error('[PhotoService.getPhotos$] ERROR en onSnapshot', {
            message: err?.message,
            code: (err as any)?.code,
            fullError: err,
          });
          observer.error(err);
        }
      );
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
    console.log('[PhotoService.uploadPhoto] INICIO', JSON.stringify({
      coupleId, fileName: file?.name, fileSize: file?.size, fileType: file?.type,
    }));

    return (async () => {
      if (!file) {
        console.error('[PhotoService.uploadPhoto] ERROR: file es null/undefined');
        throw new Error('No file provided');
      }
      if (!this.auth.currentUserUid) {
        console.error('[PhotoService.uploadPhoto] ERROR: no hay currentUserUid');
        throw new Error('No authenticated user');
      }

      const ext = file.name.split('.').pop();
      const storagePath = `couples/${coupleId}/photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(this.storage, storagePath);

      try {
        onProgress(10);
        console.log('[PhotoService.uploadPhoto] subiendo con uploadBytes (no resumable)...');
        const snapshot = await uploadBytes(storageRef, file, {
          contentType: file.type || 'image/jpeg',
        });
        console.log('[PhotoService.uploadPhoto] uploadBytes OK', JSON.stringify({ path: snapshot.ref.fullPath }));
        onProgress(70);

        const url = await getDownloadURL(snapshot.ref);
        console.log('[PhotoService.uploadPhoto] downloadURL OK ->', url);
        onProgress(90);

        const docData = {
          url, storagePath, uploaderUid: this.auth.currentUserUid!,
          caption, place, memoryDate, createdAt: new Date(),
        };
        await addDoc(collection(this.firestore, `couples/${coupleId}/photos`), docData);
        console.log('[PhotoService.uploadPhoto] FIN exitoso 🎉');
        onProgress(100);
      } catch (e: any) {
        console.error('[PhotoService.uploadPhoto] ERROR', JSON.stringify({
          message: e?.message, code: e?.code, status: e?.status_,
        }));
        throw e;
      }
    })();
  }

  async deletePhoto(coupleId: string, photo: Photo): Promise<void> {
    console.log('[PhotoService.deletePhoto] INICIO', { coupleId, photoId: photo.id, storagePath: photo.storagePath });
    try {
      await deleteDoc(doc(this.firestore, `couples/${coupleId}/photos/${photo.id}`));
      console.log('[PhotoService.deletePhoto] doc de Firestore eliminado OK');
    } catch (e) {
      console.error('[PhotoService.deletePhoto] ERROR eliminando doc de Firestore', e);
      throw e;
    }
    try {
      await deleteObject(ref(this.storage, photo.storagePath));
      console.log('[PhotoService.deletePhoto] archivo de Storage eliminado OK');
    } catch (e) {
      console.warn('[PhotoService.deletePhoto] no se pudo borrar el archivo de Storage (probablemente ya no existía)', e);
    }
  }
}