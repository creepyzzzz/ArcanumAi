'use client';

import { useState, useEffect } from 'react';
import { FileRef } from '@/types';
import { Database } from '@/lib/db';
import { getFileCategory, formatFileSize } from '@/lib/file-utils';
import { FileText, Image, FileIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

interface MessageAttachmentsProps {
  files: FileRef[];
}

export function MessageAttachments({ files }: MessageAttachmentsProps) {
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const loadFileContents = async () => {
      const contents: { [key: string]: string } = {};
      
      for (const file of files) {
        if (file.thumbUrl) {
          contents[file.id] = file.thumbUrl;
        } else {
          const blob = await Database.getFileBlob(file.blobId);
          if (blob) {
            const category = getFileCategory(file.type);
            if (category === 'image') {
              contents[file.id] = URL.createObjectURL(blob);
            } else if (category === 'text') {
              contents[file.id] = await blob.text();
            }
          }
        }
      }
      
      setFileContents(contents);
    };

    if (files.length > 0) {
      loadFileContents();
    }
  }, [files]);

  const getFileIcon = (file: FileRef) => {
    const category = getFileCategory(file.type);
    switch (category) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };

  const FilePreview = ({ file }: { file: FileRef }) => {
    const content = fileContents[file.id];
    const category = getFileCategory(file.type);

    if (category === 'image' && content) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content}
          alt={file.name}
          className="max-w-full max-h-96 rounded-lg"
        />
      );
    }

    if (category === 'text' && content) {
      return (
        <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
          {content}
        </pre>
      );
    }

    return (
      <div className="p-8 text-center text-muted-foreground">
        <FileIcon className="h-12 w-12 mx-auto mb-2" />
        <p>Preview not available</p>
        <p className="text-sm mt-2">{formatFileSize(file.size)}</p>
      </div>
    );
  };

  if (files.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((file) => (
        // --- MODIFICATION START ---
        // Redesigned the file attachment into a compact, clickable "chip".
        // The entire element is now the trigger for the preview dialog.
        <Dialog key={file.id}>
          <DialogTrigger asChild>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full border max-w-[250px] sm:max-w-xs cursor-pointer hover:bg-muted/75 transition-colors"
            >
              <div className="flex-shrink-0 text-muted-foreground">
                {getFileIcon(file)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="truncate">{file.name}</DialogTitle>
            </DialogHeader>
            <FilePreview file={file} />
          </DialogContent>
        </Dialog>
        // --- MODIFICATION END ---
      ))}
    </div>
  );
}
