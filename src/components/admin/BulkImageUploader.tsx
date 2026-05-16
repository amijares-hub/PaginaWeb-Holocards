import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface BulkImageUploaderProps {
  onUploadSuccess: (urls: string[]) => void;
  currentUrls?: string[];
  label?: string;
  className?: string;
  productId?: string;
}

export const BulkImageUploader: React.FC<BulkImageUploaderProps> = ({
  onUploadSuccess,
  currentUrls = [],
  label,
  className,
  productId
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];

    try {
      for (const file of acceptedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `products/${productId || 'new'}/tophits/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product_assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product_assets')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      onUploadSuccess([...currentUrls, ...uploadedUrls]);
    } catch (err: any) {
      console.error('Bulk upload error:', err);
      setError(err.message || 'Error al subir una o más imágenes');
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess, currentUrls, productId]);

  const removeImage = (urlToRemove: string) => {
    onUploadSuccess(currentUrls.filter(url => url !== urlToRemove));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (fileRejections) => {
      setError('Algunos archivos no cumplen los requisitos');
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxSize: 5 * 1024 * 1024,
    disabled: uploading
  });

  return (
    <div className={cn("space-y-4", className)}>
      {label && (
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">
          {label}
        </label>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer transition-all duration-300 rounded-[2rem]",
          "border-2 border-dashed flex flex-col items-center justify-center",
          "min-h-[120px] p-8",
          isDragActive ? "border-red-500 bg-red-500/5" : "border-white/5 bg-black/40 hover:border-white/10",
          uploading && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-red-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando activos...</p>
          </div>
        ) : (
          <div className="text-center">
            <Upload className={cn(
              "w-8 h-8 mx-auto mb-3 transition-transform",
              isDragActive ? "scale-110 text-red-500" : "text-zinc-600"
            )} />
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              Subida Masiva (Bulk Upload)
            </p>
            <p className="text-[8px] text-zinc-600 mt-1 uppercase font-bold italic">Arrastra varias cartas aquí</p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          <p className="text-[8px] font-black text-red-500 uppercase tracking-widest">{error}</p>
        </div>
      )}

      {/* Preview Grid */}
      {currentUrls.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 pt-2">
          {currentUrls.map((url, index) => (
            <div key={index} className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5 bg-zinc-900 shadow-xl">
              <img src={url} alt={`Top Hit ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(url);
                  }}
                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all scale-75 group-hover:scale-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
