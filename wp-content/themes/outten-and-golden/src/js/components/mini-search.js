import ScrollBooster from 'scrollbooster'
import { gsap } from 'gsap'
import { utils, evt } from '@/core'
import { initTaxi } from '@/app.js'

const { qs, qsa } = utils;

/**
 * Enhanced Search Component with Empty Initial State
 * Features: empty on load, real-time filtering, fuzzy search, keyboard navigation, and smooth animations
 */
export default function initEnhancedSearch(el) {
    if (!el.section) return;

    // ============================================================================
    // DOM ELEMENTS
    // ============================================================================
    
    const elements = {
        form: qs('form', el.section),
        input: qs('.js-mini-search-input', el.section),
        tagContainer: qs('.search-tags', el.section),
        submit: qs('.search-submit', el.section),
        scrollContent: qs('.js-mini-scrollboost-content', el.section),
        scrollViewport: qs('.js-mini-scrollboost', el.section),
        availableTags: qsa('.js-mini-tag', el.section),
        clearButton: qs('.js-mini-search-clear', el.section),
        // ScrollBooster UI elements
        nextButton: qs('.js-mini-scrollboost-next', el.section),
        gradient: qs('.js-mini-scrollboost-gradient', el.section),
        length: qs('.js-mini-scrollboost-length', el.section),
        resetButton: qs('.js-mini-scrollboost-reset', el.section),
        noResultsMessage: null // Will be created dynamically
    };

    // ============================================================================
    // STATE
    // ============================================================================
    
    const state = {
        activeTags: [],
        filteredTags: [],
        highlightedIndex: -1,
        sb: null,
        eventListeners: [],
        searchValue: '',
        isFiltering: false,
        isInitialLoad: true, // Track if this is the initial load
        // ScrollBooster state
        isScrolling: false,
        hasMoved: false
    };

    // Create all available tags data structure for better searching
    const allTagsData = Array.from(elements.availableTags || []).map(tagElement => ({
        element: tagElement,
        text: tagElement.getAttribute('data-tag') || tagElement.textContent.trim(),
        originalText: tagElement.textContent.trim(),
        button: tagElement.querySelector('button'),
        isVisible: true, // Start with all tags visible
        matchScore: 1
    }));

    // ============================================================================
    // UTILITIES
    // ============================================================================
    
    const utils_internal = {
        addTrackedEventListener(element, event, handler, options) {
            evt.on(event, element, handler, options);
            state.eventListeners.push({ element, event, handler });
        },

        updateClearButtonVisibility() {
            if (!elements.clearButton) return;
            
            const currentInputValue = elements.input ? elements.input.value.trim() : '';
            const hasInput = currentInputValue.length > 0;
            const hasTags = state.activeTags.length > 0;
            
            if (hasInput || hasTags) {
                gsap.to(elements.clearButton, { opacity: 1, duration: 0.2 });
                elements.clearButton.style.pointerEvents = 'auto';
            } else {
                gsap.to(elements.clearButton, { opacity: 0, duration: 0.2 });
                elements.clearButton.style.pointerEvents = 'none';
            }
        },

        // Fuzzy search scoring
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

        // Highlight matching text
        highlightText(text, query) {
            if (!query) return text;
            
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<mark class="bg-yellow px-1 rounded">$1</mark>');
        },

        // Create "no results" message
        createNoResultsMessage() {
            const message = document.createElement('div');
            message.className = 'no-results-message text-center py-8 text-gray-500';
            message.innerHTML = `
                <div class="text-sm">No matching tags found</div>
            `;
            message.style.display = 'none';
            elements.scrollContent.appendChild(message);
            elements.noResultsMessage = message;
            return message;
        },

        // Clear any existing tags from the selected tags container
        clearSelectedTagsContainer() {
            if (elements.tagContainer) {
                elements.tagContainer.innerHTML = '';
            }
        }
    };

    // ============================================================================
    // UI MANAGEMENT
    // ============================================================================
    
    const uiManager = {
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
                el.section.classList.add('is-active')
                if (elements.gradient) {
                    elements.gradient.classList.remove('is-active')
                }
            } else if (scrollState.borderCollision.left) {
                elements.nextButton.classList.add('is-active')
                el.section.classList.remove('is-active')
                if (elements.gradient) {
                    elements.gradient.classList.add('is-active')
                }
            } else {
                elements.nextButton.classList.remove('is-active')
                el.section.classList.add('is-active')
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
    // TAG FILTERING
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

            utils_internal.updateClearButtonVisibility();
            
            console.log('Filtered tags:', state.filteredTags.length);
        },

        updateTagDisplay(query) {
            // Get currently visible tags for comparison
            const previouslyVisible = allTagsData.filter(tagData => 
                tagData.element.style.display !== 'none'
            );
            
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
                
                // Handle no results message (only show if there's a query but no results)
                if (elements.noResultsMessage) {
                    if (visibleTags.length === 0 && query.trim()) {
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
                    } else {
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
                    tagManager.createFromTagData(selectedTag);
                    return true;
                }
            }
            return false;
        }
    };

    // ============================================================================
    // TAG MANAGEMENT
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
            
            const tag = document.createElement('div');
            tag.className = 'search-tag inline-flex items-center px-3 py-1 rounded-full text-sm mr-2 mb-2';
            
            const tagText = document.createElement('span');
            tagText.textContent = tagData.text;
            tag.appendChild(tagText);
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'search-tag-remove ml-2 rounded-full w-4 h-4 flex items-center justify-center';
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
            
            // Clear input and re-filter to show all available tags
            elements.input.value = '';
            filterManager.filterTags('');
            utils_internal.updateClearButtonVisibility();
            
            // Update ScrollBooster
            if (state.sb) {
                state.sb.updateMetrics();
            }
            
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
            
            elements.input.focus();
            
            console.log(`Tag "${tagData.text}" created successfully`);
            return tag;
        },

        createFreeText(text) {
            if (state.activeTags.includes(text)) return null;
            
            const tag = document.createElement('div');
            tag.className = 'search-tag inline-flex items-center bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm mr-2 mb-2';
            
            const tagText = document.createElement('span');
            tagText.textContent = text;
            tag.appendChild(tagText);
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'search-tag-remove ml-2 hover:bg-gray-200 rounded-full w-4 h-4 flex items-center justify-center';
            removeBtn.innerHTML = '×';
            
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(text, tag);
            });
            
            tag.appendChild(removeBtn);
            elements.tagContainer.appendChild(tag);
            
            state.activeTags.push(text);
            
            // Clear input and show all available tags
            elements.input.value = '';
            filterManager.filterTags('');
            
            // Update ScrollBooster
            if (state.sb) {
                state.sb.updateMetrics();
            }
            
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
            
            elements.input.focus();
            
            console.log(`Free text tag "${text}" created successfully`);
            return tag;
        },

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
                        
                        if (state.sb) {
                            state.sb.updateMetrics();
                        }
                    }
                });
            }
            
            // Re-filter with current search value (will show all tags if no search)
            filterManager.filterTags(state.searchValue);

            utils_internal.updateClearButtonVisibility();
            
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
            
            // Show all available tags instead of empty state
            filterManager.filterTags('');

            utils_internal.updateClearButtonVisibility();
            
            if (state.sb) {
                state.sb.updateMetrics();
            }
            
            console.log('All tags cleared');
        }
    };

    // ============================================================================
    // SCROLL MANAGEMENT
    // ============================================================================
    
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
    // EVENT HANDLERS
    // ============================================================================
    
    const eventHandlers = {
        handleInput(e) {
            const query = e.target.value;
            console.log('Input changed:', query);
            
            // Real-time filtering
            filterManager.filterTags(query);
        },

        handleKeydown(e) {
            // Handle arrow keys for navigation
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                filterManager.navigateHighlight('down');
                return;
            }
            
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                filterManager.navigateHighlight('up');
                return;
            }
            
            // Handle Enter for selection OR search
            if (e.key === 'Enter') {
                e.preventDefault();
                
                // Try to select highlighted item first
                if (filterManager.selectHighlighted()) {
                    return;
                }
                
                // If no highlighted item, trigger search directly
                eventHandlers.handleSubmit(e);
                return;
            }
            
            // Handle Tab for auto-completion
            if (e.key === 'Tab') {
                e.preventDefault();
                
                if (state.filteredTags.length > 0) {
                    const firstTag = state.filteredTags[0];
                    tagManager.createFromTagData(firstTag);
                }
                return;
            }
            
            // Handle Backspace to remove last tag when input is empty
            if (e.key === 'Backspace') {
                console.log('Backspace pressed');
                console.log('Input value:', `"${elements.input.value}"`);
                console.log('Input length:', elements.input.value.length);
                console.log('Active tags:', state.activeTags.length);
                
                if (elements.input.value === '' && state.activeTags.length > 0) {
                    e.preventDefault();
                    const lastTag = state.activeTags[state.activeTags.length - 1];
                    const tagElements = elements.tagContainer.querySelectorAll('.search-tag');
                    const lastTagElement = tagElements[tagElements.length - 1];
                    tagManager.remove(lastTag, lastTagElement);
                }
            }
            
            // Handle Escape to clear filter
            if (e.key === 'Escape') {
                elements.input.value = '';
                filterManager.filterTags('');
                elements.input.focus();
            }
        },

        handleTagClick(tagData) {
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
            
            // Navigation
            if (typeof initTaxi !== 'undefined' && initTaxi.navigateTo) {
                initTaxi.navigateTo(cleanURL);
            } else {
                window.location.href = cleanURL;
            }
        }
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    const init = () => {
        // Create no results message
        if (elements.scrollContent && !elements.noResultsMessage) {
            utils_internal.createNoResultsMessage();
        }

        // Clear any existing selected tags
        utils_internal.clearSelectedTagsContainer();
        
        // Initialize ScrollBooster
        state.sb = scrollManager.init();
        
        // Setup available tag handlers
        allTagsData.forEach(tagData => {
            if (tagData.button) {
                tagData.button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    eventHandlers.handleTagClick(tagData);
                });
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
        
        // Clear button handler
        if (elements.clearButton) {
            utils_internal.addTrackedEventListener(elements.clearButton, 'click', (e) => {
                e.preventDefault();
                tagManager.clear();
                elements.input.value = '';
                filterManager.filterTags('');
                elements.input.focus();
            });
        }

        // Reset button handler
        if (elements.resetButton) {
            utils_internal.addTrackedEventListener(elements.resetButton, 'click', (e) => {
                e.preventDefault();
                if (state.sb) {
                    state.sb.scrollTo({ x: 0 });
                    state.sb.setPosition({ x: 0 });
                }
            });
        }
        
        // Initial filter to show all tags
        filterManager.filterTags('');
        
        console.log('Enhanced search initialized with all tags visible and', allTagsData.length, 'available tags');
    };

    // ============================================================================
    // CLEANUP
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
        
        console.log('Enhanced search cleaned up');
    };

    // Initialize
    init();

    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    return {
        addTag: (text) => tagManager.create(text),
        removeTag: (text) => {
            const tagElements = Array.from(elements.tagContainer.querySelectorAll('.search-tag span'));
            const targetTag = tagElements.find(span => span.textContent.trim() === text);
            if (targetTag) {
                const tagElement = targetTag.closest('.search-tag');
                tagManager.remove(text, tagElement);
            }
        },
        clearTags: () => tagManager.clear(),
        getTags: () => [...state.activeTags],
        filter: (query) => filterManager.filterTags(query),
        destroy: cleanup,
        // Additional methods for ScrollBooster UI
        showAllTags: () => uiManager.showAllTags()
    };
}