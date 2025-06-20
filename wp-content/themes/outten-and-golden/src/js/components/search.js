import ScrollBooster from 'scrollbooster'
import { gsap } from 'gsap'
import { utils, store, evt } from '@/core'
import { initTaxi } from '@/app.js'

const { qs, qsa } = utils;
const { device } = store;

/**
 * Predictive Search Component
 * Based on mini-search logic with predictive search UI and API integration
 */
export default function initPredictiveSearch(el) {
    if (!el) return;

    if (device.isMobile) return;

    // ============================================================================
    // DOM ELEMENTS (keeping predictive search selectors)
    // ============================================================================
    
    const elements = {
        form: qs('form', el.section),
        input: qs('input', el.section),
        header: qs('header', el.section),
        close: qs('.predictive-search-close', el.section),
        hidden: qsa('.predictive-search-hidden', el.section),
        results: qs('.predictive-search-results', el.section),
        resultsItems: qsa('.predictive-search-results-item', el.section),
        tagContainer: qs('.predictive-search-tags', el.section),
        submit: qs('.js-predictive-search-submit', el.section),
        availableTags: qsa('.js-tag', el.section), // Main tags for filtering
        relatedLinks: qsa('.column-inner', el.section),
        clearButton: qs('.js-predictive-search-clear', el.section),
        nextButton: qs('.js-scrollboost-next', el.section),
        gradient: qs('.js-scrollboost-gradient', el.section),
        length: qs('.js-scrollboost-length', el.section),
        resetButton: qs('.js-scrollboost-reset', el.section),
        searchLinks: qsa('.js-search-link', el.section), // Search links that should clear everything
        
        // Mini-search equivalents for scroll
        scrollContent: qs('.js-scrollboost-content', el.section),
        scrollViewport: qs('.js-scrollboost', el.section),
        noResultsMessage: null // Will be created dynamically
    };

    // ============================================================================
    // STATE (from mini-search)
    // ============================================================================
    
    const state = {
        activeTags: [],
        filteredTags: [],
        highlightedIndex: -1,
        sb: null,
        eventListeners: [],
        searchValue: '',
        isFiltering: false,
        // Predictive search specific
        isScrolling: false,
        hasMoved: false,
        isOpen: false,
        lastInputValue: '',
        lastCreatedTag: null,
        isPopulatingFromURL: false,
        populateTimeout: null,
        // Prevent rapid key presses
        isProcessingKey: false,
        lastKeyTime: 0
    };

    // Create all available tags data structure (from mini-search)
    const allTagsData = Array.from(elements.availableTags || []).map(tagElement => ({
        element: tagElement,
        text: tagElement.getAttribute('data-tag') || tagElement.textContent.trim(),
        originalText: tagElement.textContent.trim(),
        button: tagElement.querySelector('button'),
        isVisible: true,
        matchScore: 0
    }));

    // ============================================================================
    // UTILITIES (from mini-search)
    // ============================================================================
    
    const utils_internal = {
        addTrackedEventListener(element, event, handler, options) {
            evt.on(event, element, handler, options);
            state.eventListeners.push({ element, event, handler });
        },

        // Predictive search specific utilities
        isOnSearchPage() {
            const currentPath = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);
            
            return currentPath.startsWith('/search') || 
                   searchParams.has('s') || 
                   searchParams.has('search_tags') || 
                   searchParams.has('search_type');
        },

        validateState() {
            if (!elements.tagContainer) return true;
            
            const domTags = Array.from(elements.tagContainer.querySelectorAll('.predictive-search-tag span'))
                .map(span => span.textContent.trim());
            
            if (state.activeTags.length !== domTags.length) {
                tagManager.clear();
                return false;
            }
            
            return true;
        },

        // Fuzzy search scoring (from mini-search)
        getFuzzyScore(text, query) {
            if (!query) return 1;
            
            const textLower = text.toLowerCase();
            const queryLower = query.toLowerCase();
            
            // Exact match gets highest score
            if (textLower === queryLower) return 100;
            
            // Starts with query gets high score
            if (textLower.startsWith(queryLower)) return 90;
            
            // Contains query gets medium score
            if (textLower.includes(queryLower)) return 70;
            
            // Fuzzy matching - check if all query characters appear in order
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
            
            if (queryIndex === queryLower.length) {
                // All query characters found, score based on density
                return Math.max(10, 50 * (matchCount / textLower.length));
            }
            
            return 0;
        },

        // Highlight matching text (from mini-search)
        highlightText(text, query) {
            if (!query) return text;
            
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<mark class="bg-yellow px-1 rounded">$1</mark>');
        },

        // Create "no results" message (from mini-search)
        createNoResultsMessage() {
            // Check if message already exists
            if (elements.noResultsMessage) {
                console.log('No results message already exists, skipping creation');
                return elements.noResultsMessage;
            }
            
            const message = document.createElement('div');
            message.className = 'no-results-message text-center py-8 text-gray-500';
            message.innerHTML = `
                <div class="text-sm">No matching tags found</div>
            `;
            message.style.display = 'none';
            
            if (elements.scrollContent) {
                elements.scrollContent.appendChild(message);
                elements.noResultsMessage = message;
                console.log('No results message created');
            }
            
            return message;
        }
    };

    // ============================================================================
    // URL PARSING AND STATE RESTORATION
    // ============================================================================

    const urlManager = {
        // Parse tags from current URL
        parseTagsFromURL() {
            const path = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);
            
            let tagsFromURL = [];
            
            // Check URL path for tags (e.g., /search/tags/tag1+tag2)
            const tagMatch = path.match(/\/tags\/([^\/]+)/);
            if (tagMatch) {
                tagsFromURL = tagMatch[1]
                    .split('+')
                    .map(tag => tag.replace(/-/g, ' ').trim())
                    .filter(tag => tag.length > 0);
            }
            
            // Also check search params for tags
            const searchTags = searchParams.get('search_tags');
            if (searchTags) {
                const paramTags = searchTags.split(',').map(tag => tag.trim());
                tagsFromURL = [...tagsFromURL, ...paramTags];
            }
            
            return [...new Set(tagsFromURL)]; // Remove duplicates
        },
        
        // Check if we're on a search page with existing tags
        hasExistingTags() {
            return this.parseTagsFromURL().length > 0;
        }
    };

    // ============================================================================
    // SIMPLE TAG VISIBILITY MANAGEMENT
    // ============================================================================
    
    const simpleTagManager = {
        // Simple function to show/hide tags based on active state
        updateAllTagsVisibility() {
            console.log('Updating all tags visibility. Active tags:', state.activeTags);
            
            allTagsData.forEach(tagData => {
                if (tagData.element) {
                    const isActive = state.activeTags.includes(tagData.text);
                    
                    if (isActive) {
                        // Hide active tags
                        tagData.element.style.display = 'none';
                        tagData.isVisible = false;
                    } else {
                        // Show non-active tags
                        tagData.element.style.display = '';
                        tagData.isVisible = true;
                        
                        // Reset to clean state
                        gsap.set(tagData.element, {
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            clearProps: "transform"
                        });
                        
                        // Reset button content
                        if (tagData.button) {
                            tagData.button.innerHTML = `<span>${tagData.originalText}</span>`;
                            gsap.set(tagData.button, {
                                backgroundColor: '',
                                color: '',
                                scale: 1,
                                clearProps: "all"
                            });
                        }
                    }
                }
            });
            
            // Update filtered tags to match visibility
            state.filteredTags = allTagsData.filter(tagData => tagData.isVisible);
            
            // Update ScrollBooster
            if (state.sb) {
                state.sb.updateMetrics();
            }
            
            console.log('Visible tags:', state.filteredTags.length);
        },
        
        // Simple clear all function
        clearAll() {
            console.log('Simple clear all');
            
            // Clear state
            state.activeTags = [];
            
            // Clear DOM
            if (elements.tagContainer) {
                elements.tagContainer.innerHTML = '';
            }
            
            // Clear input
            if (elements.input) {
                elements.input.value = '';
            }
            
            // Show all tags
            this.updateAllTagsVisibility();
            
            // Update UI
            uiManager.updateClearButtonVisibility();
        }
    };

    const stateManager = {
        // Restore from URL (assumes we're starting from clean state)
        restoreFromURL() {
            console.log('Restoring from URL (starting from clean state)...');
            
            const urlTags = urlManager.parseTagsFromURL();
            
            if (urlTags.length === 0) {
                console.log('No tags in URL - keeping all tags visible');
                // Keep all tags visible since there are no active tags
                allTagsData.forEach(tagData => {
                    if (tagData.element) {
                        tagData.element.style.display = '';
                        tagData.isVisible = true;
                    }
                });
                state.filteredTags = [...allTagsData];
                return;
            }
            
            console.log('Restoring tags from URL:', urlTags);
            
            // Set the flag to indicate we're populating from URL
            state.isPopulatingFromURL = true;
            
            // Create tags in the container for each URL tag
            urlTags.forEach(tagText => {
                // Create tag element first
                this.createTagElement(tagText);
                // Add to active tags
                state.activeTags.push(tagText);
            });
            
            // Now hide the active tags and show the rest
            allTagsData.forEach(tagData => {
                const isActive = state.activeTags.includes(tagData.text);
                
                if (!isActive) {
                    tagData.element.style.display = '';
                    tagData.isVisible = true;
                } else {
                    tagData.element.style.display = 'none';
                    tagData.isVisible = false;
                }
            });
            
            // Update filtered tags
            state.filteredTags = allTagsData.filter(tagData => tagData.isVisible);
            
            // Update the UI
            uiManager.updateClearButtonVisibility();
            
            // Update ScrollBooster
            if (state.sb) {
                state.sb.updateMetrics();
            }
            
            // Reset the flag
            state.isPopulatingFromURL = false;
            
            console.log('State restored. Active tags:', state.activeTags);
            console.log('Visible tags:', state.filteredTags.length);
        },
        
        // Clear all tags (both from DOM and state)
        clearAllTags(silent = false) {
            console.log('Clearing all tags...', silent ? '(silent mode)' : '');
            
            // Clear the state FIRST
            state.activeTags = [];
            
            // Update clear button visibility immediately after clearing state
            // This ensures it hides right away based on the cleared state
            uiManager.updateClearButtonVisibility();
            
            // Clear the DOM
            if (elements.tagContainer) {
                if (silent) {
                    // Instant clear without animations
                    elements.tagContainer.innerHTML = '';
                } else {
                    // Animated clear (for user actions)
                    const existingTags = elements.tagContainer.querySelectorAll('.predictive-search-tag');
                    
                    // Animate out existing tags
                    existingTags.forEach((tag, index) => {
                        gsap.to(tag, {
                            opacity: 0,
                            scale: 0.8,
                            duration: 0.2,
                            delay: index * 0.02, // Small stagger for removal
                            onComplete: () => {
                                if (tag && tag.isConnected) {
                                    tag.remove();
                                }
                                
                                // Update clear button again after last tag is removed
                                if (index === existingTags.length - 1) {
                                    uiManager.updateClearButtonVisibility();
                                }
                            }
                        });
                    });
                }
            }
            
            // Show all available tags again with proper animations AND reset GSAP properties
            if (silent) {
                // SILENT MODE: Show all tags instantly but reset GSAP properties
                allTagsData.forEach(tagData => {
                    if (tagData.element) {
                        tagData.element.style.display = '';
                        tagData.isVisible = true;
                        
                        // IMPORTANT: Reset GSAP properties to default values
                        gsap.set(tagData.element, {
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            clearProps: "transform,opacity" // Clear any lingering GSAP transforms
                        });
                        
                        // Reset button content to original text
                        if (tagData.button) {
                            tagData.button.innerHTML = `<span>${tagData.originalText}</span>`;
                            
                            // Also reset button GSAP properties
                            gsap.set(tagData.button, {
                                backgroundColor: '',
                                color: '',
                                scale: 1,
                                clearProps: "all"
                            });
                        }
                    }
                });
            } else {
                // ANIMATED MODE: Show all tags with staggered animation (for user actions)
                // Wait a bit for tag removal animations to start
                gsap.delayedCall(0.1, () => {
                    allTagsData.forEach((tagData, index) => {
                        if (tagData.element) {
                            // Reset button content to original text
                            if (tagData.button) {
                                tagData.button.innerHTML = `<span>${tagData.originalText}</span>`;
                            }
                            
                            // Show the element but start it hidden for animation
                            tagData.element.style.display = '';
                            tagData.isVisible = true;
                            
                            // Set initial animation state
                            gsap.set(tagData.element, {
                                opacity: 0,
                                scale: 0.8,
                                y: 20
                            });
                            
                            // Animate in with staggered delay
                            gsap.to(tagData.element, {
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                duration: 0.4,
                                delay: index * 0.03, // Staggered animation
                                ease: "back.out(1.7)"
                            });
                        }
                    });
                    
                    // Update ScrollBooster after all animations complete
                    gsap.delayedCall(0.5 + (allTagsData.length * 0.03), () => {
                        if (state.sb) {
                            state.sb.updateMetrics();
                        }
                    });
                });
            }
            
            // Clear any search input
            if (elements.input) {
                elements.input.value = '';
            }
            
            // Update filtered tags to show all
            state.filteredTags = [...allTagsData];
            
            // Update ScrollBooster immediately for silent mode
            if (silent && state.sb) {
                state.sb.updateMetrics();
            }
            
            console.log('All tags cleared');
        },

        // Show a specific tag back in the available tags (for single tag removal)
        showAvailableTag(text) {
            const tagData = allTagsData.find(data => 
                data.text.toLowerCase() === text.toLowerCase()
            );
            
            if (tagData && tagData.element) {
                console.log(`Showing tag back in available tags: ${text}`);
                
                // Reset button content to original text first
                if (tagData.button) {
                    tagData.button.innerHTML = `<span>${tagData.originalText}</span>`;
                }
                
                // Show the element (but start it hidden for animation)
                tagData.element.style.display = '';
                tagData.isVisible = true;
                
                // Set initial animation state (hidden)
                gsap.set(tagData.element, {
                    opacity: 0,
                    scale: 0.8,
                    y: 10
                });
                
                // Animate back into view with a nice bounce
                gsap.to(tagData.element, {
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    duration: 0.4,
                    ease: "back.out(1.7)",
                    delay: 0.1 // Small delay for better visual effect
                });
                
                // Add to filtered tags if not already there
                if (!state.filteredTags.find(t => t.text === tagData.text)) {
                    state.filteredTags.push(tagData);
                }
                
                // Update ScrollBooster after animation completes
                gsap.delayedCall(0.5, () => {
                    if (state.sb) {
                        state.sb.updateMetrics();
                    }
                });
            }
        },
        
        // Create a tag element in the DOM
        createTagElement(text) {
            // Check if tag already exists
            if (elements.tagContainer) {
                const existingTagSpans = elements.tagContainer.querySelectorAll('.predictive-search-tag span');
                for (let span of existingTagSpans) {
                    if (span.textContent.trim() === text) {
                        console.log('Tag already exists in DOM, skipping creation');
                        return null;
                    }
                }
            }
            
            const tag = document.createElement('div');
            tag.className = 'predictive-search-tag';
            
            const tagText = document.createElement('span');
            tagText.textContent = text;
            tag.appendChild(tagText);
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'predictive-search-tag-remove';
            removeBtn.innerHTML = '×';
            
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                tagManager.remove(text, tag);
            });
            
            tag.appendChild(removeBtn);
            elements.tagContainer.appendChild(tag);
            
            return tag;
        },
        
        // Hide an available tag from the scroll booster
        hideAvailableTag(tagData) {
            if (tagData && tagData.element) {
                tagData.element.style.display = 'none';
            }
        },
        
        // Validate and sync state with DOM
        validateAndSync() {
            if (!elements.tagContainer) return;
            
            // Get tags from DOM
            const domTags = Array.from(elements.tagContainer.querySelectorAll('.predictive-search-tag span'))
                .map(span => span.textContent.trim());
            
            // Sync state with DOM
            state.activeTags = [...domTags];
            
            // Hide corresponding available tags
            domTags.forEach(tagText => {
                const tagData = allTagsData.find(data => 
                    data.text.toLowerCase() === tagText.toLowerCase()
                );
                if (tagData) {
                    this.hideAvailableTag(tagData);
                }
            });
            
            // Re-filter to update the display
            filterManager.filterTags('');
            
            console.log('State validated and synced. Active tags:', state.activeTags);
        }
    };

    // ============================================================================
    // UI MANAGEMENT (predictive search specific)
    // ============================================================================
    
    const uiManager = {
        // Updated uiManager.updateClearButtonVisibility function
        updateClearButtonVisibility() {
            if (!elements.clearButton) return;
            
            const currentInputValue = elements.input ? elements.input.value.trim() : '';
            const hasInput = currentInputValue.length > 0;
            
            // Check for active tags in the DOM within the header
            const activeTagsInHeader = elements.tagContainer ? 
                elements.tagContainer.querySelectorAll('.predictive-search-tag').length > 0 : false;
            
            // Show clear button if search is open AND (has input OR has active tags in header)
            // This means: Hide when search is empty (no input AND no active tags)
            if (state.isOpen && (hasInput || activeTagsInHeader)) {
                gsap.to(elements.clearButton, { opacity: 1, duration: 0.2 });
                elements.clearButton.style.pointerEvents = 'auto';
            } else {
                gsap.to(elements.clearButton, { opacity: 0, duration: 0.2 });
                elements.clearButton.style.pointerEvents = 'none';
            }
            
            // Optional: Log for debugging
            console.log(`Clear button visibility - Input: "${currentInputValue}", Active tags: ${activeTagsInHeader}, Search open: ${state.isOpen}`);
        },

        handleUpdate(scrollState) {
            if (!elements.nextButton) return;
        
            // Track scrolling state
            if (scrollState.isMoving) {
                state.isScrolling = true
            } else if (state.isScrolling) {
                state.isScrolling = false
                setTimeout(() => {
                    state.hasMoved = false
                }, 100)
            }
        
            // Handle drag movement
            if (Math.abs(scrollState.dragOffset.x) > 10 && scrollState.isMoving) {
                state.hasMoved = true;
                if (elements.length) {
                    elements.length.style.pointerEvents = 'none'
                }
            } else {
                if (elements.length) {
                    elements.length.style.pointerEvents = 'auto'
                }
            }
        
            // Handle border collision states
            const bothBordersColliding = scrollState.borderCollision.right && scrollState.borderCollision.left;
            
            if (bothBordersColliding) {
                elements.nextButton.classList.remove('is-active')
                if (elements.gradient) {
                    elements.gradient.classList.remove('is-active')
                }
            } else if (scrollState.borderCollision.left) {
                elements.nextButton.classList.add('is-active')
                if (elements.gradient) {
                    elements.gradient.classList.add('is-active')
                }
            } else {
                elements.nextButton.classList.remove('is-active')
                if (elements.gradient) {
                    elements.gradient.classList.remove('is-active')
                }
            }
        },

        showAllTags() {
            // Show all non-active tags with enhanced animation
            allTagsData.forEach((tagData, index) => {
                const isActive = state.activeTags.some(activeTag => 
                    activeTag.toLowerCase() === tagData.text.toLowerCase()
                );
                
                if (!isActive) {
                    tagData.element.style.display = '';
                    
                    // Reset button content to original text
                    if (tagData.button) {
                        tagData.button.innerHTML = `<span>${tagData.originalText}</span>`;
                    }
                    
                    // Enhanced animation for showing tags
                    gsap.fromTo(tagData.element, {
                        opacity: 0,
                        scale: 0.8,
                        y: 20
                    }, {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        duration: 0.4,
                        delay: index * 0.05,
                        ease: "power2.out"
                    });
                } else {
                    // Animate out active tags
                    gsap.to(tagData.element, {
                        opacity: 0,
                        scale: 0.8,
                        y: -10,
                        duration: 0.2,
                        onComplete: () => {
                            tagData.element.style.display = 'none';
                        }
                    });
                }
            });
            
            // Update state to show all tags are now visible (except active ones)
            state.filteredTags = allTagsData.filter(tagData => 
                !state.activeTags.includes(tagData.text)
            );
            
            state.filteredTags.forEach(tagData => {
                tagData.isVisible = true;
                tagData.matchScore = 1;
            });
            
            // Reset search value
            state.searchValue = '';
            
            // Hide no results message if visible
            if (elements.noResultsMessage && elements.noResultsMessage.style.display !== 'none') {
                gsap.to(elements.noResultsMessage, {
                    opacity: 0,
                    y: -20,
                    duration: 0.3,
                    onComplete: () => {
                        elements.noResultsMessage.style.display = 'none';
                    }
                });
            }
        }
    };

    // ============================================================================
    // TAG FILTERING (exact copy from mini-search)
    // ============================================================================
    
    const filterManager = {
        filterTags(query) {
            state.searchValue = query;
            state.isFiltering = true;
            
            console.log('Filtering tags with query:', query);
            
            // Reset all tags first
            allTagsData.forEach(tagData => {
                tagData.matchScore = 0;
                tagData.isVisible = false;
            });
            
            if (!query.trim()) {
                // Show all non-active tags when no query
                state.filteredTags = allTagsData.filter(tagData => 
                    !state.activeTags.includes(tagData.text)
                );
                
                state.filteredTags.forEach(tagData => {
                    tagData.isVisible = true;
                    tagData.matchScore = 1;
                });
            } else {
                // Filter and score tags based on query
                const queryTrimmed = query.trim();
                
                state.filteredTags = allTagsData
                    .filter(tagData => !state.activeTags.includes(tagData.text))
                    .map(tagData => {
                        const score = utils_internal.getFuzzyScore(tagData.text, queryTrimmed);
                        return { ...tagData, matchScore: score };
                    })
                    .filter(tagData => tagData.matchScore > 0)
                    .sort((a, b) => b.matchScore - a.matchScore);
                
                state.filteredTags.forEach(tagData => {
                    tagData.isVisible = true;
                });
            }
            
            this.updateTagDisplay(query);
            this.resetHighlight();
            
            console.log('Filtered tags:', state.filteredTags.length);
        },

        updateTagDisplay(query) {
            // Prepare animations for hiding tags that should no longer be visible
            const tagsToHide = allTagsData.filter(tagData => 
                !state.filteredTags.some(filteredTag => filteredTag.text === tagData.text) &&
                tagData.element.style.display !== 'none'
            );
            
            // Animate out tags that should be hidden
            const hidePromises = tagsToHide.map((tagData, index) => {
                return new Promise(resolve => {
                    gsap.to(tagData.element, {
                        opacity: 0,
                        scale: 0.8,
                        y: -10,
                        duration: 0.2,
                        onComplete: () => {
                            tagData.element.style.display = 'none';
                            tagData.element.classList.remove('highlighted');
                            
                            // Reset button content
                            if (tagData.button) {
                                tagData.button.innerHTML = `<span>${tagData.originalText}</span>`;
                            }
                            resolve();
                        }
                    });
                });
            });
            
            // Wait for hide animations to complete, then show new tags
            Promise.all(hidePromises).then(() => {
                const visibleTags = [];
                
                // Process tags that should be visible
                state.filteredTags.forEach((tagData, index) => {
                    if (tagData.isVisible) {
                        visibleTags.push(tagData);
                        
                        // Check if this tag was previously hidden
                        const wasHidden = tagData.element.style.display === 'none';
                        
                        // Update button content with highlighting
                        if (tagData.button) {
                            const highlightedText = utils_internal.highlightText(tagData.originalText, query);
                            tagData.button.innerHTML = `<span>${highlightedText}</span>`;
                        }
                        
                        // Show the element
                        tagData.element.style.display = '';
                        
                        if (wasHidden) {
                            // Set initial state for animation
                            gsap.set(tagData.element, {
                                opacity: 0,
                                scale: 0.8,
                                y: 10
                            });
                            
                            // Animate in newly visible tags
                            gsap.to(tagData.element, {
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                duration: 0.3,
                                delay: index * 0.03,
                                ease: "back.out(1.7)"
                            });
                        } else {
                            // For tags that were already visible, just animate the text change
                            if (query.trim()) {
                                gsap.to(tagData.button, {
                                    scale: 1.02,
                                    duration: 0.1,
                                    yoyo: true,
                                    repeat: 1,
                                    ease: "power2.inOut"
                                });
                            }
                        }
                    }
                });
                
                // Handle no results message
                if (elements.noResultsMessage) {
                    if (visibleTags.length === 0 && query.trim()) {
                        // Only show if not already visible
                        if (elements.noResultsMessage.style.display === 'none') {
                            elements.noResultsMessage.style.display = 'block';
                            
                            gsap.fromTo(elements.noResultsMessage, {
                                opacity: 0,
                                y: 20
                            }, {
                                opacity: 1,
                                y: 0,
                                duration: 0.4,
                                delay: 0.1,
                                ease: "power2.out"
                            });
                        }
                    } else {
                        // Only hide if currently visible
                        if (elements.noResultsMessage.style.display !== 'none') {
                            gsap.to(elements.noResultsMessage, {
                                opacity: 0,
                                y: -20,
                                duration: 0.3,
                                onComplete: () => {
                                    elements.noResultsMessage.style.display = 'none';
                                }
                            });
                        }
                    }
                }
                
                // Update ScrollBooster after animations
                gsap.delayedCall(0.35, () => {
                    if (state.sb) {
                        state.sb.updateMetrics();
                    }
                });
                
                state.isFiltering = false;
            });
        },

        resetHighlight() {
            state.highlightedIndex = -1;
            this.updateHighlight();
        },

        updateHighlight() {
            // Remove previous highlights with animation
            allTagsData.forEach(tagData => {
                if (tagData.element.classList.contains('highlighted')) {
                    // Animate out the highlight
                    gsap.to(tagData.button, {
                        backgroundColor: '',
                        color: '',
                        scale: 1,
                        duration: 0.2,
                        onComplete: () => {
                            tagData.element.classList.remove('highlighted');
                        }
                    });
                } else {
                    tagData.element.classList.remove('highlighted');
                    if (tagData.button) {
                        gsap.set(tagData.button, {
                            backgroundColor: '',
                            color: '',
                            scale: 1
                        });
                    }
                }
            });
            
            // Add current highlight with animation
            if (state.highlightedIndex >= 0 && state.highlightedIndex < state.filteredTags.length) {
                const highlightedTag = state.filteredTags[state.highlightedIndex];
                if (highlightedTag && highlightedTag.element) {
                    highlightedTag.element.classList.add('highlighted');
                    
                    if (highlightedTag.button) {
                        // Animate in the new highlight
                        gsap.to(highlightedTag.button, {
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            scale: 1.05,
                            duration: 0.3,
                            ease: "power2.out"
                        });
                        
                        // Add a subtle pulse effect
                        gsap.delayedCall(0.3, () => {
                            if (highlightedTag.element.classList.contains('highlighted')) {
                                gsap.to(highlightedTag.button, {
                                    scale: 1.02,
                                    duration: 0.15,
                                    yoyo: true,
                                    repeat: 1,
                                    ease: "power2.inOut"
                                });
                            }
                        });
                    }
                    
                    // Scroll to highlighted item if needed
                    this.scrollToHighlighted(highlightedTag.element);
                }
            }
        },

        scrollToHighlighted(element) {
            if (!state.sb || !elements.scrollViewport) return;
            
            const containerRect = elements.scrollViewport.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            
            const relativeLeft = elementRect.left - containerRect.left;
            const relativeRight = elementRect.right - containerRect.left;
            
            if (relativeLeft < 0) {
                // Element is to the left of viewport
                state.sb.scrollTo({ x: state.sb.position.x + relativeLeft - 20 });
            } else if (relativeRight > containerRect.width) {
                // Element is to the right of viewport
                state.sb.scrollTo({ x: state.sb.position.x + (relativeRight - containerRect.width) + 20 });
            }
        },

        navigateHighlight(direction) {
            const visibleCount = state.filteredTags.filter(tag => tag.isVisible).length;
            
            if (visibleCount === 0) return;
            
            if (direction === 'down') {
                state.highlightedIndex = Math.min(state.highlightedIndex + 1, visibleCount - 1);
            } else if (direction === 'up') {
                state.highlightedIndex = Math.max(state.highlightedIndex - 1, -1);
            }
            
            this.updateHighlight();
        },

        selectHighlighted() {
            if (state.highlightedIndex >= 0 && state.highlightedIndex < state.filteredTags.length) {
                const selectedTag = state.filteredTags[state.highlightedIndex];
                if (selectedTag) {
                    // Check if tag is already active or exists in DOM (same checks as handleTagClick)
                    if (state.activeTags.includes(selectedTag.text)) {
                        console.log('Select highlighted: Tag already active, ignoring');
                        return false;
                    }
                    
                    if (elements.tagContainer) {
                        const existingTagSpans = elements.tagContainer.querySelectorAll('.predictive-search-tag span');
                        for (let span of existingTagSpans) {
                            if (span.textContent.trim() === selectedTag.text) {
                                console.log('Select highlighted: Tag already exists in DOM, ignoring');
                                return false;
                            }
                        }
                    }
                    
                    tagManager.createFromTagData(selectedTag);
                    return true;
                }
            }
            return false;
        }
    };

    // ============================================================================
    // TAG MANAGEMENT (updated with fixed removal logic)
    // ============================================================================
    
    const tagManager = {
        create(text) {
            // Find the tag data
            const tagData = allTagsData.find(data => data.text === text);
            if (tagData) {
                return this.createFromTagData(tagData);
            }
            
            // Fallback for free text
            return this.createFreeText(text);
        },

        createFromTagData(tagData) {
            if (state.activeTags.includes(tagData.text)) return null;
            
            // Double-check for existing tags in DOM to prevent duplicates
            if (elements.tagContainer) {
                const existingTagSpans = elements.tagContainer.querySelectorAll('.predictive-search-tag span');
                for (let span of existingTagSpans) {
                    if (span.textContent.trim() === tagData.text) {
                        console.log('Tag already exists in DOM, skipping creation');
                        return null;
                    }
                }
            }
            
            const tag = document.createElement('div');
            tag.className = 'predictive-search-tag'; // Only change: class name
            
            const tagText = document.createElement('span');
            tagText.textContent = tagData.text;
            tag.appendChild(tagText);
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'predictive-search-tag-remove'; // Only change: class name
            removeBtn.innerHTML = '×';
            
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(tagData.text, tag);
            });
            
            tag.appendChild(removeBtn);
            elements.tagContainer.appendChild(tag);
            
            state.activeTags.push(tagData.text);
            
            // Hide the tag from available tags with animation
            gsap.to(tagData.element, {
                opacity: 0,
                scale: 0.8,
                y: -10,
                duration: 0.2,
                onComplete: () => {
                    tagData.element.style.display = 'none';
                }
            });
            
            // Clear input and re-filter
            elements.input.value = '';
            filterManager.filterTags('');
            
            // Update ScrollBooster
            if (state.sb) {
                state.sb.updateMetrics();
            }
            
            // Update clear button visibility
            uiManager.updateClearButtonVisibility();
            
            // Animate in the new tag with a more sophisticated animation
            gsap.fromTo(tag, {
                opacity: 0,
                scale: 0.3,
                y: 20,
                rotationX: -90
            }, {
                opacity: 1,
                scale: 1,
                y: 0,
                rotationX: 0,
                duration: 0.5,
                ease: "back.out(1.7)"
            });
            
            uiManager.updateClearButtonVisibility(); // Added for predictive search
            elements.input.focus();
            
            console.log(`Tag "${tagData.text}" created successfully`);
            return tag;
        },

        createFreeText(text) {
            if (state.activeTags.includes(text)) return null;
            
            const tag = document.createElement('div');
            tag.className = 'predictive-search-tag'; // Only change: class name
            
            const tagText = document.createElement('span');
            tagText.textContent = text;
            tag.appendChild(tagText);
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'predictive-search-tag-remove'; // Only change: class name
            removeBtn.innerHTML = '×';
            
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(text, tag);
            });
            
            tag.appendChild(removeBtn);
            elements.tagContainer.appendChild(tag);
            
            state.activeTags.push(text);
            
            // Clear input and re-filter
            elements.input.value = '';
            filterManager.filterTags('');
            
            // Update ScrollBooster
            if (state.sb) {
                state.sb.updateMetrics();
            }
            
            // Update clear button visibility
            uiManager.updateClearButtonVisibility();
            
            // Animate in the new tag with a more sophisticated animation
            gsap.fromTo(tag, {
                opacity: 0,
                scale: 0.3,
                y: 20,
                rotationX: -90
            }, {
                opacity: 1,
                scale: 1,
                y: 0,
                rotationX: 0,
                duration: 0.5,
                ease: "back.out(1.7)"
            });
            
            // Add a subtle glow effect
            gsap.delayedCall(0.2, () => {
                gsap.to(tag, {
                    boxShadow: '0 0 0 3px rgba(156, 163, 175, 0.3)',
                    duration: 0.3,
                    onComplete: () => {
                        gsap.to(tag, {
                            boxShadow: '0 0 0 0 rgba(156, 163, 175, 0)',
                            duration: 0.5
                        });
                    }
                });
            });
            
            uiManager.updateClearButtonVisibility(); // Added for predictive search
            elements.input.focus();
            
            console.log(`Free text tag "${text}" created successfully`);
            return tag;
        },

        // SIMPLE REMOVE METHOD
        remove(text, tagElement) {
            state.activeTags = state.activeTags.filter(tag => tag !== text);
            
            if (tagElement) {
                gsap.to(tagElement, {
                    opacity: 0,
                    scale: 0.8,
                    duration: 0.2,
                    onComplete: () => {
                        try {
                            if (tagElement && tagElement.isConnected) {
                                if (tagElement.remove) {
                                    tagElement.remove();
                                } else if (tagElement.parentNode) {
                                    tagElement.parentNode.removeChild(tagElement);
                                }
                            }
                        } catch (error) {
                            console.warn('Error removing tag element:', error);
                        }
                        
                        // SIMPLE: Update all tag visibility after removal
                        simpleTagManager.updateAllTagsVisibility();
                        uiManager.updateClearButtonVisibility();
                        
                        if (state.sb) {
                            state.sb.updateMetrics();
                        }
                    }
                });
            } else {
                // If no element animation, update immediately
                simpleTagManager.updateAllTagsVisibility();
                uiManager.updateClearButtonVisibility();
            }
            
            if (elements.input) {
                elements.input.focus();
            }
            
            console.log(`Tag "${text}" removed successfully`);
        },

        clear() {
            state.activeTags = [];
            if (elements.tagContainer) {
                elements.tagContainer.innerHTML = '';
            }
            
            // Re-filter to show all tags
            filterManager.filterTags('');
            
            if (state.sb) {
                state.sb.updateMetrics();
            }
            
            uiManager.updateClearButtonVisibility(); // Added for predictive search
            console.log('All tags cleared');
        }
    };

    // ============================================================================
    // SCROLL MANAGEMENT (from mini-search)
    // ============================================================================
    
    // Fix the scrollManager.init() method
    const scrollManager = {
        init() {
            if (!elements.scrollViewport || !elements.scrollContent) return null;
            
            const scrollBooster = new ScrollBooster({
                viewport: elements.scrollViewport,
                content: elements.scrollContent,
                scrollMode: 'transform',
                direction: 'horizontal',
                friction: 0.2,
                bounce: false,
                emulateScroll: true,
                onUpdate: (state) => {  // Pass the state parameter
                    uiManager.handleUpdate(state); // Now state is available
                }
            });

            return scrollBooster;
        }
    };

    // ============================================================================
    // SEARCH MANAGEMENT (predictive search specific)
    // ============================================================================
    
    const searchManager = {
        open() {
            state.isOpen = true
            el.section.classList.add('is-active')
            el.section.setAttribute('data-lenis-prevent', '');
            
            if (!utils_internal.isOnSearchPage()) {
                elements.input.focus()
            }
    
            document.body.classList.add('overflow-hidden')
            
            gsap.to(elements.hidden, { opacity: 0, duration: 0.3 });
            gsap.to(elements.results, { height: 'auto', duration: 0.3 });
            
            const visibleResultItems = elements.resultsItems.filter(item => 
                item.style.display !== 'none'
            );
            
            if (visibleResultItems.length > 0) {
                gsap.fromTo(visibleResultItems, {
                    opacity: 0,
                    y: 40
                }, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    stagger: 0.03,
                    ease: "back.out(1.7)"
                })
            }
    
            requestAnimationFrame(() => {
                gsap.to(elements.submit, { 
                    x: 0,
                    duration: 0.4,
                    ease: "power2.out"
                })
            })
    
            // Reset ScrollBooster position when search opens
            if (state.sb) {
                // Update metrics first to ensure accurate calculations
                state.sb.updateMetrics();
                
                // Reset to starting position (leftmost)
                state.sb.scrollTo({ x: 0 });
                state.sb.setPosition({ x: 0 });
                
                console.log('ScrollBooster position reset to start');
            }
    
            elements.input.focus()
            elements.submit.style.pointerEvents = 'auto'
            uiManager.updateClearButtonVisibility();
        },

        openAndScrollTo(targetX = 0) {
            this.open();
            
            // Wait for the opening animation to settle before scrolling
            gsap.delayedCall(0.4, () => {
                if (state.sb) {
                    state.sb.scrollTo({ x: targetX });
                }
            });
        },

        close(preserveInput = false, preserveTags = false) {
            state.isOpen = false
            el.section.classList.remove('is-active')
            gsap.to(elements.close, { scale: 1, duration: 0.2 })
            gsap.to(elements.hidden, { opacity: 1, duration: 0.3 })
            gsap.to(elements.results, { height: 0, duration: 0.3 })
            gsap.to(elements.submit, { x: '101%', duration: 0.4, ease: "power2.out" })

            el.section.removeAttribute('data-lenis-prevent');
            document.body.classList.remove('overflow-hidden')

            gsap.set(elements.resultsItems, {
                opacity: 0,
                y: 40
            })

            elements.submit.style.pointerEvents = 'none'

            if (!preserveInput) {
                elements.input.value = ''
            }

            // Don't clear tags if preserveTags is true
            if (!preserveTags) {
                if (!preserveInput) {
                    gsap.to(elements.clearButton, { opacity: 0, duration: 0.2 })
                    elements.clearButton.style.pointerEvents = 'none'
                }
            } else {
                // Keep clear button visible if there are tags
                uiManager.updateClearButtonVisibility();
            }

            if (state.sb) {
                state.sb.scrollTo({ x: 0 })
                state.sb.setPosition({ x: 0 })
            }
        },

        clearAll() {
            stateManager.clearAllTags(false); // Use new clearAllTags method
            this.close(false);
            
            if (elements.input) {
                elements.input.value = '';
            }
        }
    };

    // ============================================================================
    // EVENT HANDLERS (from mini-search with predictive search additions)
    // ============================================================================
    
    const eventHandlers = {
        handleInput(e) {
            const query = e.target.value;
            console.log('Input changed:', query);
            
            // Real-time filtering (from mini-search)
            filterManager.filterTags(query);
            
            // Update clear button visibility (predictive search)
            uiManager.updateClearButtonVisibility();
            
            // API integration for longer queries (predictive search specific)
            if (query.length > 2) {
                try {
                    fetch(`/wp-json/outten-golden/v1/search?query=${encodeURIComponent(query)}&limit=10`)
                        .then(response => {
                            if (response.ok) {
                                return response.json();
                            }
                            throw new Error('API failed');
                        })
                        .then(apiResults => {
                            // Handle API results here if needed
                            console.log('API results:', apiResults);
                        })
                        .catch(error => {
                            console.log('API failed, using existing tags');
                        });
                } catch (error) {
                    console.log('API failed, using existing tags');
                }
            }
        },

        handleKeydown(e) {
            // Only handle tag removal keys when search is open or when we have tags
            const canHandleTagRemoval = state.isOpen || (state.activeTags.length > 0 && document.activeElement === elements.input);
            
            // Prevent rapid key processing
            const now = Date.now();
            if (state.isProcessingKey || (now - state.lastKeyTime) < 100) {
                if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'Backspace') {
                    e.preventDefault();
                    console.log(`${e.key}: Blocked by debounce`);
                    return;
                }
            }
            
            // Handle arrow keys for navigation (only when search is open)
            if (state.isOpen && e.key === 'ArrowDown') {
                e.preventDefault();
                filterManager.navigateHighlight('down');
                return;
            }
            
            if (state.isOpen && e.key === 'ArrowUp') {
                e.preventDefault();
                filterManager.navigateHighlight('up');
                return;
            }
            
            // Handle Enter for selection OR search (only when search is open)
            if (state.isOpen && e.key === 'Enter') {
                e.preventDefault();
                
                // Set processing flag
                state.isProcessingKey = true;
                state.lastKeyTime = now;
                
                // Try to select highlighted item first
                const highlighted = filterManager.selectHighlighted();
                
                // Reset processing flag after a delay
                setTimeout(() => {
                    state.isProcessingKey = false;
                }, 200);
                
                if (highlighted) {
                    return;
                }
                
                // If no highlighted item, trigger search directly
                eventHandlers.handleSubmit(e);
                return;
            }
            
            // Handle Tab for auto-completion (only when search is open)
            if (state.isOpen && e.key === 'Tab') {
                e.preventDefault();
                
                // Set processing flag
                state.isProcessingKey = true;
                state.lastKeyTime = now;
                
                console.log('Tab pressed, filtered tags:', state.filteredTags.length);
                
                if (state.filteredTags.length > 0) {
                    const firstTag = state.filteredTags[0];
                    console.log('First tag to process:', firstTag.text);
                    
                    // Check if tag is already active or exists in DOM
                    if (state.activeTags.includes(firstTag.text)) {
                        console.log('Tab: Tag already active, ignoring');
                        state.isProcessingKey = false;
                        return;
                    }
                    
                    if (elements.tagContainer) {
                        const existingTagSpans = elements.tagContainer.querySelectorAll('.predictive-search-tag span');
                        for (let span of existingTagSpans) {
                            if (span.textContent.trim() === firstTag.text) {
                                console.log('Tab: Tag already exists in DOM, ignoring');
                                state.isProcessingKey = false;
                                return;
                            }
                        }
                    }
                    
                    console.log('Creating tag via Tab:', firstTag.text);
                    tagManager.createFromTagData(firstTag);
                }
                
                // Reset processing flag after a delay
                setTimeout(() => {
                    state.isProcessingKey = false;
                }, 200);
                
                return;
            }
            
            // Handle Backspace to remove last tag when input is empty (works when focused on input)
            if (canHandleTagRemoval && e.key === 'Backspace' && elements.input.value === '' && state.activeTags.length > 0) {
                e.preventDefault();
                
                // Set processing flag to prevent rapid backspace
                if (state.isProcessingKey) {
                    console.log('Backspace: Already processing, ignoring');
                    return;
                }
                
                state.isProcessingKey = true;
                state.lastKeyTime = now;
                
                console.log('Backspace pressed, removing last tag. Current tags:', state.activeTags.length);
                
                const lastTag = state.activeTags[state.activeTags.length - 1];
                const tagElements = elements.tagContainer.querySelectorAll('.predictive-search-tag');
                const lastTagElement = tagElements[tagElements.length - 1];
                
                console.log('Removing tag:', lastTag);
                tagManager.remove(lastTag, lastTagElement);
                
                // Reset processing flag after a delay
                setTimeout(() => {
                    state.isProcessingKey = false;
                    // Update clear button visibility after processing is complete
                    uiManager.updateClearButtonVisibility();
                }, 200);

                return;
            }
            
            // Handle Escape to clear filter
            if (e.key === 'Escape') {
                searchManager.close(false);
                return;
            }
            
            // Handle Cmd/Ctrl+K to toggle search
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                if (!state.isOpen) {
                    searchManager.open();
                } else {
                    searchManager.close(false);
                }
                return;
            }
        },

        handleTagClick(tagData) {
            // Prevent rapid clicking by checking if tag is already being processed
            if (state.activeTags.includes(tagData.text)) {
                console.log('Tag already active, ignoring click');
                return;
            }
            
            // Check if tag is already in DOM
            if (elements.tagContainer) {
                const existingTagSpans = elements.tagContainer.querySelectorAll('.predictive-search-tag span');
                for (let span of existingTagSpans) {
                    if (span.textContent.trim() === tagData.text) {
                        console.log('Tag already exists in DOM, ignoring click');
                        return;
                    }
                }
            }
            
            console.log('Tag clicked:', tagData.text);
            tagManager.createFromTagData(tagData);
        },

        handleSubmit(e) {
            e.preventDefault();
            e.stopPropagation();

            console.log('Active tags before processing:', state.activeTags);

            // Add current input as tag if it exists
            const inputValue = elements.input.value.trim();
            if (inputValue && !state.activeTags.includes(inputValue)) {
                tagManager.createFreeText(inputValue);
            }

            const searchQuery = elements.input.value.trim();
            const baseURL = window.location.origin;
            
            let cleanURL = baseURL + '/search';
            
            if (state.activeTags.length > 0) {
                const tagsSlugs = state.activeTags.map(tag => 
                    tag.toLowerCase()
                       .replace(/\s+/g, '-')
                       .replace(/[^a-z0-9\-]/g, '')
                ).join('+');
                
                if (searchQuery) {
                    cleanURL += `/${encodeURIComponent(searchQuery)}/tags/${tagsSlugs}`;
                } else {
                    cleanURL += `/tags/${tagsSlugs}`;
                }
            } else if (searchQuery) {
                cleanURL += `/${encodeURIComponent(searchQuery)}`;
            } else {
                cleanURL = baseURL + '/?s=';
            }
            
            console.log('Clean URL:', cleanURL);
            
            // SIMPLE: Always clear everything after submit
            simpleTagManager.clearAll();
            
            // CLOSE search completely and remove focus
            searchManager.close(false, false);
            
            // Remove focus from input explicitly
            if (elements.input && elements.input === document.activeElement) {
                elements.input.blur();
            }
            
            // Remove focus from any other focused element in the header
            if (el.section && el.section.contains(document.activeElement)) {
                document.activeElement.blur();
            }
            
            console.log('Search cleared and closed after submit');
            
            // Navigation
            if (typeof initTaxi !== 'undefined' && initTaxi.navigateTo) {
                initTaxi.navigateTo(cleanURL);
            } else {
                window.location.href = cleanURL;
            }
        },

        handleClickOutside(e) {
            if (state.isOpen && el.section && !el.section.contains(e.target)) {
                searchManager.close(false)
            }
        }
    };

    // ============================================================================
    // INITIALIZATION (updated to always restore state)
    // ============================================================================
    
    const init = () => {
        // Create no results message ONCE
        if (elements.scrollContent && !elements.noResultsMessage) {
            // Check if one already exists in DOM
            const existingMessage = elements.scrollContent.querySelector('.no-results-message');
            if (existingMessage) {
                elements.noResultsMessage = existingMessage;
                console.log('Found existing no results message');
            } else {
                utils_internal.createNoResultsMessage();
            }
        }
        
        // Initialize ScrollBooster
        state.sb = scrollManager.init();
        
        // *** SIMPLE INITIALIZATION - ALWAYS START CLEAN ***
        setTimeout(() => {
            console.log('Page loaded - simple clean start');
            
            // Reset all available tags to clean state
            allTagsData.forEach(tagData => {
                if (tagData.element) {
                    tagData.element.style.display = '';
                    tagData.isVisible = true;
                    
                    // Reset GSAP properties
                    gsap.set(tagData.element, {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        clearProps: "transform"
                    });
                    
                    if (tagData.button) {
                        tagData.button.innerHTML = `<span>${tagData.originalText}</span>`;
                        gsap.set(tagData.button, {
                            backgroundColor: '',
                            color: '',
                            scale: 1,
                            clearProps: "all"
                        });
                    }
                }
            });
            
            // Set all tags as visible
            state.filteredTags = [...allTagsData];
            
            // Update UI
            uiManager.updateClearButtonVisibility();
            
            // Update ScrollBooster
            if (state.sb) {
                state.sb.updateMetrics();
            }
            
            console.log('Simple clean initialization complete');
        }, 10); // Reduced delay from 100ms to 10ms
        
        // Setup available tag handlers (from mini-search)
        allTagsData.forEach(tagData => {
            if (tagData.button) {
                // Remove any existing listeners to prevent duplicates
                if (tagData.clickHandler) {
                    tagData.button.removeEventListener('click', tagData.clickHandler);
                }
                
                // Create and store the click handler
                tagData.clickHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    eventHandlers.handleTagClick(tagData);
                };
                
                // Add the new listener
                tagData.button.addEventListener('click', tagData.clickHandler);
            }
        });
        
        // Setup event listeners
        if (elements.input) {
            utils_internal.addTrackedEventListener(elements.input, 'input', eventHandlers.handleInput);
            utils_internal.addTrackedEventListener(elements.input, 'keydown', eventHandlers.handleKeydown);
        }
        
        if (elements.form) {
            utils_internal.addTrackedEventListener(elements.form, 'submit', eventHandlers.handleSubmit);
        }
        
        // Clear button handler - now uses simple logic
        if (elements.clearButton) {
            utils_internal.addTrackedEventListener(elements.clearButton, 'click', (e) => {
                e.preventDefault();
                simpleTagManager.clearAll();
                elements.input.focus();
            });
        }

        // Search link handlers - clear everything when clicked
        if (elements.searchLinks && elements.searchLinks.length > 0) {
            elements.searchLinks.forEach(searchLink => {
                utils_internal.addTrackedEventListener(searchLink, 'click', (e) => {
                    console.log('Search link clicked - clearing all filters');
                    
                    // Clear everything completely
                    state.activeTags = [];
                    
                    // Clear DOM tags
                    if (elements.tagContainer) {
                        elements.tagContainer.innerHTML = '';
                    }
                    
                    // Clear input
                    if (elements.input) {
                        elements.input.value = '';
                    }
                    
                    // DON'T show any tags - keep search completely empty
                    allTagsData.forEach(tagData => {
                        if (tagData.element) {
                            tagData.element.style.display = 'none'; // Hide ALL tags
                            tagData.isVisible = false;
                        }
                    });
                    
                    // Clear filtered tags
                    state.filteredTags = [];
                    
                    // Close search if open
                    if (state.isOpen) {
                        searchManager.close(false, false);
                    }
                    
                    // Update UI
                    uiManager.updateClearButtonVisibility();
                    
                    // Update ScrollBooster
                    if (state.sb) {
                        state.sb.updateMetrics();
                    }
                    
                    console.log('Search completely emptied - no tags visible');
                });
            });
        }

        // Form click to open - ensure input gets focus for tag removal
        if (elements.form) {
            elements.form.addEventListener('click', () => {
                if (!state.isOpen) {
                    searchManager.open();
                } else {
                    // If already open, ensure input has focus for backspace handling
                    elements.input.focus();
                }
            });
        }

        // Close button
        if (elements.close) {
            elements.close.addEventListener('click', () => {
                searchManager.close(false)
            });
        }

        // Global event listeners
        utils_internal.addTrackedEventListener(document.body, 'keydown', eventHandlers.handleKeydown);
        utils_internal.addTrackedEventListener(document, 'click', eventHandlers.handleClickOutside);
        
        // Initial filter (show all non-active tags)
        filterManager.filterTags('');
        
        console.log('Predictive search initialized with', allTagsData.length, 'available tags');
    };

    // ============================================================================
    // CLEANUP (from mini-search)
    // ============================================================================
    
    const cleanup = () => {
        // Kill all GSAP animations for this component
        gsap.killTweensOf([
            ...allTagsData.map(tag => tag.element),
            ...allTagsData.map(tag => tag.button).filter(Boolean),
            elements.noResultsMessage
        ].filter(Boolean));
        
        // Remove event listeners
        state.eventListeners.forEach(({ element, event, handler }) => {
            evt.off(event, element, handler);
        });
        
        // Destroy ScrollBooster
        if (state.sb && typeof state.sb.destroy === 'function') {
            state.sb.destroy();
        }
        
        // Clear state
        state.activeTags = [];
        state.filteredTags = [];
        state.eventListeners = [];
        state.sb = null;
        
        console.log('Predictive search cleaned up');
    }

    // Initialize
    init()

    // *** IMMEDIATE CLEANUP - Prevent flash of old values ***
    // Clear input immediately to prevent browser auto-fill flash
    if (elements.input) {
        elements.input.value = '';
    }
    
    // Clear any existing tags immediately
    if (elements.tagContainer) {
        elements.tagContainer.innerHTML = '';
    }

    // ============================================================================
    // PUBLIC API (updated with new methods)
    // ============================================================================
    
    return {
        addTag: (text) => tagManager.create(text),
        removeTag: (text) => {
            const tagElements = Array.from(elements.tagContainer.querySelectorAll('.predictive-search-tag span'));
            const targetTag = tagElements.find(span => span.textContent.trim() === text);
            if (targetTag) {
                const tagElement = targetTag.closest('.predictive-search-tag');
                tagManager.remove(text, tagElement);
            }
        },
        clearTags: () => tagManager.clear(),
        getTags: () => [...state.activeTags],
        filter: (query) => filterManager.filterTags(query),
        destroy: cleanup,
        
        // Predictive search specific API
        open: searchManager.open,
        close: searchManager.close,
        clearSearch: searchManager.clearAll,
        getActiveTags: () => [...state.activeTags],
        validateState: utils_internal.validateState,
        
        // New methods for state management
        restoreFromURL: stateManager.restoreFromURL,
        validateAndSync: stateManager.validateAndSync,
        parseURLTags: urlManager.parseTagsFromURL,
        clearAllTags: stateManager.clearAllTags
    }
}