// Image Downloader Feature for Dev Support Extension
// @ts-ignore
import JSZip from 'jszip';

export interface ImageInfo {
  url: string;
  filename: string;
  size?: number;
  width?: number;
  height?: number;
  type?: string;
}

export interface DownloadProgress {
  total: number;
  completed: number;
  failed: number;
  errors: string[];
}

export class ImageDownloader {
  private static instance: ImageDownloader | null = null;
  private downloadInProgress = false;

  public static getInstance(): ImageDownloader {
    if (!ImageDownloader.instance) {
      ImageDownloader.instance = new ImageDownloader();
    }
    return ImageDownloader.instance;
  }

  /**
   * Collect all images from the current page
   */
  public async collectImages(): Promise<ImageInfo[]> {
    const images = new Set<string>();
    const imageInfos: ImageInfo[] = [];

    // Collect from IMG tags
    const imgElements = document.querySelectorAll('img');
    imgElements.forEach((img) => {
      if (img.src && !images.has(img.src)) {
        images.add(img.src);
        imageInfos.push({
          url: img.src,
          filename: this.extractFilename(img.src),
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          type: this.getImageType(img.src)
        });
      }

      // Check for srcset images
      if (img.srcset) {
        const srcsetUrls = this.parseSrcset(img.srcset);
        srcsetUrls.forEach(url => {
          if (!images.has(url)) {
            images.add(url);
            imageInfos.push({
              url,
              filename: this.extractFilename(url),
              type: this.getImageType(url)
            });
          }
        });
      }
    });

    // Collect from CSS background images
    const elementsWithBackgrounds = document.querySelectorAll('*');
    elementsWithBackgrounds.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);
      const backgroundImage = computedStyle.backgroundImage;
      
      if (backgroundImage && backgroundImage !== 'none') {
        const urls = this.extractUrlsFromCss(backgroundImage);
        urls.forEach(url => {
          if (!images.has(url) && this.isImageUrl(url)) {
            images.add(url);
            imageInfos.push({
              url,
              filename: this.extractFilename(url),
              type: this.getImageType(url)
            });
          }
        });
      }
    });

    // Collect from CSS stylesheets
    const cssImages = await this.collectFromStylesheets();
    cssImages.forEach(imageInfo => {
      if (!images.has(imageInfo.url)) {
        images.add(imageInfo.url);
        imageInfos.push(imageInfo);
      }
    });

    // Filter out small icons and favicon-like images
    const filteredImages = imageInfos.filter(img => {
      const { width = 0, height = 0 } = img;
      const minSize = 32; // Minimum 32x32 pixels
      return (width >= minSize || height >= minSize || (width === 0 && height === 0));
    });

    console.log(`📸 Found ${filteredImages.length} images on the page`);
    return filteredImages;
  }

  /**
   * Download all collected images as a zip file
   */
  public async downloadAllImages(images: ImageInfo[], onProgress?: (progress: DownloadProgress) => void): Promise<DownloadProgress> {
    if (this.downloadInProgress) {
      throw new Error('Download already in progress');
    }

    this.downloadInProgress = true;

    try {
      console.log('📦 Creating zip file with', images.length, 'images...');
      
      // Create a new JSZip instance
      const zip = new JSZip();
      
      let downloadedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Download each image and add to zip
      for (const image of images) {
        try {
          // Update progress
          if (onProgress) {
            onProgress({
              total: images.length,
              completed: downloadedCount,
              failed: failedCount,
              errors: [...errors]
            });
          }

          console.log(`📥 Downloading image: ${image.filename}`);
          
          // Fetch the image
          const response = await fetch(image.url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          
          // Add to zip with a clean filename
          const cleanFilename = this.sanitizeFilename(image.filename);
          zip.file(cleanFilename, blob);
          
          downloadedCount++;
          console.log(`✅ Added to zip: ${cleanFilename}`);
          
        } catch (error) {
          failedCount++;
          const errorMsg = `Failed to download ${image.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      // Update final progress
      const finalProgress: DownloadProgress = {
        total: images.length,
        completed: downloadedCount,
        failed: failedCount,
        errors
      };

      if (onProgress) {
        onProgress(finalProgress);
      }

      if (downloadedCount === 0) {
        throw new Error('No images were successfully downloaded');
      }

      console.log('📦 Generating zip file...');
      
      // Generate zip file
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Create download link
      const zipUrl = URL.createObjectURL(zipBlob);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const filename = `images-${timestamp}.zip`;

      // Trigger download
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the URL object
      setTimeout(() => {
        URL.revokeObjectURL(zipUrl);
      }, 1000);

      console.log(`✅ Zip download completed: ${filename} (${downloadedCount} images, ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB)`);
      
      return finalProgress;

    } finally {
      this.downloadInProgress = false;
    }
  }


  /**
   * Extract filename from URL
   */
  private extractFilename(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      let filename = pathname.split('/').pop() || 'image';
      
      // Remove query parameters from filename if any
      filename = filename.split('?')[0];
      
      // Add extension if missing
      if (!filename.includes('.')) {
        const type = this.getImageType(url);
        filename += type ? `.${type}` : '.jpg';
      }
      
      // Sanitize filename
      filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      return filename;
    } catch {
      return `image_${Date.now()}.jpg`;
    }
  }

  /**
   * Sanitize filename for zip archive
   */
  private sanitizeFilename(filename: string): string {
    // Remove or replace invalid characters for zip files
    let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    
    // Ensure filename doesn't start with dot or dash
    if (sanitized.startsWith('.') || sanitized.startsWith('-')) {
      sanitized = 'image_' + sanitized;
    }
    
    // Ensure filename is not empty
    if (!sanitized || sanitized.trim() === '') {
      sanitized = `image_${Date.now()}.jpg`;
    }
    
    // Handle duplicate filenames by adding a counter
    const parts = sanitized.split('.');
    const extension = parts.length > 1 ? parts.pop() : 'jpg';
    const baseName = parts.join('.');
    
    return `${baseName}.${extension}`;
  }

  /**
   * Get image type from URL
   */
  private getImageType(url: string): string | undefined {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
    const urlLower = url.toLowerCase();
    
    for (const ext of imageExtensions) {
      if (urlLower.includes(`.${ext}`)) {
        return ext;
      }
    }
    
    return undefined;
  }

  /**
   * Check if URL is likely an image
   */
  private isImageUrl(url: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
    const urlLower = url.toLowerCase();
    
    return imageExtensions.some(ext => urlLower.includes(`.${ext}`)) ||
           url.includes('image') ||
           url.includes('img') ||
           url.includes('photo') ||
           url.includes('pic');
  }

  /**
   * Parse srcset attribute
   */
  private parseSrcset(srcset: string): string[] {
    const urls: string[] = [];
    const entries = srcset.split(',');
    
    entries.forEach(entry => {
      const url = entry.trim().split(' ')[0];
      if (url) {
        urls.push(url);
      }
    });
    
    return urls;
  }

  /**
   * Extract URLs from CSS
   */
  private extractUrlsFromCss(cssValue: string): string[] {
    const urls: string[] = [];
    const urlRegex = /url\(['"]?([^'"]*?)['"]?\)/gi;
    let match;
    
    while ((match = urlRegex.exec(cssValue)) !== null) {
      urls.push(match[1]);
    }
    
    return urls;
  }

  /**
   * Collect images from stylesheets
   */
  private async collectFromStylesheets(): Promise<ImageInfo[]> {
    const images: ImageInfo[] = [];
    const styleSheets = Array.from(document.styleSheets);
    
    for (const stylesheet of styleSheets) {
      try {
        const rules = Array.from(stylesheet.cssRules || []);
        
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            const backgroundImage = rule.style.backgroundImage;
            if (backgroundImage && backgroundImage !== 'none') {
              const urls = this.extractUrlsFromCss(backgroundImage);
              urls.forEach(url => {
                if (this.isImageUrl(url)) {
                  images.push({
                    url,
                    filename: this.extractFilename(url),
                    type: this.getImageType(url)
                  });
                }
              });
            }
          }
        }
      } catch (error) {
        // Skip stylesheets that can't be accessed due to CORS
        console.warn('Could not access stylesheet:', stylesheet.href, error);
      }
    }
    
    return images;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create download UI
   */
  public createDownloadUI(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'dev-support-image-downloader';
    container.innerHTML = `
      <div class="image-downloader-button" title="Download All Images as Zip File">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="7,10 12,15 17,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="downloader-text">Zip All</span>
      </div>
    `;

    // Add styles
    this.addDownloaderStyles();

    // Position at top-right
    container.style.cssText = `
      position: fixed;
      top: 60px;
      right: 60px;
      z-index: 10000;
      cursor: pointer;
      user-select: none;
      animation: downloaderFadeIn 0.5s ease-out;
    `;

    // Add event listeners
    this.setupDownloaderEventListeners(container);

    return container;
  }

  /**
   * Add styles for the downloader UI
   */
  private addDownloaderStyles(): void {
    if (document.getElementById('dev-support-image-downloader-styles')) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'dev-support-image-downloader-styles';
    styleElement.textContent = `
      @keyframes downloaderFadeIn {
        from {
          opacity: 0;
          transform: translateY(-20px) scale(0.8);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes downloaderPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      .image-downloader-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #43a047 0%, #66bb6a 100%);
        color: white;
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(67, 160, 71, 0.4);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .image-downloader-button:hover {
        box-shadow: 0 8px 30px rgba(67, 160, 71, 0.6);
        background: linear-gradient(135deg, #388e3c 0%, #4caf50 100%);
        transform: scale(1.1) rotate(5deg);
      }
      
      .image-downloader-button:active {
        transform: scale(0.95) !important;
      }
      
      .image-downloader-button svg {
        width: 28px;
        height: 28px;
        margin-bottom: -2px;
      }
      
      .downloader-text {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      
      /* Progress overlay */
      .image-downloader-progress {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 12px;
        z-index: 10001;
        min-width: 300px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .progress-bar {
        width: 100%;
        height: 8px;
        background-color: #333;
        border-radius: 4px;
        margin: 10px 0;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #43a047, #66bb6a);
        transition: width 0.3s ease;
        border-radius: 4px;
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        #dev-support-image-downloader {
          top: 30px !important;
          right: 30px !important;
        }
        
        .image-downloader-button {
          width: 70px;
          height: 70px;
        }
        
        .image-downloader-button svg {
          width: 24px;
          height: 24px;
        }
        
        .downloader-text {
          font-size: 10px;
        }
      }
      
      /* Ensure button stays above all content */
      #dev-support-image-downloader {
        z-index: 2147483647 !important;
      }
    `;

    document.head.appendChild(styleElement);
  }

  /**
   * Setup event listeners for the downloader UI
   */
  private setupDownloaderEventListeners(container: HTMLElement): void {
    const button = container.querySelector('.image-downloader-button') as HTMLElement;
    
    if (!button) return;

    button.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      await this.startImageDownload();
    });

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1) rotate(5deg)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1) rotate(0deg)';
    });
  }

  /**
   * Start the image download process
   */
  private async startImageDownload(): Promise<void> {
    try {
      // Show loading state
      this.showProgressOverlay();
      
      // Collect images
      const images = await this.collectImages();
      
      if (images.length === 0) {
        this.hideProgressOverlay();
        alert('No images found on this page.');
        return;
      }

      // Confirm download
      const confirmMessage = `Found ${images.length} images. Do you want to download them as a zip file?`;
      if (!confirm(confirmMessage)) {
        this.hideProgressOverlay();
        return;
      }

      // Start download with progress tracking
      const progress = await this.downloadAllImages(images, (progress) => {
        this.updateProgressOverlay(progress);
      });

      // Show results
      setTimeout(() => {
        this.hideProgressOverlay();
        const message = `Zip file created and downloaded!\n✅ ${progress.completed} images included\n❌ ${progress.failed} failed`;
        alert(message);
      }, 1000);

    } catch (error) {
      this.hideProgressOverlay();
      console.error('Image download failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Show progress overlay
   */
  private showProgressOverlay(): void {
    const existing = document.getElementById('image-downloader-progress');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'image-downloader-progress';
    overlay.className = 'image-downloader-progress';
    overlay.innerHTML = `
      <div>📦 Creating zip file...</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
      <div class="progress-text">Preparing images...</div>
    `;

    document.body.appendChild(overlay);
  }

  /**
   * Update progress overlay
   */
  private updateProgressOverlay(progress: DownloadProgress): void {
    const overlay = document.getElementById('image-downloader-progress');
    if (!overlay) return;

    const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
    const progressFill = overlay.querySelector('.progress-fill') as HTMLElement;
    const progressText = overlay.querySelector('.progress-text') as HTMLElement;

    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }

    if (progressText) {
      progressText.textContent = `${progress.completed}/${progress.total} images added to zip`;
    }
  }

  /**
   * Hide progress overlay
   */
  private hideProgressOverlay(): void {
    const overlay = document.getElementById('image-downloader-progress');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Remove the downloader UI
   */
  public removeDownloaderUI(): void {
    const container = document.getElementById('dev-support-image-downloader');
    if (container) {
      container.remove();
    }

    const styles = document.getElementById('dev-support-image-downloader-styles');
    if (styles) {
      styles.remove();
    }
  }
}