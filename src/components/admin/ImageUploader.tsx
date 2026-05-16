import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface ImageUploaderProps {
  onUploadSuccess: (url: string) => void;
  currentUrl?: string;
  label?: string;
  className?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUploadSuccess,
  currentUrl,
  label,
  className
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      onUploadSuccess(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (fileRejections) => {
      const error = fileRejections[0]?.errors[0];
      if (error?.code === 'file-too-large') {
        setError('El archivo supera los 5MB permitidos');
      } else {
        setError('Formato no válido o archivo incorrecto');
      }
    },
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // Límite exacto de 5MB en bytes
    disabled: uploading
  } as any);

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
          {label}
        </label>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer transition-all duration-300 rounded-3xl",
          "border-2 border-dashed overflow-hidden flex flex-col items-center justify-center",
          "min-h-[160px] p-6",
          isDragActive ? "border-red-500 bg-red-500/5" : "border-white/5 bg-black/40 hover:border-white/20",
          uploading && "opacity-50 cursor-not-allowed",
          currentUrl && "border-solid border-white/10"
        )}
      >
        <input {...getInputProps()} />

        {currentUrl && !uploading ? (
          <div className="absolute inset-0 w-full h-full">
            <img
              src={currentUrl}
              alt="Preview"
              className="w-full h-full object-contain p-2"
            />
            <div className={cn(
              "absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100",
              "flex items-center justify-center transition-opacity backdrop-blur-sm"
            )}>
              <div className="text-center">
                <Upload className="w-6 h-6 text-white mx-auto mb-2" />
                <p className="text-[8px] font-black text-white uppercase tracking-widest">
                  Cambiar Imagen
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto mb-4" />
            ) : (
              <Upload className={cn(
                "w-8 h-8 mx-auto mb-4 transition-transform duration-300",
                isDragActive ? "scale-110 text-red-500" : "text-zinc-600 group-hover:text-zinc-400"
              )} />
            )}
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
              {uploading ? 'Subiendo Archivo...' : 'Arrastra o haz clic'}
            </p>
            <p className="text-[8px] text-zinc-600 font-mono">
              PNG, JPG o WEBP (Máx. 5MB)
            </p>
          </div>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-600/90 p-2 rounded-xl text-center z-10">
            <p className="text-[8px] font-black text-white uppercase tracking-widest">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};