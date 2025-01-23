"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import "./styles/FileUploader.module.css";
import { FileWithProgress } from "@/types/types";


const FileUploader = () => {
  const [uploadQueue, setUploadQueue] = useState<FileWithProgress[]>([]);
  const isUploadingRef = useRef<boolean>(false);

  const onDrop = (acceptedFiles: File[]) => {
    const filesWithProgress = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      uploaded: false,
      uploading: false,
      canceled: false,
      cancelTokenSource: null,
    }));

    // Setting up the upload queue
    setUploadQueue((prev) => [...prev, ...filesWithProgress]);

    if (!isUploadingRef.current) {
      triggerNextUpload();
    }
  };

  // Functions for updating the upload queue
  const updateProgress = (index: number, progress: number) => {
    setUploadQueue((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index].progress = progress;
      }
      return updated;
    });
  };
  
  const markUploadComplete = (index: number) => {
    setUploadQueue((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index].uploaded = true;
        updated[index].uploading = false;
      }
      return updated;
    });
  };
  
  
  


  const markUploadCanceled = (index: number) => {
    setUploadQueue((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index].uploading = false;
        if (!updated[index].uploaded) {
          updated[index].canceled = true;
        }
      }
      return updated;
    });
  };

  const updateUploadQueueOnCancel = (index: number) => {
    setUploadQueue((prev) => {
      const updated = [...prev];
      const file = updated[index];

      if (file.uploading && file.cancelTokenSource && !file.uploaded) {
        file.cancelTokenSource.cancel("Upload canceled by the user.");
      }

      if (!file.uploaded) {
        file.canceled = true;
      }
      file.uploading = false;
      file.cancelTokenSource = null;

      return updated;
    });

    isUploadingRef.current = false;
    triggerNextUpload();
  };

  const fileuploadingQueueUpdate = (index: number, cancelTokenSource: any) => {
    setUploadQueue((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index].uploading = true;
        updated[index].cancelTokenSource = cancelTokenSource;
      }
      return updated;
    });
  };

  const uploadFile = async (file: File, index: number) => {
    const cancelTokenSource = axios.CancelToken.source();
  
    // Set uploading state to true
    fileuploadingQueueUpdate(index, cancelTokenSource);
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
    formData.append("cloud_name", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "");
  
    try {
      await axios.post(process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_URL || "", formData, {
        cancelToken: cancelTokenSource.token,
        onUploadProgress: (progressEvent: any) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            updateProgress(index, progress);
  
            // When progress reaches 100%, mark upload complete immediately
            if (progress === 100) {
              markUploadComplete(index);
            }
          
          }
          
        },
      });
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log(`Upload for file "${file.name}" was canceled.`);
      } else {
        console.error("Error uploading file:", error);
      }
  
      markUploadCanceled(index);
    } finally {
      isUploadingRef.current = false;
      triggerNextUpload();
    }
  };
  
  

  const cancelUpload = (index: number) => {
    updateUploadQueueOnCancel(index);
  };

  const triggerNextUpload = () => {
    if (isUploadingRef.current) return;
    const nextIndex = uploadQueue.findIndex(
      (file) => !file.uploaded && !file.canceled && !file.uploading
    );

    if (nextIndex !== -1) {
      isUploadingRef.current = true;
      uploadFile(uploadQueue[nextIndex].file, nextIndex);
    }
  };

  useEffect(() => {
    triggerNextUpload();
  }, [uploadQueue]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <div style={{ padding: "20px" }}>
      <h1>File Uploader</h1>
      <div className="dashed-container"
        {...getRootProps()}
       
      >
        <input {...getInputProps()} accept=".jpg, .png" />
        <p className="uploadertext">
          Drag & drop files here, or click to select files
        </p>
      </div>

      <div style={{ marginTop: "20px" }}>
        {uploadQueue.map((file, index) => (
          <div
            key={index}
            style={{
              backgroundColor: file.canceled ? "#f8d7da" : "#fff",
              textDecoration: file.canceled ? "line-through" : "none",
              filter: file.canceled ? "blur(2px)" : "none", // Blur effect for canceled files
            }}
            className="upload-card"
          >
            <div className="upload-name">
              <strong>{file.file.name}</strong>
            </div>

            <div style={{ width: "30%" }}>
              <div
               className="uploaded-section"
              >
                <div
                  style={{
                    height: "10px",
                    width: `${file.progress}%`,
                    background: file.uploaded
                      ? "green"
                      : file.canceled
                      ? "red"
                      : "blue",
                    transition: "width 0.2s",
                  }}
                />
              </div>
            </div>
            {file.uploading && !file.uploaded && !file.canceled && (
  <button
    onClick={() => cancelUpload(index)}
className="cancel-upload"
  >
    ✖
  </button>
)}
{file.uploaded &&  (
  <div className="success">✔</div>
)}
{file.canceled && !file.uploaded && (
  <div className="cancel">x</div>
)}

          </div>
        ))}
      </div>
    </div>
  );
};

export default FileUploader;
