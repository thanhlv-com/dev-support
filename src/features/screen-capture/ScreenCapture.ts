interface ScreenCaptureOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  filename?: string;
  fullPage?: boolean;
}

interface CaptureResponse {
  success: boolean;
  dataUrl?: string;
  filename?: string;
  error?: string;
}

export class ScreenCapture {
  private static instance: ScreenCapture;
  private isCapturing: boolean = false;

  private constructor() {}

  public static getInstance(): ScreenCapture {
    if (!ScreenCapture.instance) {
      ScreenCapture.instance = new ScreenCapture();
    }
    return ScreenCapture.instance;
  }

  public async captureFullPage(options: ScreenCaptureOptions = {}): Promise<CaptureResponse> {
    if (this.isCapturing) {
      return {
        success: false,
        error: 'Screen capture already in progress'
      };
    }

    try {
      this.isCapturing = true;
      
      const defaultOptions: Required<ScreenCaptureOptions> = {
        format: 'png',
        quality: 90, // Integer value (0-100)
        filename: this.generateFilename(),
        fullPage: true
      };

      const captureOptions = { ...defaultOptions, ...options };

      // Request screen capture from background script
      const response = await this.requestScreenCapture(captureOptions);
      
      if (response.success && response.dataUrl) {
        // Download the image
        await this.downloadImage(response.dataUrl, captureOptions.filename);
        
        return {
          success: true,
          dataUrl: response.dataUrl,
          filename: captureOptions.filename
        };
      }

      return response;
    } catch (error) {
      console.error('Screen capture failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    } finally {
      this.isCapturing = false;
    }
  }

  public async captureVisible(options: ScreenCaptureOptions = {}): Promise<CaptureResponse> {
    if (this.isCapturing) {
      return {
        success: false,
        error: 'Screen capture already in progress'
      };
    }

    try {
      this.isCapturing = true;
      
      const defaultOptions: Required<ScreenCaptureOptions> = {
        format: 'png',
        quality: 90, // Integer value (0-100)
        filename: this.generateFilename(),
        fullPage: false
      };

      const captureOptions = { ...defaultOptions, ...options };

      // Request screen capture from background script
      const response = await this.requestScreenCapture(captureOptions);
      
      if (response.success && response.dataUrl) {
        // Download the image
        await this.downloadImage(response.dataUrl, captureOptions.filename);
        
        return {
          success: true,
          dataUrl: response.dataUrl,
          filename: captureOptions.filename
        };
      }

      return response;
    } catch (error) {
      console.error('Screen capture failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    } finally {
      this.isCapturing = false;
    }
  }

  private async requestScreenCapture(options: Required<ScreenCaptureOptions>): Promise<CaptureResponse> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'captureScreen',
        options
      }, (response: CaptureResponse) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response);
        }
      });
    });
  }

  private async downloadImage(dataUrl: string, filename: string): Promise<void> {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to download image:', error);
      throw error;
    }
  }

  private generateFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .substring(0, 19);
    
    const domain = window.location.hostname.replace(/[^a-zA-Z0-9]/g, '-');
    
    return `screenshot-${domain}-${timestamp}.png`;
  }

  public isCapturingInProgress(): boolean {
    return this.isCapturing;
  }

  // Utility method to show capture status
  public showCaptureNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `screen-capture-notification screen-capture-notification--${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: white;
      background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideInRight 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            document.body.removeChild(notification);
          }
          if (style.parentNode) {
            document.head.removeChild(style);
          }
        }, 300);
      }
    }, 3000);
  }
}

// Export singleton instance
export const screenCapture = ScreenCapture.getInstance();