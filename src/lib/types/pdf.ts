/**
 * PDF download manifest, written by scripts/generate-pdfs.js and consumed
 * by PdfDownloadButton via the book's +layout load function.
 */

export interface PdfManifestChapter {
	chapterNum: number;
	title: string;
	file: string;
	sizeBytes: number;
	pageCount: number;
}

export interface PdfManifestFull {
	file: string;
	sizeBytes: number;
	pageCount: number;
}

export interface PdfManifest {
	generatedAt: string;
	bookSlug: string;
	full: PdfManifestFull;
	chapters: PdfManifestChapter[];
}
