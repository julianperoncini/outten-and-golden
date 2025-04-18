import { Renderer } from '@unseenco/taxi';
import { evt, utils, store } from '@/core';
import { gsap } from 'gsap';

import {
    preloader,
    lazyload,
    split,
    triggered,
    slider,
    lazy,
} from '../components';

const { qs, qsa, rect } = utils;
const { device } = store;

const path = window.location.pathname;
const isHomePage = path === '/';

// Check if user is logged in as wp-admin
const isWpAdmin = document.body.classList.contains('logged-in') || path.includes('/wp-admin');

let isPageReload = false

export default class extends Renderer {
    initialLoad() {
        isPageReload = true;

        this.onEnter();

        window.onload = () => this.load()
    }

    load() {
        if (!isWpAdmin) {
            this.preloader?.loaded()
        }
    }

    onEnter() {
        this.el = this.content;
        triggered(this.el);

        // Initialize component tracking arrays
        this.sliderElements = [];
        this.lazyElements = [];
        this.observers = [];

        // Initialize components
        this.initAllComponents();

        // Run onEnterCompleted
        this.onEnterCompleted();

        evt.emit('scroll:header');
    }

    initAllComponents() {
        // Core components (always initialized)
    }

    onEnterCompleted() { }

    onLeave() {
        isPageReload = false;
    }

    onLeaveCompleted() {
    }
}