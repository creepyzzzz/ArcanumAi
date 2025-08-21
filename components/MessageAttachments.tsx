'use client';

import { useState, useEffect } from 'react';
import { FileRef } from '@/types';
import { Database } from '@/lib/db';
import { getFileCategory, formatFileSize } from '@/lib/file-utils';
import { FileText, Image, FileIcon, Eye } from 'lucide-react';
import { Button } from './ui/button';
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
      </div>
    );
  };

  if (files.length === 0) return null;

  return (
    <div className="mb-3 space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border"
        >
          <div className="flex-shrink-0">
            {getFileIcon(file)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>{file.name}</DialogTitle>
              </DialogHeader>
              <FilePreview file={file} />
            </DialogContent>
          </Dialog>
        </div>
      ))}
    </div>
  );
}