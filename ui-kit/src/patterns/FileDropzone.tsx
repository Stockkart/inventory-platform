import type { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';
import styles from './FileDropzone.module.css';

/** Class names for file upload dropzone UI (picker, file list, actions). */
export const fileDropzone = {
  container: styles.container,
  optionLabel: styles.optionLabel,
  optionTitle: styles.optionTitle,
  optionSubtitle: styles.optionSubtitle,
  fileInput: styles.fileInput,
  fileInputLabel: styles.fileInputLabel,
  controls: styles.controls,
  actions: styles.actions,
  uploadBtn: styles.uploadBtn,
  clearBtn: styles.clearBtn,
  fileIcon: styles.fileIcon,
  fileName: styles.fileName,
  fileSize: styles.fileSize,
  fileListSummary: styles.fileListSummary,
  fileListCount: styles.fileListCount,
  fileListHint: styles.fileListHint,
  fileList: styles.fileList,
  fileListItem: styles.fileListItem,
  fileRemoveBtn: styles.fileRemoveBtn,
  placeholder: styles.placeholder,
  placeholderIcon: styles.placeholderIcon,
  progress: styles.progress,
  progressText: styles.progressText,
  btnIcon: styles.btnIcon,
} as const;

export type FileDropzoneContainerProps = HTMLAttributes<HTMLDivElement>;

/** Dashed-border container for a file upload option. */
export function FileDropzoneContainer({
  className,
  children,
  ...rest
}: FileDropzoneContainerProps) {
  return (
    <div className={cn(fileDropzone.container, className)} {...rest}>
      {children}
    </div>
  );
}
