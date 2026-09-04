declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export interface TextItemLike {
    str?: string;
    transform?: number[];
  }
  export interface PDFPageProxy {
    getTextContent(options?: { normalizeWhitespace?: boolean }): Promise<{ items: TextItemLike[] }>;
    cleanup(): void;
  }
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
    destroy(): Promise<void>;
  }
  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
    destroy(): Promise<void>;
  }
  export function getDocument(params: {
    data: Uint8Array;
    useWorkerFetch?: boolean;
    isEvalSupported?: boolean;
    disableFontFace?: boolean;
    verbosity?: number;
  }): PDFDocumentLoadingTask;
}
