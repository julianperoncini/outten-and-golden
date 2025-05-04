import ScrollBooster from 'scrollbooster';
import { motion, animate, hover, spring, stagger, press } from 'motion';
import { utils } from '@/core';
import { evt } from '@/core';

const { qs, qsa } = utils;

export default function initPredictiveSearch(el) {
    if (!el) return;

    const form = qs('form', el.section)
    const input = qs('input', form)
    const header = qs('header')
    const close = qs('.predictive-search-close', header)
    const hidden = qsa('.predictive-search-hidden', header)
    const results = qs('.predictive-search-results', header)
    const resultsItems = qsa('.predictive-search-results-item', results)
    const tagContainer = qs('.predictive-search-tags', header)
    const submit = qs('.js-predictive-search-submit', form)
    
    const nextButton = qs('.js-scrollboost-next')
    const gradient = qs('.js-scrollboost-gradient')
    const length = qs('.js-scrollboost-length')
    const resetButton = qs('.js-scrollboost-reset')
    
    let activeTags = []
    
    const originalResultsItems = Array.from(resultsItems).map(item => {
        return {
            element: item,
            text: item.textContent.trim()
        };
    });
    
    let isScrolling = false;
    let hasMoved = false;
    let isOpen = false;

    const handleScrollUpdate = (state) => {
        if (!nextButton) return;

        if (state.isMoving) {
            isScrolling = true
        } else if (isScrolling) {
            isScrolling = false
            setTimeout(() => {
                hasMoved = false
            }, 100)
        }

        if (Math.abs(state.dragOffset.x) > 10 && state.isMoving) {
            hasMoved = true;
            length.style.pointerEvents = 'none'
        } else {
            length.style.pointerEvents = 'auto'
        }

        const bothBordersColliding = state.borderCollision.right && state.borderCollision.left;
        
        if (bothBordersColliding) {
            nextButton.classList.remove('is-active')
            gradient.classList.remove('is-active')
        } else if (state.borderCollision.left) {
            nextButton.classList.add('is-active')
            gradient.classList.add('is-active')
        } else {
            nextButton.classList.remove('is-active')
            gradient.classList.remove('is-active')
        }
    }

    const initScrollBooster = () => {
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

        if (qs('.js-scrollboost')) {
            qs('.js-scrollboost').scrollBooster = scrollBooster
        }

        return scrollBooster;
    }

    const createTag = (text, relatedResultItem) => {
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
            removeTag(text, tag, relatedResultItem)

            removeBtn.removeEventListener('click', removeHandler);
        }
        
        evt.on('click', removeBtn, removeHandler)
        
        tag.appendChild(removeBtn)
        tagContainer.appendChild(tag)

        sb.updateMetrics()
        
        return tag
    }

    const removeTag = (text, tagElement, relatedResultItem) => {
        activeTags = activeTags.filter(tag => tag !== text)
        
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

            sb.updateMetrics()
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

                sb.updateMetrics()
            }
        }
        
        input.focus()
    }

    const handleResultItemClick = (e) => {
        if (isScrolling && hasMoved) {
            return
        }
        
        e.preventDefault()
        e.stopPropagation()
        
        const resultItem = e.currentTarget
        const tagText = resultItem.textContent.trim()
        
        if (tagText && !activeTags.includes(tagText)) {
            activeTags.push(tagText)
            
            createTag(tagText, resultItem)
            
            if (resultItem.parentNode) {
                animate(resultItem, {
                    opacity: 0,
                    y: -20,
                }, {
                    duration: 0.3,
                });
                resultItem.style.display = 'none'
            }
            
            input.value = ''
            input.focus()

            sb.updateMetrics()
        }
    }

    const handleClickOutside = (e) => {
        if (isOpen && header && !header.contains(e.target)) {
            closeSearch()
        }
    }

    const openSearch = () => {
        isOpen = true
        header.classList.add('is-active')
        input.focus()
        
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
        })

        animate(submit, { 
            transform: 'translateX(0)'
        }, { 
            ease: 'easeOut'
        })
        
        submit.style.pointerEvents = 'auto'

        if (nextButton) {
            press(nextButton, () => {
                animate(nextButton, { scale: 0.9 })

                return () => {
                    animate(nextButton, { scale: 1 })
                    sb.scrollTo({ x: 250 })
                }
            })
        }
    }

    const closeSearch = () => {
        isOpen = false
        header.classList.remove('is-active')
        animate(close, { scale: 1 })
        animate(hidden, { opacity: 1 })
        animate(results, { height: 0 })
        animate(submit, { transform: 'translateX(101%)' }, { ease: 'easeOut' })

        resultsItems.forEach(item => {
            animate(item, {
                opacity: 0,
                y: 40,
                duration: 0
            })
        })

        submit.style.pointerEvents = 'none'

        clearAllTags()

        sb.scrollTo({ x: 0 })
        sb.setPosition({ x: 0 })
    }
    
    const clearAllTags = () => {
        activeTags = []
        
        if (tagContainer) {
            tagContainer.innerHTML = '';
        }
        
        originalResultsItems.forEach(item => {
            if (item.element) {
                item.element.style.display = '';
            }
        })
    }

    const initEventListeners = () => {
        if (resetButton) {
            press(resetButton, () => {
                animate(resetButton, { scale: 0.9 });
                
                return () => {
                    animate(resetButton, { scale: 1 });
                };
            });
        }

        press(input, () => {
            return () => {
                if (!isOpen) {
                    openSearch();
                }
            };
        });

        press(close, () => {
            animate(close, { scale: 0.9 })
           
            return () => {
                closeSearch()
            }
        })

        // Escape key handler
        evt.on('keydown', document.body, (e) => {
            if (e.key === 'Escape') {
                closeSearch()
            }
        })

        evt.on('click', document, handleClickOutside)

        evt.on('keydown', document.body, (e) => {
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
        })
        
        evt.on('submit', form, (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log('Searching with tags:', activeTags)

            if (input.value.trim()) {
                console.log('Additional search query:', input.value.trim())
            }
        })
    }

    resultsItems.forEach(item => {
        animate(item, {
            opacity: 0,
            y: 40,
            duration: 0
        });
        
        item.removeEventListener('click', handleResultItemClick);
        item.addEventListener('click', handleResultItemClick);
    });

    const sb = initScrollBooster();

    initEventListeners();

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
            const tags = Array.from(tagContainer.querySelectorAll('.predictive-search-tag span'));
            const targetTag = tags.find(span => span.textContent.trim() === text);
            
            if (targetTag) {
                const tagItem = targetTag.closest('.predictive-search-tag');
                const matchingItem = originalResultsItems.find(item => item.text === text);
                removeTag(text, tagItem, matchingItem?.element);
            }
        },
        clearTags: clearAllTags,
        getActiveTags: () => [...activeTags],
        unmount: () => {
            resultsItems.forEach(item => {
                item.removeEventListener('click', handleResultItemClick);
            });
            
        }
    };
}