import ajaxFilter from './ajaxFilter'

export default function casesAjaxFilter(config) {
    // Parse data attributes if they exist
    const section = config.section || config
    const dataAttrs = section.dataset || {}
    
    // Build configuration with cases-specific defaults
    const filterConfig = {
        section: section,
        ajaxAction: dataAttrs.ajaxAction || 'filter_cases_posts',
        postsContainer: dataAttrs.postsContainer || '.js-cases-posts',
        paginationContainer: dataAttrs.paginationContainer || '.js-cases-pagination',
        filterParam: dataAttrs.filterParam || 'filter',
        defaultFilter: dataAttrs.defaultFilter || 'all',
        defaultPerPage: parseInt(dataAttrs.defaultPerPage) || 6,
        scrollOffset: parseInt(dataAttrs.scrollOffset) || 0,
        eventPrefix: dataAttrs.eventPrefix || 'cases'
    }
    
    // Initialize the generic filter with cases config
    return ajaxFilter(filterConfig)
}