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
import { motion } from 'framer-motion';

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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="p-4 text-center text-muted-foreground"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.5, 0.7, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <FileIcon className="h-8 w-8 mx-auto mb-2" />
            </motion.div>
            <p className="text-sm">No files attached</p>
          </motion.div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.entries(groupedFiles).map(([date, dateFiles], dateIndex) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: dateIndex * 0.1 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {date}
                  </h4>
                </div>

                <div className="space-y-2">
                  {dateFiles.map((file, fileIndex) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: (dateIndex * 0.1) + (fileIndex * 0.05),
                        ease: 'easeOut'
                      }}
                      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      className="group border rounded-lg p-3 hover:bg-muted/30 transition-all duration-200"
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

                        <motion.div
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                          >
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
                          </motion.div>

                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                          >
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
                          </motion.div>

                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 15 }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                          >
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
                          </motion.div>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
