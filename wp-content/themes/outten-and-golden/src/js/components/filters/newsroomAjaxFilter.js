import ajaxFilter from './ajaxFilter'

export default function newsroomAjaxFilter(config) {
    // Parse data attributes if they exist
    const section = config.section || config
    const dataAttrs = section.dataset || {}
    
    // Build configuration with newsroom-specific defaults
    const filterConfig = {
        section: section,
        ajaxAction: dataAttrs.ajaxAction || 'filter_newsroom_posts',
        postsContainer: dataAttrs.postsContainer || '.js-newsroom-posts',
        paginationContainer: dataAttrs.paginationContainer || '.js-newsroom-pagination',
        filterParam: dataAttrs.filterParam || 'category',
        defaultFilter: dataAttrs.defaultFilter || 'all',
        defaultPerPage: parseInt(dataAttrs.defaultPerPage) || 12,
        scrollOffset: parseInt(dataAttrs.scrollOffset) || -150,
        eventPrefix: dataAttrs.eventPrefix || 'newsroom'
    }
    
    // Initialize the generic filter with newsroom config
    return ajaxFilter(filterConfig)
}