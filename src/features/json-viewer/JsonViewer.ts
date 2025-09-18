interface JsonNode {
  key?: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  expanded?: boolean;
  path: string;
}

interface JsonViewerOptions {
  theme?: 'dark' | 'light';
  collapsible?: boolean;
  searchable?: boolean;
  copyable?: boolean;
  formattable?: boolean;
}

export class JsonViewer {
  private container: HTMLElement;
  private jsonData: any;
  private options: JsonViewerOptions;
  private searchTerm: string = '';
  private expandedPaths: Set<string> = new Set();
  private isFormattedView: boolean = false;

  constructor(container: HTMLElement, jsonData: any, options: JsonViewerOptions = {}) {
    this.container = container;
    this.jsonData = jsonData;
    this.options = {
      theme: 'dark',
      collapsible: true,
      searchable: true,
      copyable: true,
      formattable: true,
      ...options
    };
    
    // Expand all nodes by default
    this.expandAll();
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = `json-viewer json-viewer--${this.options.theme}`;
    
    if (this.options.searchable || this.options.copyable || this.options.formattable) {
      this.renderToolbar();
    }
    
    const jsonContainer = document.createElement('div');
    jsonContainer.className = 'json-viewer__content';
    
    try {
      if (this.isFormattedView) {
        this.renderFormattedJson(jsonContainer);
      } else {
        this.renderJsonNode(jsonContainer, this.jsonData, '', '');
      }
    } catch (error) {
      this.renderError(jsonContainer, 'Invalid JSON data');
    }
    
    this.container.appendChild(jsonContainer);
  }

  private renderToolbar(): void {
    const toolbar = document.createElement('div');
    toolbar.className = 'json-viewer__toolbar';
    
    if (this.options.searchable) {
      const searchContainer = document.createElement('div');
      searchContainer.className = 'json-viewer__search';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search JSON...';
      searchInput.className = 'json-viewer__search-input';
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
        this.highlightSearch();
      });
      
      searchContainer.appendChild(searchInput);
      toolbar.appendChild(searchContainer);
    }
    
    if (this.options.copyable) {
      const copyButton = document.createElement('button');
      copyButton.className = 'json-viewer__copy-btn';
      copyButton.innerHTML = '📋 Copy JSON';
      copyButton.addEventListener('click', () => this.copyToClipboard());
      toolbar.appendChild(copyButton);
    }
    
    if (this.options.formattable) {
      const formatButton = document.createElement('button');
      formatButton.className = 'json-viewer__format-btn';
      formatButton.innerHTML = this.isFormattedView ? '🌳 Tree View' : '📄 Format JSON';
      formatButton.addEventListener('click', () => this.toggleFormat());
      toolbar.appendChild(formatButton);
    }
    
    if (!this.isFormattedView) {
      const expandAllButton = document.createElement('button');
      expandAllButton.className = 'json-viewer__expand-btn';
      expandAllButton.innerHTML = '⬇️ Expand All';
      expandAllButton.addEventListener('click', () => this.expandAll());
      
      const collapseAllButton = document.createElement('button');
      collapseAllButton.className = 'json-viewer__collapse-btn';
      collapseAllButton.innerHTML = '⬆️ Collapse All';
      collapseAllButton.addEventListener('click', () => this.collapseAll());
      
      toolbar.appendChild(expandAllButton);
      toolbar.appendChild(collapseAllButton);
    }
    
    this.container.appendChild(toolbar);
  }

  private renderJsonNode(container: HTMLElement, value: any, key: string, path: string): void {
    const node = this.createJsonNode(value, key, path);
    const element = this.createNodeElement(node);
    container.appendChild(element);
  }

  private createJsonNode(value: any, key: string, path: string): JsonNode {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (value === null) {
      return { key, value, type: 'null', path: fullPath };
    }
    
    const type = Array.isArray(value) ? 'array' : typeof value;
    return {
      key,
      value,
      type: type as JsonNode['type'],
      expanded: this.expandedPaths.has(fullPath),
      path: fullPath
    };
  }

  private createNodeElement(node: JsonNode): HTMLElement {
    const element = document.createElement('div');
    element.className = 'json-viewer__node';
    element.dataset.path = node.path;
    
    if (node.type === 'object' || node.type === 'array') {
      this.renderComplexNode(element, node);
    } else {
      this.renderSimpleNode(element, node);
    }
    
    return element;
  }

  private renderComplexNode(element: HTMLElement, node: JsonNode): void {
    const header = document.createElement('div');
    header.className = 'json-viewer__node-header';
    
    if (this.options.collapsible) {
      const toggle = document.createElement('span');
      toggle.className = `json-viewer__toggle ${node.expanded ? 'json-viewer__toggle--expanded' : ''}`;
      toggle.innerHTML = node.expanded ? '▼' : '▶';
      toggle.addEventListener('click', () => this.toggleNode(node.path));
      header.appendChild(toggle);
    }
    
    if (node.key) {
      const keySpan = document.createElement('span');
      keySpan.className = 'json-viewer__key';
      keySpan.textContent = `"${node.key}": `;
      header.appendChild(keySpan);
    }
    
    const typeInfo = document.createElement('span');
    typeInfo.className = 'json-viewer__type-info';
    
    if (node.type === 'array') {
      typeInfo.textContent = `Array[${node.value.length}]`;
    } else {
      const keys = Object.keys(node.value);
      typeInfo.textContent = `Object{${keys.length}}`;
    }
    
    header.appendChild(typeInfo);
    element.appendChild(header);
    
    if (node.expanded || !this.options.collapsible) {
      const content = document.createElement('div');
      content.className = 'json-viewer__node-content';
      
      if (node.type === 'array') {
        node.value.forEach((item: any, index: number) => {
          this.renderJsonNode(content, item, index.toString(), node.path);
        });
      } else {
        Object.entries(node.value).forEach(([key, value]) => {
          this.renderJsonNode(content, value, key, node.path);
        });
      }
      
      element.appendChild(content);
    }
  }

  private renderSimpleNode(element: HTMLElement, node: JsonNode): void {
    const nodeContent = document.createElement('div');
    nodeContent.className = 'json-viewer__simple-node';
    
    if (node.key) {
      const keySpan = document.createElement('span');
      keySpan.className = 'json-viewer__key';
      keySpan.textContent = `"${node.key}": `;
      nodeContent.appendChild(keySpan);
    }
    
    const valueSpan = document.createElement('span');
    valueSpan.className = `json-viewer__value json-viewer__value--${node.type}`;
    
    if (node.type === 'string') {
      valueSpan.textContent = `"${node.value}"`;
    } else {
      valueSpan.textContent = String(node.value);
    }
    
    nodeContent.appendChild(valueSpan);
    element.appendChild(nodeContent);
  }

  private renderError(container: HTMLElement, message: string): void {
    const errorElement = document.createElement('div');
    errorElement.className = 'json-viewer__error';
    errorElement.textContent = message;
    container.appendChild(errorElement);
  }

  private toggleNode(path: string): void {
    if (this.expandedPaths.has(path)) {
      this.expandedPaths.delete(path);
    } else {
      this.expandedPaths.add(path);
    }
    this.render();
  }

  private expandAll(): void {
    this.expandedPaths.clear();
    this.addAllPaths(this.jsonData, '');
    this.render();
  }

  private collapseAll(): void {
    this.expandedPaths.clear();
    this.render();
  }

  private addAllPaths(obj: any, currentPath: string): void {
    if (typeof obj === 'object' && obj !== null) {
      this.expandedPaths.add(currentPath);
      
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        this.addAllPaths(value, newPath);
      });
    }
  }

  private highlightSearch(): void {
    if (this.isFormattedView) {
      // For formatted view, highlight within the pre element
      const preElement = this.container.querySelector('.json-viewer__formatted-text');
      if (preElement && this.searchTerm) {
        const text = preElement.textContent || '';
        const regex = new RegExp(`(${this.searchTerm})`, 'gi');
        const highlightedText = text.replace(regex, '<mark class="json-viewer__highlighted">$1</mark>');
        preElement.innerHTML = highlightedText;
      }
    } else {
      // For tree view, highlight keys and values
      const nodes = this.container.querySelectorAll('.json-viewer__key, .json-viewer__value');
      nodes.forEach((node) => {
        const text = node.textContent || '';
        if (this.searchTerm && text.toLowerCase().includes(this.searchTerm)) {
          node.classList.add('json-viewer__highlighted');
        } else {
          node.classList.remove('json-viewer__highlighted');
        }
      });
    }
  }

  private async copyToClipboard(): Promise<void> {
    try {
      const jsonString = JSON.stringify(this.jsonData, null, 2);
      await navigator.clipboard.writeText(jsonString);
      
      const copyBtn = this.container.querySelector('.json-viewer__copy-btn') as HTMLElement;
      if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✅ Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy JSON:', error);
    }
  }

  public updateData(jsonData: any): void {
    this.jsonData = jsonData;
    this.render();
  }

  private renderFormattedJson(container: HTMLElement): void {
    const formattedContainer = document.createElement('div');
    formattedContainer.className = 'json-viewer__formatted-container';
    
    const preElement = document.createElement('pre');
    preElement.className = 'json-viewer__formatted-text';
    preElement.textContent = JSON.stringify(this.jsonData, null, 2);
    
    formattedContainer.appendChild(preElement);
    container.appendChild(formattedContainer);
  }

  private toggleFormat(): void {
    this.isFormattedView = !this.isFormattedView;
    this.render();
  }

  public destroy(): void {
    this.container.innerHTML = '';
    this.expandedPaths.clear();
  }
}