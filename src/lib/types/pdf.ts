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
	/** First page number of the chapter in the full book's continuous numbering. */
	startPage?: number;
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
	/** Present when the book's appendices are included in the full PDF. */
	appendices?: { pageCount: number; startPage: number };
}
