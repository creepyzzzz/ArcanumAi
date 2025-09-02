'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { FileRef } from '@/types';
import { Database } from '@/lib/db';
import { getFileCategory, formatFileSize } from '@/lib/file-utils';
import {
  FileText,
  Image,
  FileIcon,
  Trash2,
  Eye,
  Download,
  Calendar
} from 'lucide-react';

interface FilesPanelProps {
  files: FileRef[];
  onFileRemove: (fileId: string) => void;
  onFileSelect: (fileId: string) => void;
}

export function FilesPanel({ files, onFileRemove, onFileSelect }: FilesPanelProps) {
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

  const downloadFile = async (file: FileRef) => {
    const blob = await Database.getFileBlob(file.blobId);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays < 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const groupedFiles = files.reduce((acc, file) => {
    const dateKey = formatDate(file.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(file);
    return acc;
  }, {} as Record<string, FileRef[]>);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {files.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <FileIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No files attached</p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.entries(groupedFiles).map(([date, dateFiles]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {date}
                  </h4>
                </div>

                <div className="space-y-2">
                  {dateFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      {getFileCategory(file.type) === 'image' && fileContents[file.id] && (
                        <div className="mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fileContents[file.id]}
                            alt={file.name}
                            className="w-full h-32 object-cover rounded"
                          />
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getFileIcon(file)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                          {file.textSnippet && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {file.textSnippet}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFileSelect(file.id);
                            }}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(file);
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFileRemove(file.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
