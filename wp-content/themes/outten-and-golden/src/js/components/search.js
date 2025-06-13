import ScrollBooster from 'scrollbooster'
import gsap from 'gsap'
import { motion, animate, hover, spring, stagger, press } from 'motion'
import { utils, evt } from '@/core'
import { initTaxi } from '@/app.js'

const { qs, qsa } = utils;

/**
 * Predictive Search Component
 * A comprehensive search interface with tag management, URL state sync, and API integration
 */
export default function initPredictiveSearch(el) {
    if (!el) return;

    // ============================================================================
    // DOM ELEMENTS
    // ============================================================================
    
    const elements = {
        form: qs('form', el.section),
        input: qs('input', qs('form', el.section)),
        header: qs('header'),
        close: qs('.predictive-search-close', qs('header')),
        hidden: qsa('.predictive-search-hidden', qs('header')),
        results: qs('.predictive-search-results', qs('header')),
        resultsItems: qsa('.predictive-search-results-item', qs('.predictive-search-results', qs('header'))),
        tagContainer: qs('.predictive-search-tags', qs('header')),
        submit: qs('.js-predictive-search-submit', qs('form', el.section)),
        allTags: qsa('.js-tag', qs('header')),
        relatedLinks: qsa('.column-inner', qs('header')),
        clearButton: qs('.js-predictive-search-clear', qs('header')),
        nextButton: qs('.js-scrollboost-next'),
        gradient: qs('.js-scrollboost-gradient'),
        length: qs('.js-scrollboost-length'),
        resetButton: qs('.js-scrollboost-reset')
    };

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    
    const state = {
        activeTags: [],
        sb: null,
        isScrolling: false,
        hasMoved: false,
        isOpen: false,
        lastInputValue: '',
        lastCreatedTag: null,
        isPopulatingFromURL: false,
        populateTimeout: null,
        eventListeners: [],
        pressHandlers: []
    };

    const originalResultsItems = Array.from(elements.resultsItems).map(item => ({
        element: item,
        text: item.textContent.trim()
    }));

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    
    const utils_internal = {
        addTrackedEventListener(element, event, handler, options) {
            evt.on(event, element, handler, options);
            state.eventListeners.push({ element, event, handler });
        },

        addTrackedPressHandler(element, handler) {
            const pressHandler = press(element, handler);
            state.pressHandlers.push({ element, handler: pressHandler });
            return pressHandler;
        },

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
                console.warn('State mismatch detected, resetting...', {
                    activeTags: state.activeTags.length,
                    domTags: domTags.length
                });
                tagManager.clearAll();
                return false;
            }
            
            return true;
        }
    };

    // ============================================================================
    // UI MANAGEMENT
    // ============================================================================
    
    const uiManager = {
        updateClearButtonVisibility() {
            if (!elements.clearButton) return;
            
            if (!state.isOpen) {
                animate(elements.clearButton, { opacity: 0 });
                elements.clearButton.style.pointerEvents = 'none';
                return;
            }
            
            const currentInputValue = elements.input ? elements.input.value.trim() : '';
            const hasInput = currentInputValue.length > 0;
            const hasTags = state.activeTags.length > 0;
            
            console.log('Clear button visibility check:', { 
                isOpen: state.isOpen, 
                hasInput, 
                hasTags, 
                inputValue: currentInputValue,
                activeTags: state.activeTags.length 
            });
            
            if (hasInput || hasTags) {
                animate(elements.clearButton, { opacity: 1 });
                elements.clearButton.style.pointerEvents = 'auto';
                console.log('Showing clear button');
            } else {
                animate(elements.clearButton, { opacity: 0 });
                elements.clearButton.style.pointerEvents = 'none';
                console.log('Hiding clear button');
            }
        },

        showAllTags() {
            console.log('showAllTags called, activeTags:', state.activeTags);
            
            elements.allTags.forEach(tag => {
                const tagText = tag.textContent.trim();
                const isActive = state.activeTags.some(activeTag => 
                    activeTag.toLowerCase() === tagText.toLowerCase()
                );
                
                console.log(`showAllTags - Tag "${tagText}": isActive=${isActive}`);
                
                if (!isActive) {
                    tag.style.display = ''
                    animate(tag, {
                        opacity: 1,
                        y: 0
                    }, {
                        duration: 0.3
                    });
                } else {
                    tag.style.display = 'none'
                    console.log(`Hiding active tag: "${tagText}"`);
                }
            })
        }
    };

    // ============================================================================
    // SEARCH MANAGEMENT
    // ============================================================================
    
    const searchManager = {
        open() {
            state.isOpen = true
            elements.header.classList.add('is-active')
            elements.header.setAttribute('data-lenis-prevent', '');
            
            if (!utils_internal.isOnSearchPage()) {
                elements.input.focus()
            }

            document.body.classList.add('overflow-hidden')
            
            animate(elements.hidden, { opacity: 0 });
            animate(elements.results, { height: 'auto' });
            
            const visibleResultItems = elements.resultsItems.filter(item => 
                item.style.display !== 'none'
            );
            
            if (visibleResultItems.length > 0) {
                animate(visibleResultItems, {
                    opacity: 1,
                    y: 0
                }, {
                    delay: stagger(0.03),
                    type: spring,
                    bounce: 0.5,
                    duration: 1
                })
            }

            requestAnimationFrame(() => {
                animate(elements.submit, { 
                    transform: 'translateX(0)'
                }, { 
                    ease: 'easeOut'
                })
            })

            elements.input.focus()
            elements.submit.style.pointerEvents = 'auto'
            uiManager.updateClearButtonVisibility();

            if (elements.nextButton) {
                utils_internal.addTrackedPressHandler(elements.nextButton, () => {
                    animate(elements.nextButton, { scale: 0.9 })

                    return () => {
                        animate(elements.nextButton, { scale: 1 })
                        if (state.sb) {
                            state.sb.scrollTo({ x: 250 })
                        }
                    }
                })
            }
        },

        close(preserveInput = false) {
            state.isOpen = false
            elements.header.classList.remove('is-active')
            animate(elements.close, { scale: 1 })
            animate(elements.hidden, { opacity: 1 })
            animate(elements.results, { height: 0 })
            animate(elements.submit, { transform: 'translateX(101%)' }, { ease: 'easeOut' })
        
            elements.header.removeAttribute('data-lenis-prevent');
            document.body.classList.remove('overflow-hidden')
        
            elements.resultsItems.forEach(item => {
                animate(item, {
                    opacity: 0,
                    y: 40,
                    duration: 0
                })
            })
        
            elements.submit.style.pointerEvents = 'none'
        
            if (!preserveInput) {
                elements.input.value = ''
            }
        
            animate(elements.clearButton, { opacity: 0 })
            elements.clearButton.style.pointerEvents = 'none'
        
            if (state.sb) {
                state.sb.scrollTo({ x: 0 })
                state.sb.setPosition({ x: 0 })
            }
        },

        clearAll() {
            console.log('clearAllSearch called');
            
            state.isPopulatingFromURL = true;
            
            if (state.populateTimeout) {
                clearTimeout(state.populateTimeout);
                state.populateTimeout = null;
            }
            
            tagManager.clearAll();
            this.close(false);
            
            state.lastInputValue = '';
            state.lastCreatedTag = null;
            
            if (elements.input) {
                elements.input.value = '';
            }
            
            setTimeout(() => {
                state.isPopulatingFromURL = false;
                console.log('clearAllSearch complete - re-enabling URL population');
            }, 300);
            
            console.log('Search cleared completely');
        }
    };

    // ============================================================================
    // TAG MANAGEMENT
    // ============================================================================
    
    const tagManager = {
        create(text, relatedResultItem) {
            if (elements.tagContainer) {
                const existingTagSpans = elements.tagContainer.querySelectorAll('.predictive-search-tag span');
                for (let span of existingTagSpans) {
                    if (span.textContent.trim() === text) {
                        console.log(`Tag element for "${text}" already exists in DOM`);
                        return null;
                    }
                }
            }
            
            const tag = document.createElement('div')
            tag.className = 'predictive-search-tag'
            
            const tagText = document.createElement('span');
            tagText.textContent = text;
            tag.appendChild(tagText);
            
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'predictive-search-tag-remove';
            removeBtn.innerHTML = '&times;';
            
            const removeHandler = (e) => {
                e.stopPropagation();
                this.remove(text, tag, relatedResultItem)

                removeBtn.removeEventListener('click', removeHandler);

                if (state.activeTags.length === 0) {
                    uiManager.showAllTags()
                }
            }
            
            evt.on('click', removeBtn, removeHandler)
            
            tag.appendChild(removeBtn)
            elements.tagContainer.appendChild(tag)

            if (state.sb) {
                state.sb.updateMetrics()
            }
            
            uiManager.updateClearButtonVisibility();
            
            console.log(`Tag "${text}" created successfully`);
            return tag
        },

        remove(text, tagElement, relatedResultItem) {
            state.activeTags = state.activeTags.filter(tag => tag !== text)
            
            if (tagElement && tagElement.parentNode) {
                tagElement.parentNode.removeChild(tagElement);
            }
            
            if (relatedResultItem) {
                relatedResultItem.style.display = ''
                animate(relatedResultItem, {
                    opacity: 1,
                    y: 0,
                }, {
                    duration: 0.3
                });

                if (state.sb) {
                    state.sb.updateMetrics()
                }
            } else {
                const matchingItem = originalResultsItems.find(item => item.text === text)
                if (matchingItem && matchingItem.element) {
                    matchingItem.element.style.display = ''
                    animate(matchingItem.element, {
                        opacity: 1,
                        y: 0,
                    }, {
                        duration: 0.3
                    })

                    if (state.sb) {
                        state.sb.updateMetrics()
                    }
                }
            }
            
            uiManager.updateClearButtonVisibility();
            elements.input.focus()
        },

        removeAndPutInInput(tagText) {
            state.activeTags = state.activeTags.filter(tag => tag !== tagText);
            
            const tagElements = Array.from(elements.tagContainer.querySelectorAll('.predictive-search-tag span'));
            const targetTagSpan = tagElements.find(span => span.textContent.trim() === tagText);
            
            if (targetTagSpan) {
                const tagElement = targetTagSpan.closest('.predictive-search-tag');
                if (tagElement && tagElement.parentNode) {
                    tagElement.parentNode.removeChild(tagElement);
                }
            }
            
            elements.input.value = tagText;
            state.lastInputValue = tagText;
            
            const matchingItem = originalResultsItems.find(item => item.text === tagText);
            if (matchingItem && matchingItem.element) {
                matchingItem.element.style.display = '';
                animate(matchingItem.element, {
                    opacity: 1,
                    y: 0,
                }, {
                    duration: 0.3
                });
            }
            
            if (state.sb) {
                state.sb.updateMetrics()
            }
            
            if (state.activeTags.length === 0) {
                uiManager.showAllTags()
            }

            uiManager.updateClearButtonVisibility();

            elements.input.focus()
            elements.input.setSelectionRange(elements.input.value.length, elements.input.value.length)
            
            console.log(`Tag "${tagText}" removed and text put back in input`)
        },

        clearAll() {
            state.activeTags = [];
            
            if (elements.tagContainer) {
                const existingTags = elements.tagContainer.querySelectorAll('.predictive-search-tag');
                existingTags.forEach(tag => {
                    if (tag.parentNode) {
                        tag.parentNode.removeChild(tag);
                    }
                });
                elements.tagContainer.innerHTML = '';
            }
            
            originalResultsItems.forEach(item => {
                if (item.element) {
                    item.element.style.display = '';
                    item.element.style.opacity = '1';
                }
            });
            
            uiManager.updateClearButtonVisibility();
            
            console.log('All tags cleared and result items restored');
        }
    };

    // ============================================================================
    // URL STATE MANAGEMENT
    // ============================================================================
    
    const urlManager = {
        populateFromURL() {
            if (state.isPopulatingFromURL) {
                console.log('Already populating from URL, skipping...');
                return;
            }
            
            state.isPopulatingFromURL = true;
            
            const currentPath = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);
            
            console.log('Populating search from URL:', { currentPath, searchParams: searchParams.toString() });
            
            tagManager.clearAll();
            
            let searchQuery = '';
            if (searchParams.has('s')) {
                searchQuery = searchParams.get('s');
            } else if (currentPath.startsWith('/search/')) {
                const pathParts = currentPath.split('/');
                if (pathParts.length >= 3 && pathParts[2] !== 'tags') {
                    searchQuery = decodeURIComponent(pathParts[2]);
                }
            }
            
            if (searchQuery && elements.input) {
                elements.input.value = searchQuery;
                state.lastInputValue = searchQuery;
            }
            
            let tagsToAdd = [];
            
            if (searchParams.has('search_tags')) {
                const tagsParam = searchParams.get('search_tags');
                if (Array.isArray(tagsParam)) {
                    tagsToAdd = tagsParam;
                } else {
                    tagsToAdd = [tagsParam];
                }
            }
            
            if (currentPath.includes('/tags/')) {
                const tagsPart = currentPath.split('/tags/')[1];
                if (tagsPart) {
                    tagsToAdd = tagsPart.split('+').map(tag => 
                        tag.replace(/-/g, ' ').trim()
                    );
                }
            }
            
            const uniqueTags = [];
            const seenTags = new Set();
            
            tagsToAdd.forEach(tag => {
                const normalizedTag = tag.trim();
                const lowerTag = normalizedTag.toLowerCase();
                
                if (normalizedTag && !seenTags.has(lowerTag)) {
                    seenTags.add(lowerTag);
                    uniqueTags.push(normalizedTag);
                }
            });
            
            console.log('Tags to add (after deduplication):', uniqueTags);
            
            uniqueTags.forEach(tagText => {
                const isAlreadyActive = state.activeTags.some(activeTag => 
                    activeTag.toLowerCase() === tagText.toLowerCase()
                );
                
                if (tagText && !isAlreadyActive) {
                    const matchingItem = originalResultsItems.find(item => 
                        item.text.toLowerCase() === tagText.toLowerCase()
                    );
                    
                    const finalTagText = matchingItem ? matchingItem.text : tagText;
                    
                    state.activeTags.push(finalTagText);
                    
                    const tagElement = tagManager.create(finalTagText, matchingItem?.element);
                    
                    if (tagElement && matchingItem?.element) {
                        matchingItem.element.style.display = 'none';
                        matchingItem.element.style.opacity = '0';
                    } else if (!tagElement) {
                        state.activeTags = state.activeTags.filter(tag => tag !== finalTagText);
                        console.log(`Failed to create tag "${finalTagText}" during URL population`);
                    }
                } else {
                    console.log(`Skipping duplicate or empty tag: "${tagText}"`);
                }
            });
            
            uiManager.updateClearButtonVisibility();
            
            setTimeout(() => {
                state.isPopulatingFromURL = false;
            }, 100);
            
            console.log('Populated search from URL:', { searchQuery, tagsAdded: state.activeTags });
        },

        debouncedPopulateFromURL() {
            if (state.isPopulatingFromURL) {
                console.log('Skipping URL population - currently clearing search');
                return;
            }
            
            if (state.populateTimeout) {
                clearTimeout(state.populateTimeout);
            }
            
            state.populateTimeout = setTimeout(() => {
                if (!state.isPopulatingFromURL) {
                    this.populateFromURL();
                } else {
                    console.log('Skipping URL population - still clearing');
                }
                state.populateTimeout = null;
            }, 50);
        }
    };

    // ============================================================================
    // SCROLL MANAGEMENT
    // ============================================================================
    
    const scrollManager = {
        handleUpdate(scrollState) {
            if (!elements.nextButton) return;

            if (scrollState.isMoving) {
                state.isScrolling = true
            } else if (state.isScrolling) {
                state.isScrolling = false
                setTimeout(() => {
                    state.hasMoved = false
                }, 100)
            }

            if (Math.abs(scrollState.dragOffset.x) > 10 && scrollState.isMoving) {
                state.hasMoved = true;
                elements.length.style.pointerEvents = 'none'
            } else {
                elements.length.style.pointerEvents = 'auto'
            }

            const bothBordersColliding = scrollState.borderCollision.right && scrollState.borderCollision.left;
            
            if (bothBordersColliding) {
                elements.nextButton.classList.remove('is-active')
                elements.gradient.classList.remove('is-active')
            } else if (scrollState.borderCollision.left) {
                elements.nextButton.classList.add('is-active')
                elements.gradient.classList.add('is-active')
            } else {
                elements.nextButton.classList.remove('is-active')
                elements.gradient.classList.remove('is-active')
            }
        },

        initScrollBooster() {
            const scrollBooster = new ScrollBooster({
                viewport: qs('.js-scrollboost'),
                content: qs('.js-scrollboost-content'),
                scrollMode: 'transform',
                direction: 'horizontal',
                friction: 0.2,
                bounce: false,
                emulateScroll: true,
                onUpdate: this.handleUpdate,
            });

            if (qs('.js-scrollboost')) {
                qs('.js-scrollboost').scrollBooster = scrollBooster
            }

            return scrollBooster;
        }
    };

    // ============================================================================
    // SEARCH SUGGESTIONS
    // ============================================================================
    
    const suggestionsManager = {
        async updateWithAPI(apiResults, searchValue) {
            console.log('updateSearchSuggestions called with:', { apiResults, searchValue, activeTags: state.activeTags });
            
            elements.allTags.forEach(tag => {
                tag.style.display = 'none';
                tag.classList.remove('api-result');
            });

            elements.allTags.forEach(tag => {
                const tagText = tag.textContent.trim();
                const tagTextLower = tagText.toLowerCase();
                const searchLower = searchValue.toLowerCase();
                
                const isActive = state.activeTags.some(activeTag => 
                    activeTag.toLowerCase() === tagTextLower
                );
                const matchesSearch = tagTextLower.includes(searchLower);
                
                console.log(`Existing tag "${tagText}": isActive=${isActive}, matchesSearch=${matchesSearch}`);
                
                if (matchesSearch && !isActive) {
                    tag.style.display = '';
                    animate(tag, {
                        opacity: 1,
                        y: 0
                    }, {
                        duration: 0.3
                    });
                    console.log(`Showing existing tag: "${tagText}"`);
                } else {
                    console.log(`Hiding existing tag: "${tagText}" (isActive: ${isActive}, matchesSearch: ${matchesSearch})`);
                }
            });

            const filteredApiResults = apiResults.filter(result => {
                const isActive = state.activeTags.some(activeTag => 
                    activeTag.toLowerCase() === result.text.toLowerCase()
                );
                console.log(`API result "${result.text}": isActive=${isActive}`);
                return !isActive;
            });

            console.log('Filtered API results:', filteredApiResults);

            filteredApiResults.forEach(result => {
                const existingTag = Array.from(elements.allTags).find(tag => 
                    tag.textContent.trim().toLowerCase() === result.text.toLowerCase()
                );

                if (!existingTag) {
                    const newSuggestion = this.createTemporary(result);

                    if (newSuggestion) {
                        elements.results.appendChild(newSuggestion);
                        console.log(`Added API suggestion: "${result.text}"`);
                    }
                } else {
                    console.log(`Skipping API result "${result.text}" - already exists as tag`);
                }
            });
        },

        createTemporary(result) {
            const suggestion = document.createElement('div');
            suggestion.className = 'predictive-search-results-item js-tag api-result';
            suggestion.setAttribute('data-type', result.type);
            
            const typeIndicator = result.type === 'tag' ? '🏷️' : 
                                result.type === 'category' ? '📁' : 
                                result.type === 'case-categories' ? '📂' : '';
            
            suggestion.innerHTML = `
                <span class="suggestion-type">${typeIndicator}</span>
                <span class="suggestion-text">${result.text}</span>
                ${result.count ? `<span class="suggestion-count">(${result.count})</span>` : ''}
            `;
            
            suggestion.addEventListener('click', eventHandlers.handleResultItemClick);
            suggestion.setAttribute('data-text', result.text);
            
            return suggestion;
        },

        filterExisting(searchValue) {
            const searchValueLower = searchValue.toLowerCase();
            
            console.log('filterExistingSuggestions called:', { searchValue, activeTags: state.activeTags });
            
            const apiResults = elements.results.querySelectorAll('.api-result');
            apiResults.forEach(result => result.remove());
            
            elements.allTags.forEach(tag => {
                const tagText = tag.textContent.trim();
                const tagTextLower = tagText.toLowerCase();
                
                const isActive = state.activeTags.some(activeTag => 
                    activeTag.toLowerCase() === tagTextLower
                );
                const matchesSearch = searchValue === '' || tagTextLower.includes(searchValueLower);
                
                const shouldShow = matchesSearch && !isActive;
                
                console.log(`Tag "${tagText}": shouldShow=${shouldShow}, isActive=${isActive}, matches=${matchesSearch}, searchValue="${searchValue}"`);
                
                if (shouldShow) {
                    tag.style.display = '';
                    animate(tag, {
                        opacity: 1,
                        y: 0
                    }, {
                        duration: 0.3
                    });
                } else {
                    animate(tag, {
                        opacity: 0,
                        y: -20
                    }, {
                        duration: 0.3,
                        onComplete: () => {
                            tag.style.display = 'none';
                        }
                    });
                }
            });
        }
    };

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================
    
    const eventHandlers = {
        handleResultItemClick(e) {
            if (state.isScrolling && state.hasMoved) {
                return
            }
            
            e.preventDefault()
            e.stopPropagation()

            const resultItem = e.currentTarget
            const tagText = resultItem.textContent.trim()

            if (tagText && !state.activeTags.includes(tagText)) {
                state.activeTags.push(tagText)
                
                const tagElement = tagManager.create(tagText, resultItem)
                
                if (tagElement) {
                    if (resultItem.parentNode) {
                        animate(resultItem, {
                            opacity: 0,
                            y: -20,
                        }, {
                            duration: 0.3,
                        });
                        resultItem.style.display = 'none'
                    }
                    
                    elements.input.value = ''
                    state.lastInputValue = ''
                    state.lastCreatedTag = tagText
                    
                    uiManager.updateClearButtonVisibility();
                    elements.input.focus()

                    if (state.sb) {
                        state.sb.updateMetrics()
                    }
                    
                    console.log(`Tag "${tagText}" added successfully`)
                } else {
                    state.activeTags = state.activeTags.filter(tag => tag !== tagText)
                    console.log(`Failed to create tag "${tagText}", removed from activeTags`)
                }
            } else {
                console.log(`Tag "${tagText}" already exists or is invalid`)
            }
        },

        handleClickOutside(e) {
            if (state.isOpen && elements.header && !elements.header.contains(e.target)) {
                searchManager.close(false)
            }
        },

        async handleInput(e) {
            const searchValue = elements.input.value.trim();
            
            console.log('Input changed:', { 
                searchValue, 
                lastInputValue: state.lastInputValue, 
                inputLength: searchValue.length,
                activeTags: state.activeTags 
            });
            
            state.lastInputValue = searchValue;
            
            setTimeout(() => {
                uiManager.updateClearButtonVisibility();
            }, 0);
            
            if (searchValue.length > 2) {
                try {
                    const response = await fetch(`/wp-json/outten-golden/v1/search?query=${encodeURIComponent(searchValue)}&limit=10`);
                    if (response.ok) {
                        const apiResults = await response.json();
                        console.log('API search results:', apiResults);
                        console.log('Active tags before filtering:', state.activeTags);
                        
                        suggestionsManager.updateWithAPI(apiResults, searchValue);
                    }
                } catch (error) {
                    console.error('Search API error:', error);
                    suggestionsManager.filterExisting(searchValue);
                }
            } else {
                suggestionsManager.filterExisting(searchValue);
            }
        },

        handleKeyboard(e) {
            if (e.key === 'Escape') {
                searchManager.close(false);
                return
            }
            
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                if (!state.isOpen) {
                    searchManager.open();
                } else {
                    searchManager.close(false);
                }
                return;
            }

            // Handle TAB for auto-completion
            if (e.key === 'Tab' && e.target === elements.input) {
                const inputValue = elements.input.value.trim();
                
                if (inputValue.length > 0) {
                    const allSuggestions = [
                        ...Array.from(elements.allTags),
                        ...Array.from(elements.results.querySelectorAll('.api-result'))
                    ];
                    
                    const matchingTag = allSuggestions.find(item => {
                        const itemText = (item.textContent.trim() || item.getAttribute('data-text') || '').toLowerCase();
                        const inputLower = inputValue.toLowerCase();
                        return itemText.startsWith(inputLower) && 
                               itemText !== inputLower &&
                               item.style.display !== 'none';
                    });
                    
                    if (matchingTag) {
                        e.preventDefault();
                        
                        const tagText = matchingTag.textContent.trim() || matchingTag.getAttribute('data-text');
                        console.log(`TAB completion: "${inputValue}" → "${tagText}"`);
                        
                        if (!state.activeTags.includes(tagText)) {
                            state.activeTags.push(tagText);
                            tagManager.create(tagText, matchingTag);
                            
                            if (matchingTag) {
                                animate(matchingTag, {
                                    opacity: 0,
                                    y: -20,
                                }, {
                                    duration: 0.3,
                                });
                                matchingTag.style.display = 'none';
                                
                                if (matchingTag.classList.contains('api-result')) {
                                    setTimeout(() => {
                                        if (matchingTag.parentNode) {
                                            matchingTag.parentNode.removeChild(matchingTag);
                                        }
                                    }, 300);
                                }
                            }
                            
                            elements.input.value = '';
                            state.lastInputValue = '';
                            state.lastCreatedTag = tagText;
                            
                            if (state.sb) {
                                state.sb.updateMetrics();
                            }
                        }
                    }
                }
                return;
            }

            // Handle backspace to remove tags when input is empty
            if (e.key === 'Backspace' && e.target === elements.input) {
                const inputValue = elements.input.value.trim();
                
                if (inputValue === '' && state.activeTags.length > 0) {
                    e.preventDefault();
                    
                    const lastTag = state.activeTags[state.activeTags.length - 1];
                    console.log('Removing last tag via backspace:', lastTag);
                    
                    tagManager.removeAndPutInInput(lastTag);
                }
            }
        },

        handleFormSubmit(e) {
            e.preventDefault()
            e.stopPropagation()
        
            console.log('Active tags before processing:', state.activeTags)
        
            const searchQuery = elements.input.value.trim()
            const baseURL = window.location.origin
            
            let cleanURL = baseURL + '/search'
            
            if (state.activeTags.length > 0) {
                const tagsSlugs = state.activeTags.map(tag => 
                    tag.toLowerCase()
                       .replace(/\s+/g, '-')
                       .replace(/[^a-z0-9\-]/g, '')
                ).join('+')
                
                if (searchQuery) {
                    cleanURL += `/${encodeURIComponent(searchQuery)}/tags/${tagsSlugs}`
                } else {
                    cleanURL += `/tags/${tagsSlugs}`
                }
            } else if (searchQuery) {
                cleanURL += `/${encodeURIComponent(searchQuery)}`
            } else {
                cleanURL = baseURL + '/?s='
            }
            
            console.log('Clean URL:', cleanURL)
            
            initTaxi.navigateTo(cleanURL)
            searchManager.close(true)
        }
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    const initialization = {
        setupEventListeners() {
            // Search link handlers
            const searchLinks = qsa('.js-search-link');
            searchLinks.forEach(searchLink => {
                utils_internal.addTrackedEventListener(searchLink, 'click', (e) => {
                    console.log('Search link clicked, clearing all search...');
                    
                    state.isPopulatingFromURL = true;
                    
                    if (state.populateTimeout) {
                        clearTimeout(state.populateTimeout);
                        state.populateTimeout = null;
                    }
                    
                    searchManager.clearAll();
                    
                    state.activeTags = [];
                    state.lastInputValue = '';
                    state.lastCreatedTag = null;
                    
                    if (elements.input) {
                        elements.input.value = '';
                    }
                    
                    setTimeout(() => {
                        state.isPopulatingFromURL = false;
                    }, 500);
                    
                    console.log('Search cleared and state reset');
                });
            });

            // Reset button
            if (elements.resetButton) {
                utils_internal.addTrackedPressHandler(elements.resetButton, () => {
                    animate(elements.resetButton, { scale: 0.9 });
                    
                    return () => {
                        animate(elements.resetButton, { scale: 1 });
                    };
                });
            }

            // Clear button
            if (elements.clearButton) {
                utils_internal.addTrackedPressHandler(elements.clearButton, () => {
                    return () => {
                        elements.input.value = '';
                        state.lastInputValue = '';
                        tagManager.clearAll();
                        uiManager.showAllTags();
                        elements.input.focus();
                        console.log('Search cleared');
                    };
                });
            }

            // Form click to open
            utils_internal.addTrackedPressHandler(elements.form, () => {
                return () => {
                    if (!state.isOpen) {
                        searchManager.open();
                    }
                };
            });

            // Close button
            utils_internal.addTrackedPressHandler(elements.close, () => {
                animate(elements.close, { scale: 0.9 })
               
                return () => {
                    searchManager.close(false)
                }
            });

            // Related links
            elements.relatedLinks.forEach(link => {
                utils_internal.addTrackedEventListener(link, 'click', (e) => {
                    console.log('Related link clicked, clearing search...');
                    
                    searchManager.close(false);
                    tagManager.clearAll();
                    
                    state.activeTags = [];
                    state.lastInputValue = '';
                    state.lastCreatedTag = null;
                    state.isPopulatingFromURL = false;
                    
                    if (state.populateTimeout) {
                        clearTimeout(state.populateTimeout);
                        state.populateTimeout = null;
                    }
                    
                    if (elements.input) {
                        elements.input.value = '';
                    }
                    
                    console.log('Search cleared for navigation');
                });
            });

            // Global event listeners
            utils_internal.addTrackedEventListener(document.body, 'keydown', eventHandlers.handleKeyboard);
            utils_internal.addTrackedEventListener(document, 'click', eventHandlers.handleClickOutside);
            utils_internal.addTrackedEventListener(elements.form, 'submit', eventHandlers.handleFormSubmit);
            utils_internal.addTrackedEventListener(elements.input, 'input', eventHandlers.handleInput);

            console.log('Event listeners initialized')
        },

        setupResultItems() {
            elements.resultsItems.forEach(item => {
                animate(item, {
                    opacity: 0,
                    y: 40,
                    duration: 0
                });
                
                item.removeEventListener('click', eventHandlers.handleResultItemClick);
                item.addEventListener('click', eventHandlers.handleResultItemClick);
            });
        },

        init() {
            this.setupResultItems();
            state.sb = scrollManager.initScrollBooster();
            this.setupEventListeners();

            if (utils_internal.isOnSearchPage()) {
                urlManager.debouncedPopulateFromURL();
            }
        }
    };

    // ============================================================================
    // CLEANUP
    // ============================================================================
    
    const cleanup = {
        unmount() {
            state.isPopulatingFromURL = false;
            if (state.populateTimeout) {
                clearTimeout(state.populateTimeout);
                state.populateTimeout = null;
            }
            
            state.eventListeners.forEach(({ element, event, handler }) => {
                evt.off(event, element, handler);
            });
            
            state.pressHandlers.forEach(({ element, handler }) => {
                if (typeof handler === 'function' && handler.destroy) {
                    handler.destroy();
                }
            });
            
            state.eventListeners.length = 0;
            state.pressHandlers.length = 0;
            
            elements.resultsItems.forEach(item => {
                item.removeEventListener('click', eventHandlers.handleResultItemClick);
            });
            
            if (state.sb && typeof state.sb.destroy === 'function') {
                state.sb.destroy();
            }
            
            const scrollBoostElement = qs('.js-scrollboost');
            if (scrollBoostElement && scrollBoostElement.scrollBooster) {
                if (typeof scrollBoostElement.scrollBooster.destroy === 'function') {
                    scrollBoostElement.scrollBooster.destroy();
                }
                delete scrollBoostElement.scrollBooster;
            }
            
            if (typeof gsap !== 'undefined' && gsap.killTweensOf) {
                gsap.killTweensOf([
                    elements.hidden, elements.results, elements.resultsItems, 
                    elements.submit, elements.close, elements.nextButton, 
                    elements.resetButton, elements.allTags, elements.clearButton
                ]);
            }
            
            if (elements.header) {
                elements.header.classList.remove('is-active');
            }
            
            document.body.classList.remove('overflow-hidden');
            
            tagManager.clearAll();
            
            if (elements.form) {
                elements.form.reset();
                const dynamicInputs = elements.form.querySelectorAll('input[name="search_tags[]"], input[name="search_type"]');
                dynamicInputs.forEach(input => input.remove());
                searchManager.close()
            }
            
            if (elements.input) {
                elements.input.value = '';
            }
            
            state.activeTags = [];
            state.isScrolling = false;
            state.hasMoved = false;
            state.isOpen = false;
            state.sb = null;
            state.lastInputValue = '';
            state.lastCreatedTag = null;
            
            console.log('Predictive search component unmounted successfully');
        }
    };

    // ============================================================================
    // PUBLIC API
    // ============================================================================
    
    // Initialize the component
    initialization.init();

    // Return public API
    return {
        open: searchManager.open,
        close: searchManager.close,
        addTag: (text) => {
            const matchingItem = originalResultsItems.find(item => item.text === text);
            if (matchingItem && !state.activeTags.includes(text)) {
                tagManager.create(text, matchingItem.element);
            }
        },
        removeTag: (text) => {
            const tags = Array.from(elements.tagContainer.querySelectorAll('.predictive-search-tag span'));
            const targetTag = tags.find(span => span.textContent.trim() === text);
            
            if (targetTag) {
                const tagItem = targetTag.closest('.predictive-search-tag');
                const matchingItem = originalResultsItems.find(item => item.text === text);
                tagManager.remove(text, tagItem, matchingItem?.element);
            }
        },
        clearTags: tagManager.clearAll,
        clearSearch: searchManager.clearAll,
        getActiveTags: () => [...state.activeTags],
        validateState: utils_internal.validateState,
        populateFromURL: urlManager.debouncedPopulateFromURL,
        unmount: cleanup.unmount
    };
}