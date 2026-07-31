import { Injectable, inject, NgZone } from '@angular/core';
import { Firestore, collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy } from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
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
    console.log('[PhotoService.uploadPhoto] INICIO', {
      coupleId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      lastModified: file?.lastModified ? new Date(file.lastModified).toISOString() : null,
      caption,
      place,
      memoryDate,
      userAgent: navigator.userAgent,
      currentUserUid: this.auth.currentUserUid,
    });

    return new Promise((resolve, reject) => {
      if (!file) {
        console.error('[PhotoService.uploadPhoto] ERROR: file es null/undefined, aborto antes de subir');
        reject(new Error('No file provided'));
        return;
      }
      if (!this.auth.currentUserUid) {
        console.error('[PhotoService.uploadPhoto] ERROR: no hay currentUserUid, posible problema de auth');
        reject(new Error('No authenticated user'));
        return;
      }

      const ext = file.name.split('.').pop();
      const storagePath = `couples/${coupleId}/photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      console.log('[PhotoService.uploadPhoto] storagePath generado ->', storagePath);

      let storageRef;
      let task;
      try {
        storageRef = ref(this.storage, storagePath);
        console.log('[PhotoService.uploadPhoto] storageRef creado OK', storageRef.fullPath);

        task = uploadBytesResumable(storageRef, file);
        console.log('[PhotoService.uploadPhoto] uploadBytesResumable() llamado, task creada', task.snapshot.state);
      } catch (e: any) {
        console.error('[PhotoService.uploadPhoto] ERROR al crear ref/task ANTES de que arranque el upload', {
          message: e?.message,
          name: e?.name,
          stack: e?.stack,
          fullError: e,
        });
        reject(e);
        return;
      }

      task.on(
        'state_changed',
        snap => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          console.log('[PhotoService.uploadPhoto] progreso', {
            state: snap.state,
            bytesTransferred: snap.bytesTransferred,
            totalBytes: snap.totalBytes,
            pct,
          });
          onProgress(pct);
        },
        err => {
          console.error('[PhotoService.uploadPhoto] ERROR durante el upload (state_changed error callback)', {
            message: err?.message,
            code: err?.code,
            name: err?.name,
            serverResponse: (err as any)?.customData?.serverResponse,
            fullError: err,
          });
          reject(err);
        },
        async () => {
          console.log('[PhotoService.uploadPhoto] upload completo, bytesTransferred == totalBytes. Pidiendo downloadURL...');
          try {
            const url = await getDownloadURL(task.snapshot.ref);
            console.log('[PhotoService.uploadPhoto] downloadURL obtenida OK ->', url);

            const docData = {
              url,
              storagePath,
              uploaderUid: this.auth.currentUserUid!,
              caption,
              place,
              memoryDate,
              createdAt: new Date(),
            } satisfies Omit<Photo, 'id'>;

            console.log('[PhotoService.uploadPhoto] guardando doc en Firestore...', docData);
            const docRef = await addDoc(collection(this.firestore, `couples/${coupleId}/photos`), docData);
            console.log('[PhotoService.uploadPhoto] doc guardado OK, id ->', docRef.id);

            console.log('[PhotoService.uploadPhoto] FIN exitoso 🎉');
            resolve();
          } catch (e: any) {
            console.error('[PhotoService.uploadPhoto] ERROR después de subir el archivo (getDownloadURL o addDoc)', {
              message: e?.message,
              code: e?.code,
              name: e?.name,
              stack: e?.stack,
              fullError: e,
            });
            reject(e);
          }
        }
      );
    });
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