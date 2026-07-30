/**
 * Image Upload Service
 * Uploader les images au serveur et récupérer les URLs
 */

import api from '@/api/axios';

interface UploadedImage {
  id: string;
  url: string; // URL serveur
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

class ImageUploadService {
  private uploadedImages: Map<string, UploadedImage> = new Map();

  private getApiBaseUrl(): string {
    const configured = import.meta.env.VITE_API_URL as string | undefined;
    return (configured || 'http://localhost:3000').replace(/\/$/, '');
  }

  /**
   * Upload une image au serveur
   */
  async uploadImage(file: File, campaignId: string): Promise<UploadedImage> {
    const validation = this.validateImage(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/campaigns/${campaignId}/images/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      const uploadedImage: UploadedImage = {
        id: data.id,
        url: this.resolveImageUrl(data.url),
        name: data.fileName,
        size: data.size,
        type: data.type,
        uploadedAt: new Date(data.uploadedAt),
      };

      console.debug('[ImageUpload] uploaded image', {
        campaignId,
        id: uploadedImage.id,
        fileName: uploadedImage.name,
        rawUrl: data.url,
        resolvedUrl: uploadedImage.url,
      });

      this.uploadedImages.set(data.id, uploadedImage);
      return uploadedImage;
    } catch (error) {
      console.error('❌ Image upload exception:', error);
      throw error;
    }
  }

  /**
   * Obtenir une image uploadée
   */
  getImage(id: string): UploadedImage | undefined {
    return this.uploadedImages.get(id);
  }

  /**
   * Lister toutes les images
   */
  getAllImages(): UploadedImage[] {
    return Array.from(this.uploadedImages.values());
  }

  /**
   * Supprimer une image
   */
  deleteImage(id: string): boolean {
    return this.uploadedImages.delete(id);
  }

  /**
   * Obtenir une miniature URL
   */
  getThumbnail(imageUrl: string): string {
    const resolved = this.resolveImageUrl(imageUrl);
    console.debug('[ImageUpload] thumbnail resolved', { input: imageUrl, resolved });
    return resolved;
  }

  resolveImageUrl(imageUrl: string): string {
    if (!imageUrl) return imageUrl;
    if (/^data:/i.test(imageUrl)) {
      console.debug('[ImageUpload] data url kept as-is', { imageUrl });
      return imageUrl;
    }
    if (/^https?:\/\//i.test(imageUrl)) {
      console.debug('[ImageUpload] absolute url kept as-is', { imageUrl });
      return imageUrl;
    }
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    const resolved = `${this.getApiBaseUrl()}${path}`;
    console.debug('[ImageUpload] relative url resolved', { imageUrl, resolved });
    return resolved;
  }

  /**
   * Valider la taille et type d'image
   */
  validateImage(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > MAX_SIZE) {
      return { valid: false, error: `Image trop grande (max ${MAX_SIZE / 1024 / 1024}MB)` };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: "Type d'image non supporté (JPEG, PNG, GIF, WebP)" };
    }

    return { valid: true };
  }
}

export const imageUploadService = new ImageUploadService();
export type { UploadedImage };
