// --- Constants ---
const MAX_ZOOM = 5.0;
const MIN_ZOOM = 0.1;
const ZOOM_STEP = 0.2;

// Effects that don't support real-time preview (require manual apply)
export const drawingEffects = ['fractalZoom'];

/**
 * Resets the entire UI state, optionally based on whether an image is loaded.
 * @param {boolean} isLoaded - Whether an image is currently loaded.
 * @param {object} elements - Object containing references to key DOM elements.
 * @param {object} state - Object containing the current application state (e.g., currentFileName, imageCanvas).
 * @param {Function} clearHistory - Function to clear the undo/redo history.
 * @param {Function} pushHistoryState - Function to push the initial state to history.
 * @param {Function} updateUndoRedoButtons - Function to update undo/redo button states.
 * @param {Function} resetZoomFunc - Function to reset the canvas zoom.
 */
export function resetUI(isLoaded, elements, state, clearHistory, pushHistoryState, updateUndoRedoButtons, resetZoomFunc) {
    const {
        fileNameDisplay, controlsDiv, zoomControlsDiv, imageCanvas, canvasPlaceholder,
        saveWidthInput, saveHeightInput, keepAspectRatioCheckbox, effectSelector,
        intensitySlider, intensityValue, waveAmplitudeSlider, waveAmplitudeValue,
        waveFrequencySlider, waveFrequencyValue, wavePhaseSlider, wavePhaseValue,
        waveDirection, waveType
    } = elements;

    fileNameDisplay.textContent = isLoaded ? `Selected: ${state.currentFileName}` : 'No image selected';
    controlsDiv.classList.toggle('hidden', !isLoaded);
    zoomControlsDiv.classList.toggle('hidden', !isLoaded);

    // Enable/disable all controls within the main controls div and zoom controls
    const allControls = controlsDiv.querySelectorAll('button, select, input');
    allControls.forEach(el => el.disabled = !isLoaded);
    zoomControlsDiv.querySelectorAll('button').forEach(el => el.disabled = !isLoaded);

    if (isLoaded) {
        imageCanvas.classList.remove('hidden');
        canvasPlaceholder.classList.add('hidden');
        saveWidthInput.value = state.imageCanvas.width;
        saveHeightInput.value = state.imageCanvas.height;
        state.currentImageAspectRatio = state.imageCanvas.width / state.imageCanvas.height;

        resetZoomFunc(); // Reset zoom via the passed function
        clearHistory(); // Clear history via the passed function
        if (state.originalImageData) {
            pushHistoryState(state.originalImageData); // Push initial state via the passed function
        }
        updateVisibleControls(elements, state); // Update effect controls visibility

    } else {
        imageCanvas.classList.add('hidden');
        canvasPlaceholder.classList.remove('hidden');
        canvasPlaceholder.textContent = 'Image will appear here';
        if (state.imageCanvas.width > 0 && state.imageCanvas.height > 0 && state.ctx) {
            state.ctx.clearRect(0, 0, state.imageCanvas.width, state.imageCanvas.height);
        }
        state.currentImage = null;
        state.originalImageData = null;
        state.lastAppliedImageData = null; // Renamed from currentImageData for clarity
        saveWidthInput.value = '';
        saveHeightInput.value = '';
        keepAspectRatioCheckbox.checked = false;
        state.currentImageAspectRatio = 1;

        resetZoomFunc();
        clearHistory();
        effectSelector.value = 'noise'; // Default to a simple effect
        updateVisibleControls(elements, state); // Update effect controls visibility

        // Reset specific effect controls to defaults when no image is loaded
        waveAmplitudeSlider.value = 10; waveAmplitudeValue.textContent = '10';
        waveFrequencySlider.value = 5; waveFrequencyValue.textContent = '5';
        wavePhaseSlider.value = 0; wavePhaseValue.textContent = '0°';
        waveDirection.value = 'horizontal';
        waveType.value = 'sine';
        intensitySlider.value = 50; intensityValue.textContent = '50';
    }
    updateUndoRedoButtons(); // Update undo/redo buttons status via the passed function
}


/**
 * Updates visibility of effect-specific option groups based on the selected effect.
 * @param {object} elements - Object containing references to key DOM elements.
 * @param {object} state - Object containing the current application state (e.g., effectSelector value).
 */
export function updateVisibleControls(elements, state) {
    const {
        effectSelector, effectOptionsContainer, intensityControl, intensitySlider,
        intensityValue, waveDistortionOptions, realtimeWarning
    } = elements;

    const selectedEffect = effectSelector.value;

    // Hide all specific option groups first
    effectOptionsContainer.querySelectorAll('.effect-option-group').forEach(el => el.classList.add('hidden'));

    // Show the relevant group
    if (selectedEffect === 'waveDistortion') {
        waveDistortionOptions.classList.remove('hidden');
        intensityControl.classList.add('hidden'); // Hide generic slider for this effect
    } else {
        // Show generic intensity slider for effects that use it
        const usesGenericIntensity = ['noise', 'scanLines', 'fractalZoom'];
        intensityControl.classList.toggle('hidden', !usesGenericIntensity.includes(selectedEffect));

        // Update generic slider label and potentially range/max based on effect
        const intensityLabel = intensityControl.querySelector('label');
        if (selectedEffect === 'fractalZoom') {
            intensityLabel.textContent = 'Intensity/Depth:';
            intensitySlider.max = 100; // Or adjust as needed
            intensitySlider.min = 1;   // Ensure min is appropriate
        } else if (selectedEffect === 'scanLines') {
             intensityLabel.textContent = 'Darkness:';
             intensitySlider.max = 100;
             intensitySlider.min = 0;
        }
         else { // Default for noise etc.
            intensityLabel.textContent = 'Intensity:';
            intensitySlider.max = 100;
             intensitySlider.min = 1;
        }
        // Ensure slider value is within new bounds if min/max changed
        intensitySlider.value = Math.max(intensitySlider.min, Math.min(intensitySlider.max, intensitySlider.value));
        intensityValue.textContent = intensitySlider.value; // Update display
    }

    // Show/hide real-time warning
    realtimeWarning.classList.toggle('hidden', !drawingEffects.includes(selectedEffect) || !state.originalImageData);
}

/**
 * Handles changes in width/height inputs to maintain aspect ratio if checked.
 * @param {'width' | 'height'} changedInput - Which input was changed.
 * @param {object} elements - Object containing references to saveWidthInput, saveHeightInput, keepAspectRatioCheckbox.
 * @param {object} state - Object containing currentImageAspectRatio.
 */
export function handleDimensionChange(changedInput, elements, state) {
    const { saveWidthInput, saveHeightInput, keepAspectRatioCheckbox } = elements;
    if (!keepAspectRatioCheckbox.checked || !state.currentImageAspectRatio || state.currentImageAspectRatio === 0) {
        return;
    }

    const widthVal = parseInt(saveWidthInput.value, 10);
    const heightVal = parseInt(saveHeightInput.value, 10);

    if (changedInput === 'width' && !isNaN(widthVal) && widthVal > 0) {
        saveHeightInput.value = Math.round(widthVal / state.currentImageAspectRatio);
    } else if (changedInput === 'height' && !isNaN(heightVal) && heightVal > 0) {
        saveWidthInput.value = Math.round(heightVal * state.currentImageAspectRatio);
    }
}

/**
 * Applies the current zoom level to the canvas style.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {number} currentZoomLevel - The current zoom factor.
 * @param {object} elements - References to zoom buttons.
 */
export function applyZoom(canvas, currentZoomLevel, elements) {
    const { zoomOutButton, zoomInButton, zoomResetButton } = elements;
    if (canvas) {
        canvas.style.transform = `scale(${currentZoomLevel})`;
    }
    // Update button states
    zoomOutButton.disabled = currentZoomLevel <= MIN_ZOOM;
    zoomInButton.disabled = currentZoomLevel >= MAX_ZOOM;
    zoomResetButton.disabled = currentZoomLevel === 1.0;
}

/**
 * Resets the zoom level to 1.0 and applies it.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {object} state - The application state object to update currentZoomLevel.
 * @param {object} elements - References to zoom buttons.
 * @returns {number} The new zoom level (1.0).
 */
export function resetZoom(canvas, state, elements) {
    state.currentZoomLevel = 1.0;
    applyZoom(canvas, state.currentZoomLevel, elements);
    return state.currentZoomLevel;
}

/**
 * Increases the zoom level.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {object} state - The application state object to update currentZoomLevel.
 * @param {object} elements - References to zoom buttons.
 * @returns {number} The new zoom level.
 */
export function zoomIn(canvas, state, elements) {
    state.currentZoomLevel = Math.min(MAX_ZOOM, state.currentZoomLevel + ZOOM_STEP);
    applyZoom(canvas, state.currentZoomLevel, elements);
    return state.currentZoomLevel;
}

/**
 * Decreases the zoom level.
 * @param {HTMLCanvasElement} canvas - The canvas element.
 * @param {object} state - The application state object to update currentZoomLevel.
 * @param {object} elements - References to zoom buttons.
 * @returns {number} The new zoom level.
 */
export function zoomOut(canvas, state, elements) {
    state.currentZoomLevel = Math.max(MIN_ZOOM, state.currentZoomLevel - ZOOM_STEP);
    applyZoom(canvas, state.currentZoomLevel, elements);
    return state.currentZoomLevel;
}

/**
 * Sets up an event listener for a slider to update its display value and optionally trigger a callback.
 * @param {HTMLInputElement} slider - The slider input element.
 * @param {HTMLElement} valueDisplay - The element to display the slider's value.
 * @param {Function} [callback] - Optional function to call when the slider value changes.
 * @param {Function} [formatter=val => val] - Optional function to format the displayed value.
 */
export function setupSliderListener(slider, valueDisplay, callback, formatter = val => val) {
    const update = () => {
        valueDisplay.textContent = formatter(slider.value);
        if (callback) {
            callback();
        }
    };
    slider.addEventListener('input', update);
    // Initial formatting
    update(); // Call once to set initial value display
}