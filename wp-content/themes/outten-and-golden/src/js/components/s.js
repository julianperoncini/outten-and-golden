import ScrollBooster from 'scrollbooster'
import { gsap } from 'gsap'
import { utils, store, evt } from '@/core'
import { initTaxi } from '@/app.js'

const { qs, qsa } = utils;
const { device } = store;

// Core Search Logic - handles tag management and filtering
class PredictiveSearchEngine {
    constructor(options = {}) {
        this.elements = options.elements || {};
        this.callbacks = options.callbacks || {};
        
        this.state = {
            selectedTags: [],        // Previously: activeTags
            filteredResults: [],     // Previously: filteredTags  
            highlightedIndex: -1,
            searchQuery: '',         // Previously: searchValue
            isFiltering: false,
            lastCreatedTag: null,
            isProcessingKeypress: false,  // Previously: isProcessingKey
            lastKeypressTime: 0      // Previously: lastKeyTime
        };

        // Initialize parent/child mapping from PHP
        this.tagParentChildMap = window.tagParentChildMap || {};
        this.tagParentMapping = window.tagParentMapping || {};

        // Map available tag buttons to data objects
        this.availableTagsData = Array.from(this.elements.tagButtons || []).map(tagElement => ({
            element: tagElement,
            tagText: tagElement.getAttribute('data-tag') || tagElement.textContent.trim(),
            displayText: tagElement.textContent.trim(),  // Previously: originalText
            button: tagElement.querySelector('button'),
            isVisible: true,
            relevanceScore: 0        // Previously: matchScore
        }));

        this.init();
    }

    // Utility Methods
    calculateRelevanceScore(text, query) {  // Previously: getFuzzyScore
        if (!query) return 1;
        
        const textLower = text.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // For short queries (3 chars or less), require exact matches, startsWith, or contains
        if (queryLower.length <= 3) {
            if (textLower === queryLower) return 100;
            if (textLower.startsWith(queryLower)) return 90;
            if (textLower.includes(queryLower)) return 70;
            return 0; // No fuzzy matching for short queries
        }
        
        // Normal matching for longer queries
        if (textLower === queryLower) return 100;
        if (textLower.startsWith(queryLower)) return 90;
        if (textLower.includes(queryLower)) return 70;
        
        // Fuzzy matching for longer queries only
        let textIndex = 0;
        let queryIndex = 0;
        let matchCount = 0;
        
        while (textIndex < textLower.length && queryIndex < queryLower.length) {
            if (textLower[textIndex] === queryLower[queryIndex]) {
                matchCount++;
                queryIndex++;
            }
            textIndex++;
        }
        
        // Only return a score if we matched ALL characters in the query
        return queryIndex === queryLower.length ? 
            Math.max(10, 50 * (matchCount / textLower.length)) : 0;
    }

    highlightSearchTerms(text, query) {  // Previously: highlightText
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow px-1 rounded">$1</mark>');
    }

    async getParentTagName(tagText) {
        try {
            const response = await fetch(`/wp-json/outten-golden/v1/get-parent-tag?tag=${encodeURIComponent(tagText)}`);
            if (response.ok) {
                const data = await response.json();
                return data.parentTag || tagText;
            }
        } catch (error) {
            console.warn('Failed to get parent tag:', error);
        }
        return tagText;
    }

    // Tag Management
    selectTag(tagText) {
        // Convert child tag to parent tag if mapping exists
        const displayText = window.tagParentMapping?.[tagText] || tagText;
        
        if (this.state.selectedTags.includes(displayText)) return false;
        
        // Check if tag chip already exists in header
        if (this.elements.selectedTagsContainer) {
            const existingTagChips = this.elements.selectedTagsContainer.querySelectorAll('.js-search-tag span');
            for (let span of existingTagChips) {
                if (span.textContent.trim() === displayText) return false;
            }
        }
    
        this.state.selectedTags.push(displayText);
        
        // Create visual tag chip with parent tag name
        const tagChip = this.createTagChip(displayText);
        
        // Find and hide the corresponding available tag button
        // Look for both the original tag and the parent tag
        const tagData = this.availableTagsData.find(data => 
            data.tagText === tagText || data.tagText === displayText
        );
        
        if (tagData && tagData.element) {
            gsap.to(tagData.element, {
                opacity: 0, scale: 0.8, y: -10, duration: 0.2,
                onComplete: () => tagData.element.style.display = 'none'
            });
        }
        
        // Clear search input and update results
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        this.filterAvailableTags('');
        
        // Trigger callbacks with the display text
        this.callbacks.onTagSelected?.(displayText, tagChip);
        this.callbacks.onSelectionChanged?.(this.state.selectedTags);
        this.callbacks.onScrollUpdate?.();
        
        // Focus search input
        if (this.elements.searchInput) {
            this.elements.searchInput.focus();
        }
        
        return tagChip;
    }

    deselectTag(tagText) {  // Previously: removeTag
        const index = this.state.selectedTags.indexOf(tagText);
        if (index === -1) return false;

        this.state.selectedTags.splice(index, 1);
        
        // Remove tag chip with animation
        if (this.elements.selectedTagsContainer) {
            const tagChips = this.elements.selectedTagsContainer.querySelectorAll('.js-search-tag span');
            for (let span of tagChips) {
                if (span.textContent.trim() === tagText) {
                    const tagChip = span.closest('.js-search-tag');
                    if (tagChip) {
                        gsap.to(tagChip, {
                            opacity: 0, scale: 0.8, duration: 0.2,
                            onComplete: () => {
                                try {
                                    if (tagChip && tagChip.isConnected) {
                                        tagChip.remove();
                                    }
                                } catch (error) {
                                    console.warn('Error removing tag chip:', error);
                                }
                                this.callbacks.onScrollUpdate?.();
                            }
                        });
                    }
                    break;
                }
            }
        }

        // Show corresponding available tag button with animation
        const tagData = this.availableTagsData.find(data => data.tagText === tagText);
        if (tagData && tagData.element) {
            tagData.element.style.display = '';
            gsap.fromTo(tagData.element, {
                opacity: 0, scale: 0.8, y: 10
            }, {
                opacity: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(1.25)"
            });
        }

        // Update available tags display
        this.filterAvailableTags(this.state.searchQuery);
        
        // Trigger callbacks
        this.callbacks.onTagDeselected?.(tagText);  // Previously: onTagRemoved
        this.callbacks.onSelectionChanged?.(this.state.selectedTags);
        
        // Focus search input
        if (this.elements.searchInput) {
            this.elements.searchInput.focus();
        }
        
        return true;
    }

    clearAllSelections() {  // Previously: clearAllTags
        const previouslySelected = [...this.state.selectedTags];
        
        // Store references to tag data that correspond to selected tags
        const selectedTagsData = previouslySelected.map(tagText => 
            this.availableTagsData.find(tagData => tagData.tagText === tagText)
        ).filter(Boolean);
        
        this.state.selectedTags = [];
        
        // Remove all tag chips with staggered animation
        if (this.elements.selectedTagsContainer) {
            const existingChips = this.elements.selectedTagsContainer.querySelectorAll('.js-search-tag');
            if (existingChips.length > 0) {
                existingChips.forEach((chip, index) => {
                    gsap.to(chip, {
                        opacity: 0, scale: 0.8, duration: 0.2, delay: index * 0.02,
                        onComplete: () => {
                            if (chip && chip.isConnected) chip.remove();
                            if (index === existingChips.length - 1) {
                                this.callbacks.onScrollUpdate?.();
                                this.callbacks.onSelectionChanged?.(this.state.selectedTags);
                            }
                        }
                    });
                });
            } else {
                this.elements.selectedTagsContainer.innerHTML = '';
                this.callbacks.onSelectionChanged?.(this.state.selectedTags);
            }
        } else {
            this.callbacks.onSelectionChanged?.(this.state.selectedTags);
        }

        // Show only the previously selected tags (not all tags)
        if (selectedTagsData.length > 0) {
            gsap.delayedCall(0.1, () => {
                selectedTagsData.forEach((tagData, index) => {
                    if (tagData && tagData.element) {
                        if (tagData.button) {
                            tagData.button.innerHTML = `<span>${tagData.displayText}</span>`;
                        }
                        
                        tagData.element.style.display = '';
                        tagData.isVisible = true;
                        
                        gsap.set(tagData.element, { opacity: 0, scale: 0.8, y: 20 });
                        gsap.to(tagData.element, {
                            opacity: 1, scale: 1, y: 0, duration: 0.4,
                            delay: index * 0.03, ease: "back.out(1.25)"
                        });
                    }
                });
                
                gsap.delayedCall(0.5 + (selectedTagsData.length * 0.03), () => {
                    this.callbacks.onScrollUpdate?.();
                });
            });
        } else {
            this.callbacks.onScrollUpdate?.();
        }
        
        this.filterAvailableTags('');
        this.callbacks.onSelectionCleared?.(previouslySelected);  // Previously: onTagsCleared
    }

    createTagChip(tagText) {  // Previously: createTagElement
        if (!this.elements.selectedTagsContainer) return null;

        const tagChip = document.createElement('div');
        tagChip.className = 'js-search-tag';
        
        const tagLabel = document.createElement('span');
        tagLabel.textContent = tagText;
        tagChip.appendChild(tagLabel);
        
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'js-search-tag-remove';
        removeButton.innerHTML = '×';
        
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deselectTag(tagText);
        });
        
        tagChip.appendChild(removeButton);
        this.elements.selectedTagsContainer.appendChild(tagChip);
        
        return tagChip;
    }

    // Search & Filtering
    filterAvailableTags(query) {  // Previously: filterTags
        this.state.searchQuery = query;
        this.state.isFiltering = true;
        
        // Reset all tag visibility and scores
        this.availableTagsData.forEach(tagData => {
            tagData.relevanceScore = 0;
            tagData.isVisible = false;
        });
        
        if (!query.trim()) {
            // Show all tags except selected ones
            this.state.filteredResults = this.availableTagsData.filter(tagData => 
                !this.state.selectedTags.includes(tagData.tagText)
            );
            this.state.filteredResults.forEach(tagData => {
                tagData.isVisible = true;
                tagData.relevanceScore = 1;
            });
        } else {
            const trimmedQuery = query.trim().toLowerCase();
            
            // Filter and score tags, excluding selected ones
            this.state.filteredResults = this.availableTagsData
                .filter(tagData => !this.state.selectedTags.includes(tagData.tagText))
                .map(tagData => {
                    // Direct match score
                    let score = this.calculateRelevanceScore(tagData.tagText, trimmedQuery);
                    
                    // Check if this parent tag has children that match
                    if (score === 0 && this.tagParentChildMap[tagData.tagText]) {
                        const children = this.tagParentChildMap[tagData.tagText];
                        // Check each child for a match
                        for (let child of children) {
                            const childScore = this.calculateRelevanceScore(child, trimmedQuery);
                            if (childScore > 0) {
                                // If child matches, give parent a score (slightly lower than direct match)
                                score = childScore * 0.8;
                                break;
                            }
                        }
                    }
                    
                    return { ...tagData, relevanceScore: score };
                })
                .filter(tagData => tagData.relevanceScore > 10) // Require a minimum score to filter out weak matches
                .sort((a, b) => b.relevanceScore - a.relevanceScore);
            
            this.state.filteredResults.forEach(tagData => {
                tagData.isVisible = true;
            });
        }
        
        this.updateTagButtonsDisplay(query);
        this.clearHighlight();  // Previously: resetHighlight
        
        // Trigger callback
        this.callbacks.onResultsFiltered?.(this.state.filteredResults, query);  // Previously: onFiltered
    }

    updateTagButtonsDisplay(query) {  // Previously: updateTagDisplay
        const buttonsToHide = this.availableTagsData.filter(tagData => 
            (!this.state.filteredResults.some(filteredTag => filteredTag.tagText === tagData.tagText) ||
             this.state.selectedTags.includes(tagData.tagText)) &&
            tagData.element.style.display !== 'none'
        );
        
        const hidePromises = buttonsToHide.map((tagData) => {
            return new Promise(resolve => {
                gsap.to(tagData.element, {
                    opacity: 0, scale: 0.8, y: -10, duration: 0.2,
                    onComplete: () => {
                        tagData.element.style.display = 'none';
                        tagData.element.classList.remove('highlighted');
                        tagData.isVisible = false;
                        
                        if (tagData.button) {
                            tagData.button.innerHTML = `<span>${tagData.displayText}</span>`;
                        }
                        resolve();
                    }
                });
            });
        });
        
        Promise.all(hidePromises).then(() => {
            const visibleButtons = [];
            
            this.state.filteredResults.forEach((tagData, index) => {
                // Only show tags that are not selected
                if (tagData.isVisible && !this.state.selectedTags.includes(tagData.tagText)) {
                    visibleButtons.push(tagData);
                    const wasHidden = tagData.element.style.display === 'none';
                    
                    if (tagData.button) {
                        const highlightedText = this.highlightSearchTerms(tagData.displayText, query);
                        tagData.button.innerHTML = `<span>${highlightedText}</span>`;
                    }
                    
                    tagData.element.style.display = '';
                    
                    if (wasHidden) {
                        gsap.set(tagData.element, { opacity: 0, scale: 0.8, y: 10 });
                        gsap.to(tagData.element, {
                            opacity: 1, scale: 1, y: 0, duration: 0.3,
                            delay: index * 0.03, ease: "back.out(1.25)"
                        });
                    } else {
                        if (query.trim()) {
                            gsap.to(tagData.button, {
                                scale: 1.02, duration: 0.1, yoyo: true, repeat: 1, ease: "power2.inOut"
                            });
                        }
                    }
                } else if (this.state.selectedTags.includes(tagData.tagText)) {
                    // Hide selected tags
                    tagData.element.style.display = 'none';
                    tagData.isVisible = false;
                }
            });
            
            // Handle no results message
            if (this.elements.noResultsMessage) {
                if (visibleButtons.length === 0 && query.trim()) {
                    if (this.elements.noResultsMessage.style.display === 'none') {
                        this.elements.noResultsMessage.style.display = 'block';
                        gsap.fromTo(this.elements.noResultsMessage, {
                            opacity: 0, y: 20
                        }, {
                            opacity: 1, y: 0, duration: 0.4, delay: 0.1, ease: "power2.out"
                        });
                    }
                } else {
                    if (this.elements.noResultsMessage.style.display !== 'none') {
                        gsap.to(this.elements.noResultsMessage, {
                            opacity: 0, y: -20, duration: 0.3,
                            onComplete: () => this.elements.noResultsMessage.style.display = 'none'
                        });
                    }
                }
            }
            
            gsap.delayedCall(0.35, () => {
                this.callbacks.onDisplayUpdated?.(visibleButtons, query);
            });
            
            this.state.isFiltering = false;
        });
    }

    // Keyboard Navigation
    clearHighlight() {  // Previously: resetHighlight
        this.state.highlightedIndex = -1;
    }

    selectHighlightedResult() {  // Previously: selectHighlighted
        if (this.state.highlightedIndex >= 0 && this.state.highlightedIndex < this.state.filteredResults.length) {
            const highlightedTag = this.state.filteredResults[this.state.highlightedIndex];
            if (highlightedTag && !this.state.selectedTags.includes(highlightedTag.tagText)) {
                this.selectTag(highlightedTag.tagText);
                return true;
            }
        }
        return false;
    }

    // Event Handlers
    handleSearchInput(query) {  // Previously: handleInput
        this.filterAvailableTags(query);
        
        // API call for additional results
        if (query.length > 2) {
            try {
                fetch(`/wp-json/outten-golden/v1/search?query=${encodeURIComponent(query)}&limit=10`)
                    .then(response => response.ok ? response.json() : Promise.reject())
                    .then(apiResults => {
                        // Add logging to debug API results
                        console.log('API Results for query:', query, apiResults);
                        
                        // Process API results to include parent tags
                        const processedResults = this.processAPIResults(apiResults);
                        this.callbacks.onAPIResults?.(processedResults);
                    })
                    .catch(() => console.log('API failed, using existing tags'));
            } catch (error) {
                console.log('API failed, using existing tags');
            }
        }
    }

    // New method to process API results
    processAPIResults(apiResults) {
        if (!Array.isArray(apiResults)) return apiResults;
        
        // Create a map to track which parent tags we've already added
        const addedParents = new Set();
        const processedResults = [];
        
        apiResults.forEach(result => {
            // Always add the original result
            processedResults.push(result);
            
            // If this is a child tag (has matchedChild property), ensure parent is shown
            if (result.matchedChild && result.isParent) {
                addedParents.add(result.text);
            }
        });
        
        return processedResults;
    }

    handleTagButtonClick(tagData) {  // Previously: handleTagClick
        if (!this.state.selectedTags.includes(tagData.tagText)) {
            this.selectTag(tagData.tagText);
        }
    }

    handleKeyboardNavigation(e) {  // Previously: handleKeyNavigation
        // Only handle when search input is focused and search allows it
        if (document.activeElement !== this.elements.searchInput ||
            (this.callbacks.isSearchModalOpen && !this.callbacks.isSearchModalOpen())) {
            return;
        }
        
        const now = Date.now();
        if (this.state.isProcessingKeypress || (now - this.state.lastKeypressTime) < 100) {
            if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Backspace') {
                e.preventDefault();
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            this.state.isProcessingKeypress = true;
            this.state.lastKeypressTime = now;
            
            const selectedHighlight = this.selectHighlightedResult();
            
            setTimeout(() => this.state.isProcessingKeypress = false, 200);
            
            if (!selectedHighlight) {
                // Handle search submission
                const inputValue = this.elements.searchInput?.value.trim();
                if (inputValue && !this.state.selectedTags.includes(inputValue)) {
                    this.selectTag(inputValue);
                }
                this.callbacks.onSearchSubmit?.(this.state.selectedTags, inputValue || '');
            }
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            
            this.state.isProcessingKeypress = true;
            this.state.lastKeypressTime = now;
            
            if (this.state.filteredResults.length > 0) {
                const firstResult = this.state.filteredResults[0];
                this.selectTag(firstResult.tagText);
            }
            
            setTimeout(() => this.state.isProcessingKeypress = false, 200);
            return;
        }

        if (e.key === 'Backspace' && this.elements.searchInput?.value === '' && this.state.selectedTags.length > 0) {
            e.preventDefault();
            
            if (this.state.isProcessingKeypress) return;
            
            this.state.isProcessingKeypress = true;
            this.state.lastKeypressTime = now;
            
            const lastSelectedTag = this.state.selectedTags[this.state.selectedTags.length - 1];
            this.deselectTag(lastSelectedTag);
            
            setTimeout(() => this.state.isProcessingKeypress = false, 200);
            return;
        }
    }

    // Initialization
    init() {
        // Clear any existing selections on initialization
        if (this.elements.selectedTagsContainer) {
            this.elements.selectedTagsContainer.innerHTML = '';
        }
        
        // Reset search input
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        
        // Set up tag button click handlers with drag prevention
        this.availableTagsData.forEach(tagData => {
            if (tagData.button) {
                if (tagData.clickHandler) {
                    tagData.button.removeEventListener('click', tagData.clickHandler);
                }
                
                tagData.clickHandler = (e) => {
                    // Prevent clicks during or immediately after dragging
                    if (this.state.isDragging || this.state.hasUserMoved) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    }
                    
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleTagButtonClick(tagData);
                };
                
                tagData.button.addEventListener('click', tagData.clickHandler);
                
                // Add mousedown handler to track drag start
                tagData.mouseDownHandler = (e) => {
                    this.state.dragStartTime = Date.now();
                    this.state.dragStartX = e.clientX;
                };
                
                tagData.button.addEventListener('mousedown', tagData.mouseDownHandler);
                
                // Add mouseup handler to detect if it was a drag or click
                tagData.mouseUpHandler = (e) => {
                    const timeDiff = Date.now() - this.state.dragStartTime;
                    const distDiff = Math.abs(e.clientX - this.state.dragStartX);
                    
                    // If moved more than 10px or took longer than 200ms, consider it a drag
                    if (distDiff > 10 || timeDiff > 200) {
                        this.state.hasUserMoved = true;
                        setTimeout(() => {
                            this.state.hasUserMoved = false;
                        }, 100);
                    }
                };
                
                tagData.button.addEventListener('mouseup', tagData.mouseUpHandler);
            }
        });

        // Initial filtering
        this.filterAvailableTags('');
    }

    // Public API
    getSelectedTags() {  // Previously: getTags
        return [...this.state.selectedTags];
    }

    getFilteredResults() {  // Previously: getFilteredTags
        return [...this.state.filteredResults];
    }

    getCurrentQuery() {  // Previously: getSearchValue
        return this.state.searchQuery;
    }

    destroy() {
        // Clean up event listeners
        this.availableTagsData.forEach(tagData => {
            if (tagData.button) {
                if (tagData.clickHandler) {
                    tagData.button.removeEventListener('click', tagData.clickHandler);
                }
                if (tagData.mouseDownHandler) {
                    tagData.button.removeEventListener('mousedown', tagData.mouseDownHandler);
                }
                if (tagData.mouseUpHandler) {
                    tagData.button.removeEventListener('mouseup', tagData.mouseUpHandler);
                }
            }
        });
        
        this.state.selectedTags = [];
        this.state.filteredResults = [];
        this.callbacks.onDestroy?.();
    }
}

// Base UI Controller - handles core interactions
class PredictiveSearchUI {  // Previously: BaseUIController
    constructor(elements, searchEngine, options = {}) {
        this.elements = elements;
        this.searchEngine = searchEngine;
        this.options = options;
        
        this.state = {
            tagScrollController: null,  // Previously: sb
            eventListeners: [],
            isUserScrolling: false,
            hasUserMoved: false,
            isDragging: false
        };

        this.init();
    }

    // ScrollBooster Management for Tag Area
    initTagScrolling() {  // Previously: initScrollBooster
        // Don't initialize ScrollBooster on mobile devices
        if (device.isMobile || !this.elements.tagScrollViewport || !this.elements.tagScrollContent) {
            return null;
        }
        
        gsap.set(this.elements.tagScrollContent, { x: 0 });
        
        const scrollController = new ScrollBooster({
            viewport: this.elements.tagScrollViewport,
            content: this.elements.tagScrollContent,
            scrollMode: 'transform',
            direction: 'horizontal',
            friction: 0.2,
            bounce: false,
            emulateScroll: true,
            onUpdate: (state) => this.handleTagScrollUpdate(state)
        });
        
        scrollController.setPosition({ x: 0 });
        return scrollController;
    }

    handleTagScrollUpdate(scrollState) {  // Previously: handleScrollUpdate
        // Early return if no scroll controller (mobile devices)
        if (!this.state.tagScrollController) return;
        
        if (!this.elements.scrollNextButton) return;
    
        const bothBordersColliding = scrollState.borderCollision.right && scrollState.borderCollision.left;
        
        // Handle drag state and movement detection
        if (scrollState.isMoving) {
            this.state.isUserScrolling = true;
            this.state.isDragging = true;
        } else if (this.state.isUserScrolling) {
            this.state.isUserScrolling = false;
            // Small delay before allowing clicks again
            setTimeout(() => {
                this.state.hasUserMoved = false;
                this.state.isDragging = false;
            }, 100);
        }
    
        // Detect significant movement to prevent accidental clicks
        if (Math.abs(scrollState.dragOffset.x) > 5 && scrollState.isMoving) {
            this.state.hasUserMoved = true;
            // Disable pointer events on scrollable content during drag
            if (this.elements.scrollLength) {
                this.elements.scrollLength.style.pointerEvents = 'none';
            }
        } else if (!scrollState.isMoving && this.state.hasUserMoved) {
            // Re-enable pointer events after drag ends
            setTimeout(() => {
                if (this.elements.scrollLength) {
                    this.elements.scrollLength.style.pointerEvents = 'auto';
                }
            }, 50);
        }
        
        if (bothBordersColliding) {
            this.elements.scrollNextButton.classList.remove('is-active')
            this.elements.searchContainer.classList.add('is-scrolling')
            if (this.elements.scrollGradient) this.elements.scrollGradient.classList.remove('is-active')
        } else if (scrollState.borderCollision.left) {
            this.elements.scrollNextButton.classList.add('is-active')
            this.elements.searchContainer.classList.remove('is-scrolling')
            if (this.elements.scrollGradient) this.elements.scrollGradient.classList.add('is-active')
        } else {
            this.elements.scrollNextButton.classList.remove('is-active')
            this.elements.searchContainer.classList.add('is-scrolling')
            if (this.elements.scrollGradient) this.elements.scrollGradient.classList.remove('is-active')
        }
    }

    updateClearButtonVisibility() {
        if (!this.elements.clearButton) return
        
        // Get real-time input value
        const currentInputValue = this.elements.searchInput ? this.elements.searchInput.value.trim() : ''
        const hasInputText = currentInputValue.length > 0
        
        // Get real-time selected tags count
        const selectedTagsCount = this.elements.selectedTagsContainer ? 
            this.elements.selectedTagsContainer.querySelectorAll('.js-search-tag').length : 0
        const hasSelectedTags = selectedTagsCount > 0
        
        if (hasInputText || hasSelectedTags) {
            gsap.set(this.elements.clearButton, { opacity: 1 })
            this.elements.clearButton.style.pointerEvents = 'auto'
        } else {
            gsap.set(this.elements.clearButton, { opacity: 0 })
            this.elements.clearButton.style.pointerEvents = 'none'
        }
    }

    // Event Handlers
    handleFormSubmit(e) {
        e.preventDefault()
        e.stopPropagation()

        const inputValue = this.elements.searchInput?.value.trim() || ''
        const selectedTags = this.searchEngine.getSelectedTags()
        
        // Add current input as tag if it exists and is not already selected
        if (inputValue && !selectedTags.includes(inputValue)) {
            this.searchEngine.selectTag(inputValue)
        }

        // Get updated tags after potential addition
        const finalTags = this.searchEngine.getSelectedTags()

        // Build search URL
        const baseURL = window.location.origin
        let searchURL = baseURL + '/search'
        
        if (finalTags.length > 0) {
            const tagsSlugs = finalTags.map(tag => 
                tag.toLowerCase()
                   .replace(/&/g, ' ')  // Replace ampersands with spaces
                   .replace(/\s+/g, '-')  // Replace spaces with single dash
                   .replace(/[^a-z0-9\-]/g, '')  // Remove any non-alphanumeric characters (except dashes)
                   .replace(/\-{2,}/g, '-')  // Replace multiple consecutive dashes with a single dash
            ).join('+');
            
            if (inputValue) {
                searchURL += `/${encodeURIComponent(inputValue)}/tags/${tagsSlugs}`
            } else {
                searchURL += `/tags/${tagsSlugs}`
            }
        } else if (inputValue) {
            searchURL += `/${encodeURIComponent(inputValue)}`
        } else {
            searchURL = baseURL + '/?s='
        }
        
        // Clear selections for fresh search
        this.searchEngine.clearAllSelections();
        
        if (this.elements.searchInput && this.elements.searchInput === document.activeElement) {
            this.elements.searchInput.blur();
        }
        
        // Navigate to search results
        if (typeof initTaxi !== 'undefined' && initTaxi.navigateTo) {
            initTaxi.navigateTo(searchURL);
        } else {
            window.location.href = searchURL;
        }

        // Trigger callback
        this.options.onSearchSubmit?.(finalTags, inputValue);
    }

    // Initialization
    init() {
        this.state.tagScrollController = this.initTagScrolling();
        
        // Set up search engine callbacks
        this.searchEngine.callbacks.onDisplayUpdated = () => {
            if (this.state.tagScrollController) this.state.tagScrollController.updateMetrics();
        };
        
        this.searchEngine.callbacks.onSelectionChanged = () => {
            this.updateClearButtonVisibility();
            if (this.state.tagScrollController) this.state.tagScrollController.updateMetrics();
        };

        this.searchEngine.callbacks.onScrollUpdate = () => {
            if (this.state.tagScrollController) this.state.tagScrollController.updateMetrics();
        };

        // Handle submit from search engine
        this.searchEngine.callbacks.onSearchSubmit = (tags, query) => {
            const syntheticEvent = new Event('submit', { cancelable: true });
            this.handleFormSubmit(syntheticEvent);
        };

        // Set up UI event listeners
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.searchEngine.handleSearchInput(e.target.value);
                this.updateClearButtonVisibility();
            });
            
            this.elements.searchInput.addEventListener('keydown', (e) => {
                // Update clear button after key events that might change input
                if (e.key === 'Backspace' || e.key === 'Delete') {
                    setTimeout(() => this.updateClearButtonVisibility(), 10);
                }
                
                this.searchEngine.handleKeyboardNavigation(e);
            });
        }

        if (this.elements.searchForm) {
            this.elements.searchForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        if (this.elements.clearButton) {
            this.elements.clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.searchEngine.clearAllSelections();
                if (this.elements.searchInput) {
                    this.elements.searchInput.value = '';
                    this.elements.searchInput.focus();
                }
                this.updateClearButtonVisibility();
            });
        }
    }

    // Public API
    getUIState() {  // Previously: getState
        return {
            isScrolling: this.state.isUserScrolling,
            isDragging: this.state.isDragging,
            hasUserMoved: this.state.hasUserMoved
        };
    }

    destroy() {
        if (this.state.tagScrollController && typeof this.state.tagScrollController.destroy === 'function') {
            this.state.tagScrollController.destroy();
        }
        
        this.options.onDestroy?.();
    }
}

// Mobile Search UI Controller - extends Base without ScrollBooster
class PredictiveSearchMobile extends PredictiveSearchUI {
    constructor(elements, searchEngine, options = {}) {
        // Call parent constructor but don't auto-init
        super(elements, searchEngine, options);
        
        // Add mobile-specific state
        this.state.isMobileOpen = false;

        // Override the init to use mobile-specific behavior
        this.initMobile();
    }

    initMobile() {
        // Call parent init first
        super.init();
        
        // Then add mobile-specific initialization
        this.initMobileBehavior();
    }

    // Override to disable ScrollBooster for mobile
    initTagScrolling() {
        // Mobile uses native scroll, no ScrollBooster needed
        return null;
    }

    // Override form submit to close mobile search
    handleFormSubmit(e) {
        super.handleFormSubmit(e);
        // Close mobile search after form submission
        this.closeMobileSearch();
    }

    // Override scroll handler for mobile (no ScrollBooster)
    handleTagScrollUpdate(scrollState) {
        // Mobile doesn't use ScrollBooster, so no scroll handling needed
        return;
    }

    // Mobile-specific methods
    openMobileSearch() {
        this.state.isMobileOpen = true;
        
        // Add mobile search open class to body
        document.body.classList.add('mobile-search-open');
        
        if (this.elements.searchInput) {
            this.elements.searchInput.focus();
        }
        
        this.updateClearButtonVisibility();
        this.options.onMobileOpen?.();
    }

    closeMobileSearch() {
        this.state.isMobileOpen = false;
        
        // Remove mobile search open class from body
        document.body.classList.remove('mobile-search-open');
        
        if (this.elements.searchInput) {
            this.elements.searchInput.blur();
        }
        
        this.options.onMobileClose?.();
    }

    // Override clear button visibility for mobile behavior
    updateClearButtonVisibility() {
        if (!this.elements.clearButton) return;
        
        const currentInputValue = this.elements.searchInput ? this.elements.searchInput.value.trim() : '';
        const hasInputText = currentInputValue.length > 0;
        
        const selectedTagsCount = this.elements.selectedTagsContainer ? 
            this.elements.selectedTagsContainer.querySelectorAll('.js-search-tag').length : 0;
        const hasSelectedTags = selectedTagsCount > 0;
        
        if (this.state.isMobileOpen && (hasInputText || hasSelectedTags)) {
            gsap.set(this.elements.clearButton, { opacity: 1 });
            this.elements.clearButton.style.pointerEvents = 'auto';
        } else {
            gsap.set(this.elements.clearButton, { opacity: 0 });
            this.elements.clearButton.style.pointerEvents = 'none';
        }
    }

    // Mobile event handlers
    handleSearchInputClick() {
        // Toggle mobile search when clicking the input
        if (!this.state.isMobileOpen) {
            this.openMobileSearch();
        }
    }

    handleSearchInputFocus() {
        // Only open if not already open - don't close on focus
        if (!this.state.isMobileOpen) {
            this.openMobileSearch();
        }
    }

    handleSearchInputBlur() {
        // Don't auto-close on blur anymore - only close on outside click or form submit
        // This prevents the search from closing when user interacts with tags or types
    }

    handleClickOutside(e) {
        // Close mobile search when clicking outside the search container
        if (this.state.isMobileOpen && 
            this.elements.searchContainer && 
            !this.elements.searchContainer.contains(e.target)) {
            this.closeMobileSearch();
        }
    }

    initMobileBehavior() {
        // Set up mobile-specific event listeners
        if (this.elements.searchInput) {
            // Handle input click to toggle mobile search
            this.elements.searchInput.addEventListener('click', () => this.handleSearchInputClick());
            this.elements.searchInput.addEventListener('focus', () => this.handleSearchInputFocus());
        }

        // Add click outside listener to close mobile search
        document.addEventListener('click', (e) => this.handleClickOutside(e));

        // Override clear button behavior for mobile
        if (this.elements.clearButton) {
            // Remove the existing clear button handler and add mobile-specific one
            const newClearButton = this.elements.clearButton.cloneNode(true);
            this.elements.clearButton.parentNode.replaceChild(newClearButton, this.elements.clearButton);
            this.elements.clearButton = newClearButton;
            
            this.elements.clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.searchEngine.clearAllSelections();
                if (this.elements.searchInput) {
                    this.elements.searchInput.value = '';
                }
                this.updateClearButtonVisibility();
                this.closeMobileSearch();
            });
        }
    }

    // Override the init method to customize clear button behavior for mobile
    init() {
        // This method is overridden by initMobile()
        // Don't call this directly - use initMobile() instead
    }

    // Override getUIState for mobile
    getUIState() {
        return {
            isMobileOpen: this.state.isMobileOpen,
            isScrolling: false, // Mobile uses native scroll
            isDragging: false,
            hasUserMoved: false
        };
    }

    destroy() {
        super.destroy();
        
        // Clean up mobile-specific state and listeners
        document.body.classList.remove('mobile-search-open');
        
        // Remove click outside listener
        document.removeEventListener('click', this.handleClickOutside);
    }
}

class PredictiveSearchModal extends PredictiveSearchUI {  // Previously: ModalSearchUIController
    constructor(elements, searchEngine, options = {}) {
        super(elements, searchEngine, options);
        
        // Add modal-specific state
        this.state.isModalOpen = false;     // Previously: isOpen
        this.state.isUserScrolling = false; // Previously: isScrolling
        this.state.hasUserMoved = false;    // Previously: hasMoved
        
        this.initModalBehavior();
    }

    // Override scroll handler for modal-specific behavior
    handleTagScrollUpdate(scrollState) {
        super.handleTagScrollUpdate(scrollState);
        
        if (scrollState.isMoving) {
            this.state.isUserScrolling = true;
        } else if (this.state.isUserScrolling) {
            this.state.isUserScrolling = false;
            setTimeout(() => this.state.hasUserMoved = false, 100);
        }
    
        if (Math.abs(scrollState.dragOffset.x) > 10 && scrollState.isMoving) {
            this.state.hasUserMoved = true;
            if (this.elements.scrollLength) this.elements.scrollLength.style.pointerEvents = 'none';
        } else {
            if (this.elements.scrollLength) this.elements.scrollLength.style.pointerEvents = 'auto';
        }
    }

    // Override clear button visibility for modal behavior
    updateClearButtonVisibility() {
        if (!this.elements.clearButton) return;
        
        const currentInputValue = this.elements.searchInput ? this.elements.searchInput.value.trim() : '';
        const hasInputText = currentInputValue.length > 0;
        
        const selectedTagsCount = this.elements.selectedTagsContainer ? 
            this.elements.selectedTagsContainer.querySelectorAll('.js-search-tag').length : 0;
        const hasSelectedTags = selectedTagsCount > 0;
        
        if (this.state.isModalOpen && (hasInputText || hasSelectedTags)) {
            gsap.set(this.elements.clearButton, { opacity: 1 });
            this.elements.clearButton.style.pointerEvents = 'auto';
        } else {
            gsap.set(this.elements.clearButton, { opacity: 0 });
            this.elements.clearButton.style.pointerEvents = 'none';
        }
    }

    // Modal-specific methods
    openSearchModal() {  // Previously: open
        this.state.isModalOpen = true;
        
        if (this.elements.searchContainer) {
            this.elements.searchContainer.classList.add('is-active');
            this.elements.searchContainer.setAttribute('data-lenis-prevent', '');
        }
        
        const resultsWrapper = qs('.js-search-results-wrapper', this.elements.searchContainer);
        if (resultsWrapper) resultsWrapper.scrollTop = 0;

        document.body.classList.add('overflow-hidden');
        
        if (this.elements.hiddenElements) {
            gsap.to(this.elements.hiddenElements, { opacity: 0, duration: 0.3 });
        }
        
        if (this.elements.resultsContainer) {
            gsap.to(this.elements.resultsContainer, { height: 'auto', duration: 0.3 });
        }
        
        const visibleResultItems = this.elements.resultItems?.filter(item => 
            item.style.display !== 'none'
        ) || [];
        
        if (visibleResultItems.length > 0) {
            gsap.killTweensOf([visibleResultItems]);
            gsap.fromTo(visibleResultItems, {
                opacity: 0, y: 40
            }, {
                opacity: 1, y: 0, duration: 0.6, stagger: 0.03, ease: "back.out(1.25)"
            });
        }

        if (this.elements.submitButton) {
            gsap.to(this.elements.submitButton, { 
                x: 0, duration: 0.4, ease: "power2.out"
            });
            this.elements.submitButton.style.pointerEvents = 'auto';
        }

        // Reset tag scrolling
        if (this.state.tagScrollController) {
            this.state.tagScrollController.updateMetrics();
            this.state.tagScrollController.scrollTo({ x: 0 });
            this.state.tagScrollController.setPosition({ x: 0 });
            
            if (this.elements.tagScrollContent) {
                gsap.set(this.elements.tagScrollContent, { x: 0 });
            }
            
            if (this.state.tagScrollController.content && this.state.tagScrollController.content.style) {
                this.state.tagScrollController.content.style.transform = 'translateX(0px)';
            }
        }

        this.updateClearButtonVisibility();
        this.options.onModalOpen?.();  // Previously: onOpen
    }

    closeSearchModal(preserveInput = false, preserveSelections = false) {  // Previously: close
        this.state.isModalOpen = false;
        
        if (this.elements.closeButton) {
            gsap.to(this.elements.closeButton, { scale: 1, duration: 0.2 });
        }
        
        if (this.elements.hiddenElements) {
            gsap.to(this.elements.hiddenElements, { opacity: 1, duration: 0.3 });
        }
        
        if (this.elements.resultsContainer) {
            gsap.to(this.elements.resultsContainer, { height: 0, duration: 0.3 });
        }
        
        if (this.elements.submitButton) {
            gsap.to(this.elements.submitButton, { x: '101%', duration: 0.4, ease: "power2.out" });
            this.elements.submitButton.style.pointerEvents = 'none';
        }

        if (this.elements.searchContainer) {
            this.elements.searchContainer.classList.remove('is-active');
            this.elements.searchContainer.removeAttribute('data-lenis-prevent');
        }
        
        document.body.classList.remove('overflow-hidden');

        if (!preserveInput && this.elements.searchInput) {
            this.elements.searchInput.value = '';
            this.elements.searchInput.blur();
        }

        if (!preserveSelections) {
            if (!preserveInput) {
                if (this.elements.clearButton) {
                    gsap.set(this.elements.clearButton, { opacity: 0 });
                    this.elements.clearButton.style.pointerEvents = 'none';
                }
            }
        } else {
            this.updateClearButtonVisibility();
        }

        this.options.onModalClose?.(preserveInput, preserveSelections);  // Previously: onClose
    }

    // Override form submit to close modal
    handleFormSubmit(e) {
        super.handleFormSubmit(e);
        this.closeSearchModal(false, false);
    }

    // Modal event handlers
    handleSearchInputClick() {  // Previously: handleInputClick
        if (!this.state.isModalOpen) {
            this.openSearchModal();
        } else if (this.elements.searchInput) {
            this.elements.searchInput.focus();
        }
    }

    handleGlobalKeydown(e) {
        if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.stopPropagation();
            
            if (!this.state.isModalOpen) {
                this.openSearchModal();
            } else {
                this.closeSearchModal(false);
            }
            return;
        }
        
        if (this.state.isModalOpen && e.key === 'Escape') {
            e.preventDefault();
            this.closeSearchModal(false);
            return;
        }
    }

    handleClickOutsideModal(e) {  // Previously: handleClickOutside
        if (this.state.isModalOpen && this.elements.searchContainer && !this.elements.searchContainer.contains(e.target)) {
            this.closeSearchModal(false);
        }
    }

    initModalBehavior() {
        // Add modal-specific search state callback
        this.searchEngine.callbacks.isSearchModalOpen = () => this.state.isModalOpen;

        // Override form and input handlers for modal behavior
        if (this.elements.searchForm) {
            this.elements.searchForm.removeEventListener('submit', this.handleFormSubmit);
            this.elements.searchForm.addEventListener('submit', (e) => {
                if (this.state.isModalOpen) {
                    this.handleFormSubmit(e);
                } else {
                    e.preventDefault();
                }
            });
            this.elements.searchForm.addEventListener('click', () => this.handleSearchInputClick());
        }

        if (this.elements.closeButton) {
            this.elements.closeButton.addEventListener('click', () => this.closeSearchModal(false));
        }

        const resultsWrapper = this.elements.searchContainer?.querySelector('.js-search-results-wrapper');
        if (resultsWrapper) {
            resultsWrapper.addEventListener('click', (e) => {
                // Check if the clicked element is a link or inside a link
                const clickedLink = e.target.closest('a[href]');
                if (clickedLink && this.state.isModalOpen) {
                    // Close the search modal when a link is clicked
                    this.closeSearchModal(false, false);
                }
            });
        }

        // Global event listeners for modal
        document.addEventListener('keydown', (e) => this.handleGlobalKeydown(e));
        document.addEventListener('click', (e) => this.handleClickOutsideModal(e));
    }

    // Override getUIState for modal
    getUIState() {
        return {
            isModalOpen: this.state.isModalOpen,
            isUserScrolling: this.state.isUserScrolling
        };
    }

    destroy() {
        super.destroy();
        
        // Remove modal-specific global listeners
        document.removeEventListener('keydown', this.handleGlobalKeydown);
        document.removeEventListener('click', this.handleClickOutsideModal);
    }
}

// Factory Functions
export function createStaticPredictiveSearch(config) {  // Previously: createStaticSearch
    const elements = extractSearchElements(config);
    
    const searchEngine = new PredictiveSearchEngine({
        elements,
        callbacks: config.searchCallbacks || {}
    });

    const searchUI = new PredictiveSearchUI(elements, searchEngine, config.uiOptions || {});

    return createSearchAPI(searchEngine, searchUI);
}

export function createMobilePredictiveSearch(config) {
    const elements = extractSearchElements(config);
    
    const searchEngine = new PredictiveSearchEngine({
        elements,
        callbacks: config.searchCallbacks || {}
    });

    const searchMobile = new PredictiveSearchMobile(elements, searchEngine, config.uiOptions || {});

    return {
        ...createSearchAPI(searchEngine, searchMobile),
        // Add mobile-specific API
        openMobile: () => searchMobile.openMobileSearch(),
        closeMobile: () => searchMobile.closeMobileSearch()
    };
}

export function createModalPredictiveSearch(config) {  // Previously: createModalSearch
    const elements = extractSearchElements(config);
    
    const searchEngine = new PredictiveSearchEngine({
        elements,
        callbacks: config.searchCallbacks || {}
    });

    const searchModal = new PredictiveSearchModal(elements, searchEngine, config.uiOptions || {});

    return {
        ...createSearchAPI(searchEngine, searchModal),
        // Add modal-specific API
        openModal: () => searchModal.openSearchModal(),  // Previously: open
        closeModal: (preserveInput, preserveSelections) => searchModal.closeSearchModal(preserveInput, preserveSelections)  // Previously: close
    };
}

// Helper functions
function extractSearchElements(config) {  // Previously: extractElements
    const section = config.section;
    
    return {
        // Main containers
        searchContainer: section,                                        // Previously: section
        searchForm: qs('form', section),                                // Previously: form
        searchInput: qs('input', section),                              // Previously: input
        selectedTagsContainer: qs('.js-search-tags', section),          // NEW: Updated class name
        
        // Modal elements
        closeButton: qs('.js-search-close', section),                   // NEW: Updated class name
        hiddenElements: qsa('.js-search-hidden', section),              // NEW: Updated class name
        resultsContainer: qs('.js-search-results', section),            // NEW: Updated class name
        resultsWrapper: qs('.js-search-results-wrapper', section),
        resultItems: qsa('.js-search-results-item', section),           // NEW: Updated class name
        submitButton: qs('.js-search-submit', section),                 // NEW: Updated class name
        
        // Available tags area
        tagButtons: qsa('.js-search-tag-button', section),              // NEW: Updated class name
        tagScrollViewport: qs('.js-search-scroll-viewport', section),   // NEW: Updated class name
        tagScrollContent: qs('.js-search-scroll-content', section),     // NEW: Updated class name
        
        // Scroll controls
        scrollNextButton: qs('.js-search-scroll-next', section),        // NEW: Updated class name
        scrollGradient: qs('.js-search-scroll-gradient', section),      // NEW: Updated class name
        scrollLength: qs('.js-search-scroll-length', section),          // NEW: Updated class name
        scrollResetButton: qs('.js-search-scroll-reset', section),      // NEW: Updated class name
        
        // Other controls
        clearButton: qs('.js-search-clear', section),                   // NEW: Updated class name
        headerElement: qs('header', section),                           // Previously: header
        relatedLinks: qsa('.column-inner', section),
        searchLinks: qsa('.js-search-link', section),
        noResultsMessage: qs('.js-search-no-results', section)          // Add this for no results message
    };
}

function createSearchAPI(searchEngine, searchUI) {  // Previously: createPublicAPI
    return {
        // Search Engine API
        selectTag: (text) => searchEngine.selectTag(text),              // Previously: addTag
        deselectTag: (text) => searchEngine.deselectTag(text),          // Previously: removeTag  
        clearSelections: () => searchEngine.clearAllSelections(),       // Previously: clearTags
        getSelectedTags: () => searchEngine.getSelectedTags(),          // Previously: getTags
        filterResults: (query) => searchEngine.filterAvailableTags(query), // Previously: filter
        
        // Combined API
        getState: () => ({
            ...searchUI.getUIState(),
            selectedTags: searchEngine.getSelectedTags(),               // Previously: tags
            filteredResults: searchEngine.getFilteredResults(),         // Previously: filteredTags
            currentQuery: searchEngine.getCurrentQuery()                // Previously: searchValue
        }),
        
        destroy: () => {
            searchEngine.destroy();
            searchUI.destroy();
        }
    };
}

// Main export for backward compatibility
export default function initPredictiveSearch(config) {
    if (!config.section) return;

    // Check for specific modes
    if (config.mode === 'static') {
        return createStaticPredictiveSearch(config);
    } else if (config.mode === 'mobile') {
        return createMobilePredictiveSearch(config);
    } else if (device.isMobile) {
        // Default mobile behavior if no mode specified but on mobile device
        return null; // or handle as needed
    } else {
        return createModalPredictiveSearch(config);
    }
}