// types.ts
export type FileWithProgress = {
    file: File;
    progress: number;
    uploaded: boolean;
    uploading: boolean;
    canceled: boolean;
    cancelTokenSource: any | null; // Replace `any` with a more specific type if possible (e.g., Axios' `CancelTokenSource`)
  };
  