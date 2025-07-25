// Simple Diff Viewer for text comparison
class DiffViewer {
    static generateDiff(text1, text2) {
        // Simple word-based diff implementation
        const words1 = text1.split(/(\s+)/);
        const words2 = text2.split(/(\s+)/);

        const diff = [];
        let i = 0, j = 0;

        while (i < words1.length || j < words2.length) {
            if (i >= words1.length) {
                // Remaining words in text2 are additions
                diff.push({ type: 'added', value: words2[j] });
                j++;
            } else if (j >= words2.length) {
                // Remaining words in text1 are deletions
                diff.push({ type: 'removed', value: words1[i] });
                i++;
            } else if (words1[i] === words2[j]) {
                // Words match
                diff.push({ type: 'equal', value: words1[i] });
                i++;
                j++;
            } else {
                // Words differ - simple approach: mark as changed
                diff.push({ type: 'removed', value: words1[i] });
                diff.push({ type: 'added', value: words2[j] });
                i++;
                j++;
            }
        }

        return diff;
    }

    static renderInlineDiff(diff) {
        return diff.map(part => {
            const className = part.type === 'added' ? 'diff-added' :
                part.type === 'removed' ? 'diff-removed' : '';
            return className ?
                `<span class="${className}">${this.escapeHtml(part.value)}</span>` :
                this.escapeHtml(part.value);
        }).join('');
    }

    static renderSideBySideDiff(text1, text2) {
        const diff = this.generateDiff(text1, text2);

        let leftSide = '';
        let rightSide = '';

        diff.forEach(part => {
            if (part.type === 'equal') {
                leftSide += this.escapeHtml(part.value);
                rightSide += this.escapeHtml(part.value);
            } else if (part.type === 'removed') {
                leftSide += `<span class="diff-removed">${this.escapeHtml(part.value)}</span>`;
            } else if (part.type === 'added') {
                rightSide += `<span class="diff-added">${this.escapeHtml(part.value)}</span>`;
            }
        });

        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <h6>Ground Truth:</h6>
                    <div class="diff-view">${leftSide}</div>
                </div>
                <div>
                    <h6>Model Response:</h6>
                    <div class="diff-view">${rightSide}</div>
                </div>
            </div>`;
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Individual File Loader for loading detailed image results
class IndividualFileLoader {
    constructor(fetchFunction) {
        this.fetchWithTimeout = fetchFunction;
        this.cache = new Map();
    }

    async loadIndividualFiles(filePaths) {
        const results = {
            successful: [],
            failed: [],
            data: {}
        };

        const loadPromises = filePaths.map(async (filePath) => {
            try {
                // Check cache first
                if (this.cache.has(filePath)) {
                    return { filePath, data: this.cache.get(filePath), success: true, cached: true };
                }

                const data = await this.fetchWithTimeout(`json/${filePath}`);
                const processedData = this.processImageData(data, filePath);

                // Cache the processed data
                this.cache.set(filePath, processedData);

                return { filePath, data: processedData, success: true, cached: false };
            } catch (error) {
                console.warn(`Failed to load ${filePath}:`, error.message);
                return { filePath, error: error.message, success: false };
            }
        });

        const loadResults = await Promise.all(loadPromises);

        loadResults.forEach(result => {
            if (result.success) {
                results.successful.push(result);
                results.data[result.filePath] = result.data;
            } else {
                results.failed.push(result);
            }
        });



        return results;
    }

    processImageData(rawData, filePath) {
        // Extract filename for display
        const filename = filePath.split('/').pop().replace('.json', '');

        // Validate and normalize the data structure
        const processedData = {
            filename: filename,
            filePath: filePath,
            models: {}
        };

        // Process each model's data
        Object.entries(rawData).forEach(([modelName, modelData]) => {
            if (this.validateModelData(modelData)) {
                processedData.models[modelName] = {
                    groundTruth: modelData.gt || '',
                    response: modelData.response || '',
                    wer: modelData.wer || 0,
                    cer: modelData.cer || 0,
                    accuracy: modelData.accuracy || 0,
                    time: modelData.time || 0
                };
            } else {
                console.warn(`Invalid data structure for model ${modelName} in ${filePath}`);
            }
        });

        return processedData;
    }

    validateModelData(modelData) {
        const requiredKeys = ['gt', 'response', 'wer', 'cer', 'accuracy', 'time'];
        return typeof modelData === 'object' &&
            modelData !== null &&
            requiredKeys.every(key => key in modelData);
    }

    handleLoadingErrors(errors) {
        if (errors.length === 0) return;

        console.error(`Failed to load ${errors.length} files:`, errors);

        // Could implement retry logic here
        const retryableErrors = errors.filter(error =>
            error.error.includes('timeout') || error.error.includes('network')
        );

        // Could implement retry logic here if needed
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheSize() {
        return this.cache.size;
    }
}

// URL Router for handling navigation between dashboard and details view
class URLRouter {
    constructor() {
        this.currentView = 'dashboard';
        this.currentParams = {};
        this.setupHistoryHandling();
        this.parseCurrentURL();
    }

    parseCurrentURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const view = urlParams.get('view') || 'dashboard';
        const category = urlParams.get('category');
        const subcategory = urlParams.get('subcategory');

        this.currentView = view;
        this.currentParams = {
            category: category,
            subcategory: subcategory
        };
    }

    getCurrentView() {
        return this.currentView;
    }

    getParams() {
        return { ...this.currentParams };
    }

    navigateTo(view, params = {}) {
        this.currentView = view;
        this.currentParams = { ...params };

        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('view', view);

        if (params.category) {
            url.searchParams.set('category', params.category);
        } else {
            url.searchParams.delete('category');
        }

        if (params.subcategory) {
            url.searchParams.set('subcategory', params.subcategory);
        } else {
            url.searchParams.delete('subcategory');
        }

        window.history.pushState({ view, params }, '', url);

        // Trigger view change
        this.onViewChange(view, params);
    }

    setupHistoryHandling() {
        window.addEventListener('popstate', (event) => {
            this.parseCurrentURL();
            this.onViewChange(this.currentView, this.currentParams);
        });
    }

    onViewChange(view, params) {
        // This will be overridden by the dashboard
    }

    validateParams(params) {
        // Basic validation for required parameters
        if (params.category && !params.subcategory) {
            return false;
        }
        return true;
    }
}

class BenchmarkDashboard {
    constructor() {
        this.data = {};
        this.manifest = {};
        this.router = new URLRouter();
        this.router.onViewChange = (view, params) => this.handleViewChange(view, params);
        this.fileLoader = new IndividualFileLoader((url, timeout) => this.fetchWithTimeout(url, timeout));
        this.init();
    }

    async init() {
        console.log('Starting to load data...');
        document.getElementById('overall-stats').innerHTML = '<div class="loading">Loading data...</div>';
        document.getElementById('model-averages').innerHTML = '<div class="loading">Loading data...</div>';
        document.getElementById('results-container').innerHTML = '<div class="loading">Loading data...</div>';

        try {
            await this.loadData();
            console.log('Data loaded successfully');

            // Handle initial view based on URL
            const currentView = this.router.getCurrentView();
            const params = this.router.getParams();
            this.handleViewChange(currentView, params);

        } catch (error) {
            console.error('Error loading data:', error);
            document.getElementById('overall-stats').innerHTML = `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
            document.getElementById('model-averages').innerHTML = `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
            document.getElementById('results-container').innerHTML = `<div style="color: red; padding: 20px;">Error: ${error.message}</div>`;
        }
    }

    handleViewChange(view, params) {
        if (view === 'details' && params.category && params.subcategory) {
            this.showDetailsView(params.category, params.subcategory);
        } else {
            this.showDashboardView();
        }
    }

    showDashboardView() {
        // Show main dashboard sections
        document.getElementById('overall-stats').style.display = 'block';
        document.getElementById('model-averages').style.display = 'block';
        document.getElementById('results-container').style.display = 'block';

        // Hide details view (will be created later)
        const detailsView = document.getElementById('details-view');
        if (detailsView) {
            detailsView.style.display = 'none';
        }

        // Render dashboard content
        this.renderOverallStats();
        this.renderModelAverages();
        this.renderResults();
    }

    async showDetailsView(category, subcategory) {
        // Hide main dashboard sections
        document.getElementById('overall-stats').style.display = 'none';
        document.getElementById('model-averages').style.display = 'none';
        document.getElementById('results-container').style.display = 'none';

        // Show details view
        const detailsView = document.getElementById('details-view');
        detailsView.style.display = 'block';

        // Update breadcrumb and title
        document.getElementById('breadcrumb-path').textContent = `${category} > ${subcategory}`;
        document.getElementById('details-title').textContent = `${subcategory} - Detailed Results`;

        // Show loading state
        document.getElementById('details-content').innerHTML = '<div class="loading">Loading detailed results...</div>';

        try {
            await this.loadAndRenderDetails(category, subcategory);
        } catch (error) {
            console.error('Error loading details:', error);
            document.getElementById('details-content').innerHTML =
                `<div style="color: red; padding: 20px;">Error loading details: ${error.message}</div>`;
        }
    }

    async loadAndRenderDetails(category, subcategory) {
        // Get individual files from manifest
        const subcategoryInfo = this.manifest.structure[category]?.[subcategory];
        if (!subcategoryInfo || !subcategoryInfo.individual_files) {
            throw new Error('No individual files found for this category');
        }

        const individualFiles = subcategoryInfo.individual_files;


        // Load individual files
        const loadResults = await this.fileLoader.loadIndividualFiles(individualFiles);

        // Handle any loading errors
        this.fileLoader.handleLoadingErrors(loadResults.failed);

        if (loadResults.successful.length === 0) {
            throw new Error('No individual files could be loaded');
        }

        // Render the details
        this.renderDetailsContent(loadResults.data, category, subcategory);

        // Set up filtering and sorting
        this.setupDetailsControls(loadResults.data);
    }

    renderDetailsContent(imageData, category, subcategory) {
        const imageFiles = Object.values(imageData);

        if (imageFiles.length === 0) {
            document.getElementById('details-content').innerHTML =
                '<div class="no-data">No image data available</div>';
            return;
        }

        let html = '';

        imageFiles.forEach(imageResult => {
            html += this.renderImageResult(imageResult);
        });

        document.getElementById('details-content').innerHTML = html;
    }

    renderImageResult(imageResult) {
        const { filename, models } = imageResult;
        const modelNames = Object.keys(models);

        if (modelNames.length === 0) {
            return `<div class="image-result">
                <div class="image-result-header" onclick="this.nextElementSibling.classList.toggle('show'); this.classList.toggle('expanded')">
                    <div class="image-result-title">
                        ${filename}
                    </div>
                </div>
                <div class="image-result-content">
                    <p>No model results available</p>
                </div>
            </div>`;
        }

        // Get ground truth from first model (should be same for all)
        const groundTruth = models[modelNames[0]].groundTruth;

        let html = `
            <div class="image-result" data-filename="${filename}">
                <div class="image-result-header" onclick="this.nextElementSibling.classList.toggle('show'); this.classList.toggle('expanded')">
                    <div class="image-result-title">
                        ${filename}
                    </div>
                </div>
                
                <div class="image-result-content">
                    <div class="ground-truth">
                        <h4>Ground Truth:</h4>
                        <div class="ground-truth-text">${this.escapeHtml(groundTruth)}</div>
                    </div>
                    
                    <div class="model-responses">`;

        // Sort models by accuracy (highest first)
        const sortedModels = modelNames.sort((a, b) =>
            models[b].accuracy - models[a].accuracy
        );

        sortedModels.forEach(modelName => {
            const modelData = models[modelName];
            html += this.renderModelResponse(modelName, modelData, groundTruth);
        });

        html += `
                    </div>
                </div>
            </div>`;

        return html;
    }

    renderModelResponse(modelName, modelData, groundTruth) {
        const { response, wer, cer, accuracy, time } = modelData;

        return `
            <div class="model-response" data-model="${modelName}">
                <h5>
                    ${modelName}
                    <button class="diff-button" onclick="dashboard.toggleDiff(this, '${this.escapeHtml(groundTruth)}', '${this.escapeHtml(response)}')">
                        Show Diff
                    </button>
                </h5>
                
                <div class="model-metrics">
                    <span class="metric">Accuracy: ${accuracy.toFixed(1)}%</span>
                    <span class="metric">WER: ${wer.toFixed(1)}%</span>
                    <span class="metric">CER: ${cer.toFixed(1)}%</span>
                    <span class="metric">Time: ${time.toFixed(2)}s</span>
                </div>
                
                <div class="model-response-text">${this.escapeHtml(response)}</div>
                <div class="diff-container" style="display: none;"></div>
            </div>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getImageCount(categoryName, subcategoryName) {
        // Try to get image count from manifest first (most up-to-date)
        if (this.manifest &&
            this.manifest.structure &&
            this.manifest.structure[categoryName] &&
            this.manifest.structure[categoryName][subcategoryName] &&
            this.manifest.structure[categoryName][subcategoryName].image_count) {
            return this.manifest.structure[categoryName][subcategoryName].image_count;
        }

        // Fallback to aggregated data if manifest doesn't have it
        if (this.data[categoryName] &&
            this.data[categoryName][subcategoryName] &&
            Object.values(this.data[categoryName][subcategoryName]).length > 0) {
            return Object.values(this.data[categoryName][subcategoryName])[0].images;
        }

        // Default fallback
        return 0;
    }

    getTotalImagesFromManifest() {
        let totalImages = 0;

        if (this.manifest && this.manifest.structure) {
            // Sum up all image counts from manifest
            Object.values(this.manifest.structure).forEach(category => {
                Object.values(category).forEach(subcategory => {
                    if (subcategory.image_count) {
                        totalImages += subcategory.image_count;
                    }
                });
            });
        }

        // Fallback to aggregated data if manifest doesn't have counts
        if (totalImages === 0) {
            Object.values(this.data).forEach(category => {
                Object.values(category).forEach(subcategory => {
                    if (Object.values(subcategory).length > 0) {
                        totalImages += Object.values(subcategory)[0].images;
                    }
                });
            });
        }

        return totalImages;
    }

    async fetchWithTimeout(url, timeout = 5000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            // Add cache-busting parameter to ensure fresh data
            const cacheBustUrl = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
            const response = await fetch(cacheBustUrl, {
                signal: controller.signal,
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Timeout loading ${url}`);
            }
            throw error;
        }
    }

    async loadData() {
        try {
            console.log('Loading file manifest...');

            // Load the manifest file that lists JSON files
            const manifest = await this.fetchWithTimeout('json/manifest.json');
            this.manifest = manifest; // Store for later use
            console.log(`Manifest loaded with ${manifest.files?.length || 0} files`);

            // Update last update timestamp
            if (manifest.generated) {
                const date = new Date(manifest.generated);
                document.getElementById('last-update').textContent = date.toLocaleString();
            }

            if (!manifest.files || manifest.files.length === 0) {
                throw new Error('No files listed in manifest');
            }

            // Try to load each file listed in the manifest
            const loadPromises = manifest.files.map(async filename => {
                try {
                    const data = await this.fetchWithTimeout(`json/${filename}`);
                    return { filename, data, success: true };
                } catch (error) {
                    return { filename, error: error.message, success: false };
                }
            });

            const results = await Promise.all(loadPromises);
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            if (successful.length === 0) {
                throw new Error('No JSON files could be loaded from the manifest');
            }



            // Organize data using the manifest structure
            this.data = {};

            // Use the structure from manifest if available, otherwise organize by filename
            if (manifest.structure) {
                // Initialize categories from manifest
                Object.keys(manifest.structure).forEach(categoryName => {
                    this.data[categoryName] = {};
                });

                // Place loaded data into appropriate categories
                successful.forEach(({ filename, data }) => {
                    // Extract just the final part of the path (e.g., "1471-Orthographia-Tortellius" from "GT4HistOCR/corpus/EarlyModernLatin/1471-Orthographia-Tortellius.json")
                    const nameWithoutExt = filename.split('/').pop().replace('.json', '');
                    let placed = false;

                    // Try to find the right category from manifest structure
                    Object.entries(manifest.structure).forEach(([categoryName, subcategories]) => {
                        // Handle both old format (array) and new format (object)
                        const subcategoryNames = Array.isArray(subcategories)
                            ? subcategories
                            : Object.keys(subcategories);

                        if (subcategoryNames.includes(nameWithoutExt)) {
                            this.data[categoryName][nameWithoutExt] = data;
                            placed = true;
                        }
                    });

                    // If not found in manifest structure, use default category
                    if (!placed) {
                        const defaultCategory = 'EarlyModernLatin';
                        if (!this.data[defaultCategory]) {
                            this.data[defaultCategory] = {};
                        }
                        this.data[defaultCategory][nameWithoutExt] = data;
                    }
                });
            } else {
                // Fallback: organize by filename
                this.data['EarlyModernLatin'] = {};
                successful.forEach(({ filename, data }) => {
                    const nameWithoutExt = filename.split('/').pop().replace('.json', '');
                    this.data['EarlyModernLatin'][nameWithoutExt] = data;
                });
            }

            const totalCategories = Object.keys(this.data).length;
            const totalSubcategories = Object.values(this.data).reduce((sum, cat) => sum + Object.keys(cat).length, 0);



        } catch (error) {
            throw new Error(`Failed to load benchmark data: ${error.message}`);
        }
    }

    calculateOverallStats() {
        const allResults = [];

        Object.values(this.data).forEach(category => {
            Object.values(category).forEach(subcategory => {
                Object.values(subcategory).forEach(modelData => {
                    allResults.push(modelData);
                });
            });
        });

        if (allResults.length === 0) return null;

        const totals = allResults.reduce((acc, result) => {
            acc.wer += result.avg_wer;
            acc.cer += result.avg_cer;
            acc.accuracy += result.avg_accuracy;
            acc.time += result.avg_time;
            return acc;
        }, { wer: 0, cer: 0, accuracy: 0, time: 0 });

        // Calculate total images from manifest (most up-to-date)
        const totalImages = this.getTotalImagesFromManifest();

        const count = allResults.length;
        return {
            avg_wer: (totals.wer / count).toFixed(2),
            avg_cer: (totals.cer / count).toFixed(2),
            avg_accuracy: (totals.accuracy / count).toFixed(2),
            avg_time: (totals.time / count).toFixed(2),
            total_images: totalImages,
            total_models: count
        };
    }

    renderOverallStats() {
        const stats = this.calculateOverallStats();
        if (!stats) return;

        const html = `
            <div class="stat-card" style="display: inline-block; width: calc(20% - 12px); min-width: 150px; vertical-align: top; margin-right: 15px;">
                <div class="stat-label">Average Accuracy</div>
                <div class="stat-value">${stats.avg_accuracy}%</div>
            </div>
            <div class="stat-card" style="display: inline-block; width: calc(20% - 12px); min-width: 150px; vertical-align: top; margin-right: 15px;">
                <div class="stat-label">Average CER</div>
                <div class="stat-value">${stats.avg_cer}%</div>
            </div>
            <div class="stat-card" style="display: inline-block; width: calc(20% - 12px); min-width: 150px; vertical-align: top; margin-right: 15px;">
                <div class="stat-label">Average WER</div>
                <div class="stat-value">${stats.avg_wer}%</div>
            </div>
            <div class="stat-card" style="display: inline-block; width: calc(20% - 12px); min-width: 150px; vertical-align: top; margin-right: 15px;">
                <div class="stat-label">Average Time</div>
                <div class="stat-value">${stats.avg_time}s</div>
            </div>
            <div class="stat-card" style="display: inline-block; width: calc(20% - 12px); min-width: 150px; vertical-align: top;">
                <div class="stat-label">Total Images</div>
                <div class="stat-value">${stats.total_images}</div>
            </div>
        `;

        document.getElementById('overall-stats').innerHTML = html;
    }

    calculateModelAverages() {
        const modelStats = {};

        // Collect all results for each model
        Object.entries(this.data).forEach(([categoryName, categoryData]) => {
            Object.entries(categoryData).forEach(([subcategoryName, subcategoryData]) => {
                Object.entries(subcategoryData).forEach(([modelName, modelData]) => {
                    if (!modelStats[modelName]) {
                        modelStats[modelName] = {
                            results: [],
                            totalImages: 0,
                            categories: new Set()
                        };
                    }
                    modelStats[modelName].results.push(modelData);
                    modelStats[modelName].categories.add(`${categoryName}/${subcategoryName}`);

                    // Get current image count from manifest
                    const imageCount = this.getImageCount(categoryName, subcategoryName);
                    modelStats[modelName].totalImages += imageCount;
                });
            });
        });

        // Calculate weighted averages for each model
        const modelAverages = {};
        Object.entries(modelStats).forEach(([modelName, stats]) => {
            const count = stats.results.length;

            // Calculate weighted averages based on image count
            const weightedTotals = stats.results.reduce((acc, result, index) => {
                // Get the corresponding category/subcategory for this result
                const resultIndex = index;
                const categoryEntries = Object.entries(this.data);
                let imageCount = 0;
                let found = false;

                // Find the image count for this specific result
                for (const [categoryName, categoryData] of categoryEntries) {
                    for (const [subcategoryName, subcategoryData] of Object.entries(categoryData)) {
                        if (subcategoryData[modelName] === result) {
                            imageCount = this.getImageCount(categoryName, subcategoryName);
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }

                // Weight each metric by the number of images in that dataset
                acc.wer += result.avg_wer * imageCount;
                acc.cer += result.avg_cer * imageCount;
                acc.accuracy += result.avg_accuracy * imageCount;
                acc.time += result.avg_time * imageCount;
                acc.totalWeight += imageCount;

                return acc;
            }, { wer: 0, cer: 0, accuracy: 0, time: 0, totalWeight: 0 });

            modelAverages[modelName] = {
                avg_wer: weightedTotals.totalWeight > 0 ? weightedTotals.wer / weightedTotals.totalWeight : 0,
                avg_cer: weightedTotals.totalWeight > 0 ? weightedTotals.cer / weightedTotals.totalWeight : 0,
                avg_accuracy: weightedTotals.totalWeight > 0 ? weightedTotals.accuracy / weightedTotals.totalWeight : 0,
                avg_time: weightedTotals.totalWeight > 0 ? weightedTotals.time / weightedTotals.totalWeight : 0,
                totalImages: stats.totalImages,
                benchmarkCount: count
            };
        });

        return modelAverages;
    }

    renderModelAverages() {
        const modelAverages = this.calculateModelAverages();
        if (!modelAverages || Object.keys(modelAverages).length === 0) return;

        // Sort models by accuracy (highest first)
        const sortedModels = Object.entries(modelAverages).sort(([, a], [, b]) => b.avg_accuracy - a.avg_accuracy);

        // Find best scores for highlighting
        const allModels = Object.values(modelAverages);
        const best = {
            wer: Math.min(...allModels.map(m => m.avg_wer)),
            cer: Math.min(...allModels.map(m => m.avg_cer)),
            accuracy: Math.max(...allModels.map(m => m.avg_accuracy)),
            time: Math.min(...allModels.map(m => m.avg_time))
        };

        let html = `
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Accuracy (%)</th>
                        <th>CER (%)</th>
                        <th>WER (%)</th>
                        <th>Time (s)</th>
                        <th>Total Images</th>
                    </tr>
                </thead>
                <tbody>`;

        sortedModels.forEach(([modelName, modelData]) => {
            const werClass = modelData.avg_wer === best.wer ? 'best-score' : '';
            const cerClass = modelData.avg_cer === best.cer ? 'best-score' : '';
            const accClass = modelData.avg_accuracy === best.accuracy ? 'best-score' : '';
            const timeClass = modelData.avg_time === best.time ? 'best-score' : '';

            html += `
                <tr>
                    <td class="model-name">${modelName}</td>
                    <td class="${accClass}">${modelData.avg_accuracy.toFixed(2)}</td>
                    <td class="${cerClass}">${modelData.avg_cer.toFixed(2)}</td>
                    <td class="${werClass}">${modelData.avg_wer.toFixed(2)}</td>
                    <td class="${timeClass}">${modelData.avg_time.toFixed(2)}</td>
                    <td>${modelData.totalImages}</td>
                </tr>`;
        });

        html += `
                </tbody>
            </table>`;

        document.getElementById('model-averages').innerHTML = html;
    }

    findBestScores(subcategoryData) {
        const models = Object.keys(subcategoryData);
        const best = {
            wer: Math.min(...models.map(m => subcategoryData[m].avg_wer)),
            cer: Math.min(...models.map(m => subcategoryData[m].avg_cer)),
            accuracy: Math.max(...models.map(m => subcategoryData[m].avg_accuracy)),
            time: Math.min(...models.map(m => subcategoryData[m].avg_time))
        };
        return best;
    }

    renderResults() {
        let html = '';

        Object.entries(this.data).forEach(([categoryName, categoryData]) => {
            html += `<div class="category">
                <div class="category-header">${categoryName}</div>`;

            Object.entries(categoryData).forEach(([subcategoryName, subcategoryData]) => {
                const best = this.findBestScores(subcategoryData);

                html += `
                    <div class="subcategory">
                        <div class="subcategory-header" onclick="this.nextElementSibling.classList.toggle('show'); this.classList.toggle('expanded')">
                            <span class="subcategory-title">${subcategoryName} (${this.getImageCount(categoryName, subcategoryName)} images)</span>
                            <button class="details-button" onclick="event.stopPropagation(); dashboard.navigateToDetails('${categoryName}', '${subcategoryName}')">
                                Details →
                            </button>
                        </div>
                        <div class="model-results">
                            <table class="results-table">
                                <thead>
                                    <tr>
                                        <th>Model</th>
                                        <th>Accuracy (%)</th>
                                        <th>CER (%)</th>
                                        <th>WER (%)</th>
                                        <th>Time (s)</th>
                                    </tr>
                                </thead>
                                <tbody>`;

                // Sort models by accuracy (highest first)
                const sortedModels = Object.entries(subcategoryData).sort(([, a], [, b]) => b.avg_accuracy - a.avg_accuracy);

                sortedModels.forEach(([modelName, modelData]) => {
                    const werClass = modelData.avg_wer === best.wer ? 'best-score' : '';
                    const cerClass = modelData.avg_cer === best.cer ? 'best-score' : '';
                    const accClass = modelData.avg_accuracy === best.accuracy ? 'best-score' : '';
                    const timeClass = modelData.avg_time === best.time ? 'best-score' : '';

                    html += `
                        <tr>
                            <td class="model-name">${modelName}</td>
                            <td class="${accClass}">${modelData.avg_accuracy.toFixed(2)}</td>
                            <td class="${cerClass}">${modelData.avg_cer.toFixed(2)}</td>
                            <td class="${werClass}">${modelData.avg_wer.toFixed(2)}</td>
                            <td class="${timeClass}">${modelData.avg_time.toFixed(2)}</td>
                        </tr>`;
                });

                html += `
                                </tbody>
                            </table>
                        </div>
                    </div>`;
            });

            html += '</div>';
        });

        document.getElementById('results-container').innerHTML = html;
    }

    // Navigation methods for Details buttons
    navigateToDetails(categoryName, subcategoryName) {
        this.router.navigateTo('details', {
            category: categoryName,
            subcategory: subcategoryName
        });
    }

    navigateBackToDashboard() {
        this.router.navigateTo('dashboard');
    }

    // Diff functionality
    toggleDiff(button, groundTruth, response) {
        const diffContainer = button.closest('.model-response').querySelector('.diff-container');
        const responseText = button.closest('.model-response').querySelector('.model-response-text');

        if (diffContainer.style.display === 'none') {
            // Show diff
            const diff = DiffViewer.generateDiff(groundTruth, response);
            const diffHtml = DiffViewer.renderInlineDiff(diff);
            diffContainer.innerHTML = `<div class="diff-view">${diffHtml}</div>`;
            diffContainer.style.display = 'block';
            responseText.style.display = 'none';
            button.textContent = 'Hide Diff';
        } else {
            // Hide diff
            diffContainer.style.display = 'none';
            responseText.style.display = 'block';
            button.textContent = 'Show Diff';
        }
    }

    // Details controls setup
    setupDetailsControls(imageData) {
        const imageFiles = Object.values(imageData);
        if (imageFiles.length === 0) return;

        // Get all unique models
        const allModels = new Set();
        imageFiles.forEach(imageResult => {
            Object.keys(imageResult.models).forEach(model => allModels.add(model));
        });

        // Populate model filter
        const modelFilter = document.getElementById('model-filter');
        modelFilter.innerHTML = '<option value="">All Models</option>';
        Array.from(allModels).sort().forEach(model => {
            modelFilter.innerHTML += `<option value="${model}">${model}</option>`;
        });

        // Set up event listeners
        modelFilter.addEventListener('change', () => this.applyFilters());
        document.getElementById('sort-by').addEventListener('change', () => this.applySorting());
    }

    applyFilters() {
        const selectedModel = document.getElementById('model-filter').value;
        const imageResults = document.querySelectorAll('.image-result');

        imageResults.forEach(imageResult => {
            if (!selectedModel) {
                // Show all models
                imageResult.querySelectorAll('.model-response').forEach(response => {
                    response.style.display = 'block';
                });
            } else {
                // Show only selected model
                imageResult.querySelectorAll('.model-response').forEach(response => {
                    const modelName = response.dataset.model;
                    response.style.display = modelName === selectedModel ? 'block' : 'none';
                });
            }
        });
    }

    applySorting() {
        const sortBy = document.getElementById('sort-by').value;
        const detailsContent = document.getElementById('details-content');
        const imageResults = Array.from(detailsContent.querySelectorAll('.image-result'));

        imageResults.sort((a, b) => {
            const filenameA = a.dataset.filename;
            const filenameB = b.dataset.filename;

            if (sortBy === 'filename') {
                return filenameA.localeCompare(filenameB);
            }
            return filenameA.localeCompare(filenameB); // Fallback to filename
        });

        // Re-append sorted elements
        imageResults.forEach(element => detailsContent.appendChild(element));
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new BenchmarkDashboard();

    // Set up back button handler
    document.getElementById('back-to-dashboard').addEventListener('click', (e) => {
        e.preventDefault();
        dashboard.navigateBackToDashboard();
    });
});