import ScrollBooster from 'scrollbooster';
import { motion, animate, hover, spring, stagger, press } from 'motion';
import { utils } from '@/core';
import { evt } from '@/core';

const { qs, qsa } = utils;

export default function initPredictiveSearch(el) {
    if (!el) return;

    // DOM Elements
    const form = qs('form', el);
    const input = qs('input', form);
    const header = qs('header');
    const close = qs('.predictive-search-close', header);
    const hidden = qsa('.predictive-search-hidden', header);
    const results = qs('.predictive-search-results', header);
    const resultsItems = qsa('.predictive-search-results-item', results);
    const tagContainer = qs('.predictive-search-tags', header);
    const submit = qs('.js-predictive-search-submit', form);
    
    // ScrollBooster Elements
    const nextButton = qs('.js-scrollboost-next');
    const gradient = qs('.js-scrollboost-gradient');
    const length = qs('.js-scrollboost-length');
    const resetButton = qs('.js-scrollboost-reset');
    
    // Tag collection
    let activeTags = [];
    
    // Store original results items for restoration
    const originalResultsItems = Array.from(resultsItems).map(item => {
        return {
            element: item,
            text: item.textContent.trim()
        };
    });
    
    // Track scrolling state to prevent clicks during scroll
    let isScrolling = false;
    let hasMoved = false;
    let isOpen = false;

    // Initialize Results Items
    resultsItems.forEach(item => {
        animate(item, {
            opacity: 0,
            y: 40,
            duration: 0
        });
        
        // Remove any existing handler to prevent duplicates
        item.removeEventListener('click', handleResultItemClick);
        // Add click handler
        item.addEventListener('click', handleResultItemClick);
    });

    // Initialize ScrollBooster
    const sb = initScrollBooster();

    // Event Listeners
    initEventListeners();

    /**
     * Initialize ScrollBooster functionality
     */
    function initScrollBooster() {
        const scrollBooster = new ScrollBooster({
            viewport: qs('.js-scrollboost'),
            content: qs('.js-scrollboost-content'),
            scrollMode: 'transform',
            direction: 'horizontal',
            friction: 0.2,
            bounce: false,
            emulateScroll: true,
            onUpdate: handleScrollUpdate,
        });

        // Store reference for access in event handlers
        if (qs('.js-scrollboost')) {
            qs('.js-scrollboost').scrollBooster = scrollBooster;
        }

        return scrollBooster;
    }

    /**
     * Handle ScrollBooster updates
     */
    function handleScrollUpdate(state) {
        if (!nextButton) return;

        if (state.isMoving) {
            isScrolling = true;
        } else if (isScrolling) {
            isScrolling = false;
            setTimeout(() => {
                hasMoved = false;
            }, 100); // Small delay to prevent immediate clicks
        }

        if (Math.abs(state.dragOffset.x) > 10 && state.isMoving) {
            hasMoved = true;
            length.style.pointerEvents = 'none';
        } else {
            length.style.pointerEvents = 'auto';
        }

        const bothBordersColliding = state.borderCollision.right && state.borderCollision.left;
        
        if (bothBordersColliding) {
            nextButton.classList.remove('is-active');
            gradient.classList.remove('is-active');
        } else if (state.borderCollision.left) {
            nextButton.classList.add('is-active');
            gradient.classList.add('is-active');
        } else {
            nextButton.classList.remove('is-active');
            gradient.classList.remove('is-active');
        }
    }

    /**
     * Setup all event listeners
     */
    function initEventListeners() {
        // Option 4: Add a reset button if needed
        if (resetButton) {
            press(resetButton, () => {
                animate(resetButton, { scale: 0.9 });
                
                return () => {
                    animate(resetButton, { scale: 1 });
                };
            });
        }

        // Input press handler
        press(input, () => {
            return () => {
                if (!isOpen) {
                    openSearch();
                }
            };
        });

        // Close button press handler
        press(close, () => {
            animate(close, { scale: 0.9 });
           
            return () => {
                closeSearch();
            };
        });

        // Escape key handler
        evt.on('keydown', document.body, (e) => {
            if (e.key === 'Escape') {
                closeSearch();
            }
        });

        evt.on('click', document, handleClickOutside);

        evt.on('keydown', document.body, (e) => {
            // Handle Escape key to close search
            if (e.key === 'Escape') {
                closeSearch();
                return
            }
            
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                if (!isOpen) {
                    openSearch();
                } else {
                    closeSearch();
                }
                return;
            }
        });
        
        evt.on('submit', form, (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Process search with tags
            console.log('Searching with tags:', activeTags);
            if (input.value.trim()) {
                console.log('Additional search query:', input.value.trim());
            }
        });
    }

    /**
     * Handle clicks outside the header to close search
     */
    function handleClickOutside(e) {
        if (isOpen && header && !header.contains(e.target)) {
            closeSearch();
        }
    }
    
    /**
     * Handle clicks on result items to insert tag into search input
     */
    function handleResultItemClick(e) {
        // Only prevent tag creation if we've actually scrolled
        if (isScrolling && hasMoved) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        
        // Get the clicked item and its text
        const resultItem = e.currentTarget;
        const tagText = resultItem.textContent.trim();
        
        // Don't add duplicate tags
        if (tagText && !activeTags.includes(tagText)) {
            // Add to our tags collection
            activeTags.push(tagText);
            
            // Create and display the tag
            createTag(tagText, resultItem);
            
            // Remove the item from results list
            if (resultItem.parentNode) {
                // Hide the item
                animate(resultItem, {
                    opacity: 0,
                    y: -20,
                }, {
                    duration: 0.3,
                });
                resultItem.style.display = 'none';
            }
            
            // Clear the input field
            input.value = '';
            input.focus();

            sb.updateMetrics();
        }
    }
    
    /**
     * Create a visual tag element with remove button
     */
    function createTag(text, relatedResultItem) {
        const tag = document.createElement('div');
        tag.className = 'predictive-search-tag';
        
        const tagText = document.createElement('span');
        tagText.textContent = text;
        tag.appendChild(tagText);
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'predictive-search-tag-remove';
        removeBtn.innerHTML = '&times;';
        
        // Add remove functionality
        evt.on('click', removeBtn, (e) => {
            e.stopPropagation();
            removeTag(text, tag, relatedResultItem);
        });
        
        tag.appendChild(removeBtn);
        tagContainer.appendChild(tag);

        sb.updateMetrics();
        
        return tag;
    }
    
    /**
     * Remove a tag from the collection and UI
     */
    function removeTag(text, tagElement, relatedResultItem) {
        // Remove from collection
        activeTags = activeTags.filter(tag => tag !== text);
        
        // Remove from UI
        if (tagElement && tagElement.parentNode) {
            tagElement.parentNode.removeChild(tagElement);
        }
        
        // Restore the corresponding result item
        if (relatedResultItem) {
            // Show the item
            relatedResultItem.style.display = '';
            animate(relatedResultItem, {
                opacity: 1,
                y: 0,
            }, {
                duration: 0.3
            });

            sb.updateMetrics();
        } else {
            // If no direct reference, find the matching item in original items
            const matchingItem = originalResultsItems.find(item => item.text === text);
            if (matchingItem && matchingItem.element) {
                matchingItem.element.style.display = '';
                animate(matchingItem.element, {
                    opacity: 1,
                    y: 0,
                }, {
                    duration: 0.3
                });

                sb.updateMetrics();
            }
        }
        
        input.focus();
    }

    /**
     * Open search functionality
     */
    function openSearch() {
        isOpen = true;
        header.classList.add('is-active');
        input.focus();
        
        animate(hidden, { opacity: 0 });
        animate(results, { height: 'auto' });
        animate(resultsItems, {
            opacity: 1,
            y: 0
        }, {
            delay: stagger(0.03),
            type: spring,
            bounce: 0.5,
            duration: 1
        });

        animate(submit, { 
            transform: 'translateX(0)'
        }, { 
            ease: 'easeOut'
        });
        
        submit.style.pointerEvents = 'auto';

        // Next button press handler
        if (nextButton) {
            press(nextButton, () => {
                animate(nextButton, { scale: 0.9 });

                return () => {
                    animate(nextButton, { scale: 1 });
                    sb.scrollTo({ x: 250 });
                };
            });
        }
    }

    /**
     * Close search functionality
     */
    function closeSearch() {
        isOpen = false;
        header.classList.remove('is-active');
        animate(close, { scale: 1 });
        animate(hidden, { opacity: 1 });
        animate(results, { height: 0 });
        animate(submit, { transform: 'translateX(101%)' }, { ease: 'easeOut' });

        resultsItems.forEach(item => {
            animate(item, {
                opacity: 0,
                y: 40,
                duration: 0
            });
        });

        submit.style.pointerEvents = 'none';

        // Clear all tags when closing search
        clearAllTags();

        sb.scrollTo({ x: 0 });
        sb.setPosition({ x: 0 });
    }
    
    /**
     * Clear all tags from search
     */
    function clearAllTags() {
        // Clear tag collection
        activeTags = [];
        
        // Clear tag UI
        if (tagContainer) {
            tagContainer.innerHTML = '';
        }
        
        // Restore all result items
        originalResultsItems.forEach(item => {
            if (item.element) {
                item.element.style.display = '';
                // We don't animate them here since they'll be animated when opening the search again
            }
        });
    }
    
    // Return public API
    return {
        open: openSearch,
        close: closeSearch,
        addTag: (text) => {
            const matchingItem = originalResultsItems.find(item => item.text === text);
            if (matchingItem && !activeTags.includes(text)) {
                createTag(text, matchingItem.element);
            }
        },
        removeTag: (text) => {
            const tagEl = tagContainer.querySelector(`.predictive-search-tag span`);
            const tags = Array.from(tagContainer.querySelectorAll('.predictive-search-tag span'));
            const targetTag = tags.find(span => span.textContent.trim() === text);
            
            if (targetTag) {
                const tagItem = targetTag.closest('.predictive-search-tag');
                const matchingItem = originalResultsItems.find(item => item.text === text);
                removeTag(text, tagItem, matchingItem?.element);
            }
        },
        clearTags: clearAllTags,
        getActiveTags: () => [...activeTags]
    };
}