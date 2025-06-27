import { evt, utils, store } from '@/core'
import { animate } from 'motion'
const { qs, qsa } = utils

export default function bookACall(el) {
    if (!el) return;

    const elements = {
        section: el.section,
        container: el.container
    }

    const trigger = qsa('.js-bookacall-trigger');
    const close = qsa('.js-bookacall-close');
    const elem = qs('.book-a-call');
    const modalContent = qs('.book-a-call .modal-content');

    // State variables
    let currentStep = 1;
    const totalSteps = 3;
    const transitionDuration = 600; // Match CSS transition duration
    
    // DOM elements
    const steps = qsa('[data-step]');
    const nextButtons = qsa('[data-bookacall-step="2"]');
    const prevButtons = qsa('[data-bookacall-step="1"]');
    const submitButton = qs('button[aria-label="Submit"]');

    // Set initial state - show step 1, hide others
    function setInitialState() {
        steps.forEach((step) => {
            const stepNumber = parseInt(step.dataset.step);
            
            if (stepNumber === 1) {
                // Show step 1
                step.classList.remove('opacity-0');
                step.setAttribute('aria-hidden', 'false');
                step.setAttribute('data-step-status', 'active');
            } else {
                // Hide other steps
                step.setAttribute('aria-hidden', 'true');
                step.setAttribute('data-step-status', 'not-active');
            }
        });
    }

    const transitionDelay = 450; // Delay for transition effect (in milliseconds)

    // Function to update the status and accessibility attributes of steps
    const updateStepStatus = (element, shouldBeActive) => {
        // If the step should be active, set it to "active", otherwise "not-active"
        element.setAttribute('data-step-status', shouldBeActive ? 'active' : 'not-active');
        element.setAttribute('aria-hidden', shouldBeActive ? 'false' : 'true');
    };

    // Function to handle step navigation when a step is requested
    const handleStepChange = (targetStep) => {
        const currentStepEl = document.querySelector(`[data-step="${currentStep}"]`);
        const nextStepEl = document.querySelector(`[data-step="${targetStep}"]`);

        if (!currentStepEl || !nextStepEl) return;

        // First, transition out the current step if it's active
        if (currentStepEl.getAttribute('data-step-status') === 'active') {
            currentStepEl.setAttribute('data-step-status', 'transition-out');
            
            // After transition out completes, hide current and show next
            setTimeout(() => {
                // Hide current step
                updateStepStatus(currentStepEl, false);
                
                // Show next step
                updateStepStatus(nextStepEl, true);
            }, transitionDelay);
        } else {
            // If current step isn't active, just show the target step immediately
            updateStepStatus(nextStepEl, true);
        }

        // Update current step tracker
        currentStep = targetStep;
        updateButtonStates();
    };

    // Navigate to specific step using the filter logic
    async function goToStep(stepNumber) {
        if (stepNumber === currentStep) return;

        // If any step is already transitioning, do nothing
        const transitioningStep = document.querySelector('[data-step-status="transition-out"]');
        if (transitioningStep) return;

        // Trigger the step change logic
        handleStepChange(stepNumber);
    }

    // Validate current step
    function validateCurrentStep() {
        const currentStepEl = document.querySelector(`[data-step="${currentStep}"]`);
        
        if (currentStep === 1) {
            // Validate step 1 - required fields
            const firstName = currentStepEl.querySelector('#firstname');
            const lastName = currentStepEl.querySelector('#lastname');
            const email = currentStepEl.querySelector('#email');
            
            const requiredFields = [firstName, lastName, email];
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field || !field.value.trim()) {
                    isValid = false;
                    showFieldError(field);
                } else {
                    clearFieldError(field);
                }
            });
            
            // Validate email format
            if (email && email.value.trim() && !isValidEmail(email.value)) {
                isValid = false;
                showFieldError(email, 'Please enter a valid email address');
            }
            
            return isValid;
        }

        if (currentStep === 2) {
            // Validate step 2 - agreement checkbox
            const agree = currentStepEl.querySelector('#agree');
            let isValid = true;

            if (!agree || !agree.checked) {
                isValid = false;
                showFieldError(agree, 'You must agree to continue');
            } else {
                clearFieldError(agree);
            }
            
            return isValid;
        }
        
        return true;
    }

    // Show field error with Motion.js
    function showFieldError(field, message = 'This field is required') {
        if (!field) return;
        
        // Remove existing error
        clearFieldError(field);
        
        // Add error styling
        field.style.borderColor = '#ef4444';
        
        // Create error message
        const errorEl = document.createElement('span');
        errorEl.className = 'field-error text-12 text-red-500 absolute -bottom-20 left-0';
        errorEl.textContent = message;
        
        //field.parentNode.appendChild(errorEl);
        
        /*
        animate(errorEl, {
            opacity: [0, 1],
            y: [-10, 0]
        }, {
            duration: 0.2,
            easing: [0.25, 0.1, 0.25, 1]
        });
        */
    }

    // Clear field error
    function clearFieldError(field) {
        if (!field) return;
        
        // Reset border color
        field.style.borderColor = '';
        
        // Remove error message
        const errorEl = field.parentNode.querySelector('.field-error');
        if (errorEl) {
            errorEl.remove();
        }
    }

    // Validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Update button states
    function updateButtonStates() {
        console.log(`Current step: ${currentStep}`);
    }

    // Handle form submission
    async function handleSubmit() {
        // Validate final step
        if (!validateCurrentStep()) {
            return;
        }

        // Collect form data
        const formData = collectFormData();
        
        // Add loading state to submit button
        const submitBtn = submitButton;
        const originalText = submitBtn.querySelector('span').textContent;
        
        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Submitting...';
        
        // Simulate form submission
        setTimeout(async () => {
            console.log('Form submitted:', formData);
            
            // Reset button
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = originalText;
            
            // Go to step 3 (thank you page)
            await goToStep(3);
            
        }, 2000);
    }

    // Collect form data
    function collectFormData() {
        const form = document.querySelector('form');
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    // Reset form
    async function resetForm() {
        // Reset form fields
        const form = document.querySelector('form');
        if (form) {
            form.reset();
        }
        
        // Clear all input fields manually
        document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select').forEach(field => {
            field.value = '';
        });
        
        // Clear checkboxes and radio buttons
        document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(field => {
            field.checked = false;
        });
        
        // Go back to step 1
        await goToStep(1);
        
        // Clear any errors
        document.querySelectorAll('.field-error').forEach(error => error.remove());
        document.querySelectorAll('input').forEach(input => input.style.borderColor = '');
    }

    // Go back to step 1 from thank you page
    async function goBackToStart() {
        await resetForm();
    }

    function openBookACall() {
        if (elem.classList.contains('is-active')) { 
            elem.classList.remove('is-active');
            removeModalListeners();
            document.body.classList.remove('overflow-hidden');
        } else {
            elem.classList.add('is-active');
            addModalListeners();
            document.body.classList.add('overflow-hidden');
        }
    }

    async function closeBookACall() {
        elem.classList.remove('is-active');
        removeModalListeners();
        document.body.classList.remove('overflow-hidden');
        // Clear all fields and reset to step 1 when closing
        await resetForm();
    }

    // Handle outside click to close modal
    function handleOutsideClick(e) {
        if (modalContent) {
            if (!modalContent.contains(e.target)) {
                closeBookACall();
            }
        } else {
            if (e.target === elem) {
                closeBookACall();
            }
        }
    }

    // Handle escape key to close modal
    function handleEscapeKey(e) {
        if (e.key === 'Escape') {
            closeBookACall();
        }
    }

    // Add event listeners when modal opens
    function addModalListeners() {
        document.addEventListener('click', handleOutsideClick);
        document.addEventListener('keydown', handleEscapeKey);
    }

    // Remove event listeners when modal closes
    function removeModalListeners() {
        document.removeEventListener('click', handleOutsideClick);
        document.removeEventListener('keydown', handleEscapeKey);
    }

    // Bind event listeners
    function bindEvents() {
        evt.on('click', trigger, openBookACall);
        evt.on('click', close, closeBookACall);
        //evt.on('click', '.gf-calendly-trigger', closeBookACall);

        // Next button (Step 1 -> Step 2)
        nextButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                if (validateCurrentStep()) {
                    await goToStep(2);
                }
            });
        });

        // Previous button (Step 2 -> Step 1)
        prevButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                await goToStep(1);
            });
        });

        // Submit button
        if (submitButton) {
            submitButton.addEventListener('click', (e) => {
                e.preventDefault();
                handleSubmit();
            });
        }
    }

    // Cleanup function to remove event listeners
    function cleanup() {
        removeModalListeners();
    }

    // Initialize everything
    setInitialState();
    bindEvents();

    // Return public methods if needed
    return {
        goToStep,
        resetForm,
        goBackToStart,
        getCurrentStep: () => currentStep,
        cleanup
    };
}