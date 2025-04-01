import ArticleData from './articleData.js'; // Assuming you have a separate file for article content

class EncartaCloneApp {
    constructor(os, windowObject, appInfo) {
        this.os = os;
        this.window = windowObject;
        this.appInfo = appInfo;
        this.contentEl = windowObject.body; // The main content area of the window
        this.elements = {}; // To store references to UI elements

        // Encarta specific state
        this.articles = {}; // Will hold loaded article data { id: { title: ..., content: ... } }
        this.categories = []; // Could hold category structure
        this.currentArticleId = null;
        this.searchTerm = '';
        this.searchIndex = null; // For more efficient searching later

        console.log(`Encarta Clone App (${appInfo.id}) instantiated.`);
        if (!this.contentEl) {
             console.error("EncartaCloneApp: windowObject.body is missing!");
        }
    }

    init() {
        console.log(`Encarta Clone App (${this.appInfo.id}) initializing...`);
        if (!this.contentEl) return;

        this.loadContent(); // Load articles first
        this.setupDOM();
        this.setupStyles();
        this.setupEventListeners();
        this.renderNavigation(); // Initial population of nav/categories
        this.renderArticle('welcome'); // Show a default welcome article

        // Adjust window size for Encarta (larger than calculator)
        this.window.element.style.width = '750px';
        this.window.element.style.height = '550px';
        this.window.element.style.minWidth = '400px';
        this.window.element.style.minHeight = '300px';
        // Encarta windows were typically resizable
    }

    // --- Content Loading ---

    loadContent() {
        console.log('Loading Encarta content...');
        // In a real app, this would fetch from a DB, JSON files, etc.
        // For this example, we'll use the imported dummy data
        this.articles = ArticleData.getArticles();
        this.categories = ArticleData.getCategories(); // Get category structure if defined

        // TODO: Build a search index (e.g., using Lunr.js or simple keyword matching)
        this.buildSearchIndex();

        console.log(`Loaded ${Object.keys(this.articles).length} articles.`);
    }

    buildSearchIndex() {
        // Placeholder for search index creation
        // For now, search will be a simple linear scan
        console.log("Search index build skipped (using simple scan).");
    }


    // --- UI Setup ---

    setupDOM() {
        this.contentEl.innerHTML = `
            <div class="encarta-container">
                <div class="encarta-toolbar">
                    <button data-action="back" title="Back" disabled>◀</button>
                    <button data-action="forward" title="Forward" disabled>▶</button>
                    <button data-action="home" title="Home/Contents">🏠</button>
                    <span class="toolbar-separator"></span>
                    <input type="search" class="search-input" placeholder="Find articles...">
                    <button data-action="search" class="search-button">Find</button>
                </div>
                <div class="encarta-main-area">
                    <div class="navigation-panel">
                        <h4>Contents</h4>
                        <ul class="category-list">
                            </ul>
                    </div>
                    <div class="content-panel">
                        <div class="article-content">
                            Select an article from the Contents list.
                        </div>
                    </div>
                </div>
                <div class="status-bar">
                    Ready.
                </div>
            </div>
        `;

        // Store references
        this.elements.container = this.contentEl.querySelector('.encarta-container');
        this.elements.toolbar = this.contentEl.querySelector('.encarta-toolbar');
        this.elements.backButton = this.contentEl.querySelector('button[data-action="back"]');
        this.elements.forwardButton = this.contentEl.querySelector('button[data-action="forward"]');
        this.elements.homeButton = this.contentEl.querySelector('button[data-action="home"]');
        this.elements.searchInput = this.contentEl.querySelector('.search-input');
        this.elements.searchButton = this.contentEl.querySelector('.search-button');
        this.elements.navPanel = this.contentEl.querySelector('.navigation-panel');
        this.elements.categoryList = this.contentEl.querySelector('.category-list');
        this.elements.contentPanel = this.contentEl.querySelector('.content-panel');
        this.elements.articleContent = this.contentEl.querySelector('.article-content');
        this.elements.statusBar = this.contentEl.querySelector('.status-bar');
    }

    setupStyles() {
        const styleId = 'encarta-clone-styles';
        if (document.getElementById(styleId)) return;
        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        // Windows 95 UI styles
        styleSheet.textContent = `
            .encarta-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background-color: var(--bg-color-window); /* Use variable */
                font-family: var(--font-primary); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                font-size: 12px;
                overflow: hidden;
            }

            /* Toolbar */
            .encarta-toolbar {
                display: flex;
                align-items: center;
                padding: 3px;
                border-bottom: 1px solid var(--border-color-dark); /* Use variable */
                box-shadow: inset 0 -1px 0 var(--border-color-light); /* Use variable */
                flex-shrink: 0;
            }
            .encarta-toolbar button {
                /* font-family: 'Marlett', 'Webdings', sans-serif; */ /* Keep specific font for symbols if needed */
                font-size: 14px;
                min-width: 24px;
                height: 24px;
                margin-right: 3px;
                background-color: var(--bg-color-button); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                border: 1px solid;
                border-color: var(--border-color-button-outset); /* Use variable */
                box-shadow: 1px 1px 0px var(--shadow-color-button); /* Use variable */
                cursor: pointer;
            }
            .encarta-toolbar button:disabled {
                color: var(--text-color-disabled); /* Use variable */
                 border-color: var(--bg-color-window); /* Use variable */
                 box-shadow: none;
                 text-shadow: 1px 1px 0 var(--border-color-light); /* Use variable */
                 cursor: default;
            }
            .encarta-toolbar button:active:not(:disabled) {
                border-color: var(--border-color-button-inset); /* Use variable */
                box-shadow: none;
                background-color: var(--bg-color-button-active); /* Use variable */
            }
             .encarta-toolbar .search-button {
                font-family: var(--font-primary); /* Use variable */
                 font-size: 12px;
                 min-width: 50px;
                 margin-left: 3px;
             }
            .toolbar-separator {
                width: 1px;
                height: 20px;
                background-color: var(--border-color-dark); /* Use variable */
                box-shadow: 1px 0 0 var(--border-color-light); /* Use variable */
                margin: 0 5px;
            }
            .search-input {
                flex-grow: 1;
                height: 22px;
                border: 1px solid;
                border-color: var(--border-color-dark) var(--border-color-light) var(--border-color-light) var(--border-color-dark); /* Sunken */
                /* box-shadow: inset 1px 1px 0 #000; */ /* Replaced by border */
                padding: 2px 4px;
                margin-left: 5px;
                 font-family: inherit;
                 font-size: inherit;
                 background-color: var(--bg-color-input); /* Use variable */
                 color: var(--text-color-default); /* Use variable */
            }

            /* Main Area */
            .encarta-main-area {
                display: flex;
                flex-grow: 1;
                overflow: hidden;
                border-top: 1px solid var(--border-color-light); /* Use variable */
                 border-bottom: 1px solid var(--border-color-dark); /* Use variable */
            }

            /* Navigation Panel */
            .navigation-panel {
                width: 200px;
                min-width: 150px;
                background-color: var(--bg-color-input); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                border-right: 1px solid var(--border-color-dark); /* Use variable */
                 box-shadow: inset 1px 0 0 var(--border-color-black); /* Use variable */
                padding: 5px;
                overflow-y: auto;
                flex-shrink: 0;
            }
            .navigation-panel h4 {
                margin: 0 0 5px 0;
                font-size: 13px;
                font-weight: bold;
                border-bottom: 1px solid var(--bg-color-window); /* Use variable */
                padding-bottom: 3px;
            }
            .navigation-panel ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .navigation-panel li {
                padding: 3px 5px;
                cursor: pointer;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .navigation-panel li:hover {
                background-color: var(--bg-color-selected); /* Use variable */
                color: var(--text-color-light); /* Use variable */
            }
             .navigation-panel li.active {
                 background-color: var(--bg-color-selected); /* Use variable */
                 color: var(--text-color-light); /* Use variable */
             }

            /* Content Panel */
            .content-panel {
                flex-grow: 1;
                background-color: var(--bg-color-input); /* Use variable */
                color: var(--text-color-default); /* Use variable */
                overflow-y: auto;
                padding: 15px;
            }
            .article-content h1, .article-content h2 {
                font-family: 'Times New Roman', serif;
                margin-top: 0;
                margin-bottom: 10px;
                 color: var(--bg-color-title-active); /* Use variable */
            }
             .article-content h1 { font-size: 24px; }
             .article-content h2 { font-size: 18px; }
             .article-content p {
                 line-height: 1.5;
                 margin-bottom: 12px;
             }
             .article-content img {
                 max-width: 100%;
                 height: auto;
                 margin: 10px 0;
                 border: 1px solid var(--bg-color-window); /* Use variable */
             }
              .article-content a {
                color: var(--text-color-link); /* Use variable */
                text-decoration: underline;
                cursor: pointer;
              }


            /* Status Bar */
            .status-bar {
                padding: 2px 5px;
                border-top: 1px solid var(--border-color-light); /* Use variable */
                box-shadow: inset 0 1px 0 var(--border-color-dark); /* Use variable */
                font-size: 11px;
                height: 20px;
                line-height: 16px; /* Vertically align text */
                flex-shrink: 0; /* Prevent shrinking */
                 overflow: hidden;
                 white-space: nowrap;
                 text-overflow: ellipsis;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    // --- Event Handling ---

    setupEventListeners() {
        // Use event delegation where possible

        // Toolbar clicks
        if (this.elements.toolbar) {
            this.elements.toolbar.addEventListener('click', (event) => {
                const button = event.target.closest('button');
                if (button) {
                    const action = button.dataset.action;
                    if (action === 'search') {
                        this.handleSearch();
                    } else if (action === 'home') {
                        this.goHome();
                    }
                    // TODO: Implement Back/Forward history
                }
            });
        }

        // Search input 'Enter' key
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    this.handleSearch();
                }
            });
        }

        // Navigation clicks
        if (this.elements.categoryList) {
            this.elements.categoryList.addEventListener('click', (event) => {
                const listItem = event.target.closest('li[data-id]');
                if (listItem) {
                    const articleId = listItem.dataset.id;
                    this.renderArticle(articleId);
                }
            });
        }

         // Handle clicks within rendered article content (e.g., for internal links)
         if (this.elements.articleContent) {
             this.elements.articleContent.addEventListener('click', (event) => {
                 if (event.target.tagName === 'A' && event.target.dataset.linktype === 'internal') {
                     event.preventDefault(); // Prevent default link navigation
                     const targetId = event.target.dataset.targetid;
                     if (targetId) {
                         this.renderArticle(targetId);
                     }
                 }
             });
         }
    }

    // --- Application Logic ---

    renderNavigation(articleList = this.articles) {
        if (!this.elements.categoryList) return;

        // Simple list of all articles for now
        // TODO: Implement hierarchical categories if `this.categories` is structured
        this.elements.categoryList.innerHTML = ''; // Clear previous list

        Object.entries(articleList).forEach(([id, article]) => {
            if (id === 'welcome') return; // Don't list the welcome message itself typically
            const li = document.createElement('li');
            li.textContent = article.title;
            li.dataset.id = id;
             if (id === this.currentArticleId) {
                 li.classList.add('active');
             }
            this.elements.categoryList.appendChild(li);
        });

        this.updateStatusBar(`Showing ${Object.keys(articleList).length} items.`);
    }

     highlightNavItem(articleId) {
         if (!this.elements.categoryList) return;
         // Remove previous active class
         const currentActive = this.elements.categoryList.querySelector('.active');
         if (currentActive) {
             currentActive.classList.remove('active');
         }
         // Add active class to the new item
         const newItem = this.elements.categoryList.querySelector(`li[data-id="${articleId}"]`);
         if (newItem) {
             newItem.classList.add('active');
         }
     }

    renderArticle(articleId) {
        if (!this.elements.articleContent || !this.articles[articleId]) {
            this.elements.articleContent.innerHTML = `<p>Error: Article "${articleId}" not found.</p>`;
            this.updateStatusBar(`Article "${articleId}" not found.`);
            this.currentArticleId = null;
            this.highlightNavItem(null);
            return;
        }

        const article = this.articles[articleId];
        this.currentArticleId = articleId;

        // Basic HTML rendering (sanitize in real app if content is dynamic)
        // Add internal link markup dynamically if needed
        let processedContent = article.content;
        // Example: Replace [[Internal Link Title]] with actual links
        processedContent = processedContent.replace(/\[\[([^\]]+)\]\]/g, (match, linkTitle) => {
            const targetId = this.findArticleIdByTitle(linkTitle.trim());
            if (targetId) {
                return `<a href="#" data-linktype="internal" data-targetid="${targetId}">${linkTitle}</a>`;
            } else {
                return `<span style="color: red;">${linkTitle} (not found)</span>`; // Indicate broken link
            }
        });


        this.elements.articleContent.innerHTML = `
            <h1>${article.title}</h1>
            ${processedContent}
        `;
        this.elements.contentPanel.scrollTop = 0; // Scroll to top on new article load
        this.updateStatusBar(`Displaying: ${article.title}`);
        this.highlightNavItem(articleId);

        // TODO: Update Back/Forward history stack
    }

     findArticleIdByTitle(title) {
         for (const [id, article] of Object.entries(this.articles)) {
             if (article.title.toLowerCase() === title.toLowerCase()) {
                 return id;
             }
         }
         return null; // Not found
     }


    handleSearch() {
        if (!this.elements.searchInput) return;
        const searchTerm = this.elements.searchInput.value.trim().toLowerCase();

        if (!searchTerm) {
            this.renderNavigation(this.articles); // Show all if search is cleared
            this.updateStatusBar("Search cleared. Showing all articles.");
            return;
        }

        this.updateStatusBar(`Searching for "${searchTerm}"...`);

        // Simple search implementation (case-insensitive title/content check)
        // Replace with index search for performance later
        const results = {};
        let count = 0;
        for (const [id, article] of Object.entries(this.articles)) {
            if (article.title.toLowerCase().includes(searchTerm) || article.content.toLowerCase().includes(searchTerm)) {
                results[id] = article;
                count++;
            }
        }

        this.renderNavigation(results); // Display only search results
        this.updateStatusBar(`Found ${count} results for "${searchTerm}".`);
    }

     goHome() {
         // Go back to the main contents view and potentially a 'welcome' or 'home' article
         this.renderNavigation(this.articles);
         this.renderArticle('welcome'); // Assumes a 'welcome' article exists
         if(this.elements.searchInput) this.elements.searchInput.value = ''; // Clear search
         this.updateStatusBar("Contents");
     }

    updateStatusBar(text) {
        if (this.elements.statusBar) {
            this.elements.statusBar.textContent = text;
            this.elements.statusBar.title = text; // Show full text on hover if cut off
        }
    }

    // --- Cleanup ---

    destroy() {
        console.log(`Encarta Clone App (${this.appInfo.id}) destroying...`);
        // Remove event listeners (though garbage collection might handle if no other refs exist)
        // ... (remove specific listeners if necessary)

        // Remove the dynamically added stylesheet
        const styleElement = document.getElementById('encarta-clone-styles');
        if (styleElement) {
            styleElement.remove();
        }

        // Clear references
        this.elements = {};
        this.articles = {};
        this.categories = [];
        this.contentEl.innerHTML = ''; // Clear the window body
        console.log(`Encarta Clone App (${this.appInfo.id}) destroyed.`);
    }
}

export default EncartaCloneApp;
