// js/utils/uiUtils.js

// Effects from fractalZoom that might be slow or not suitable for real-time preview *before* tiling
const drawingPreEffects = ['fractalZoom']; // Add others if they prove slow

/**
 * Displays a message to the user, optionally styled as an error.
 * @param {string} message - The message text.
 * @param {boolean} [isError=false] - True to style as an error.
 * @param {HTMLElement} messageBox - The message box element.
 */
export function showMessage(message, isError = false, messageBox) {
   // ... (keep existing showMessage function) ...
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.className = `mt-4 text-center font-medium h-6 ${isError ? 'text-red-600' : 'text-green-600'}`;
    messageBox.classList.remove('hidden');
    setTimeout(() => {
        if (messageBox.textContent === message) {
            messageBox.classList.add('hidden');
            messageBox.textContent = '';
        }
    }, 5000);
}

/**
 * Updates the visibility and labels of TILING controls based on the selected tile shape.
 * @param {object} elements - Object containing references to UI elements.
 * @param {Function} handleSliderChangeFunc - The function to call after updating visibility (to potentially re-process).
 */
export function updateTilingControlsVisibility(elements, handleSliderChangeFunc) {
   // ... (keep existing function, renamed from updateControlsVisibility) ...
    const {
        tileShapeOptions, skewControl, staggerControl, tilesXLabel, tilesYLabel,
        scaleLabel, scaleSlider, scaleValueSpan, tilesXYHelpText
    } = elements;

    // Ensure elements exist before proceeding
    if (!tileShapeOptions || !skewControl || !staggerControl || !tilesXLabel || !tilesYLabel || !scaleLabel || !scaleSlider || !scaleValueSpan || !tilesXYHelpText) {
        console.warn("Missing tiling control elements for visibility update.");
        return;
    }


    const selectedShape = document.querySelector('input[name="tileShape"]:checked')?.value || 'grid';

    skewControl.classList.add('hidden-control');
    staggerControl.classList.add('hidden-control');
    tilesXYHelpText.classList.add('hidden-control');

    let defaultScale = 1.0;
    let scaleLabelText = 'Shape Scale';
    let xLabel = 'Tiles X';
    let yLabel = 'Tiles Y';
    let showHelpText = false;

    switch (selectedShape) {
        // ... cases from previous step ...
        case 'grid':
        case 'brick_wall': scaleLabelText = 'Tile Scale'; break;
        case 'herringbone':
        case 'basketweave': xLabel = 'Planks X'; yLabel = 'Planks Y'; scaleLabelText = 'Plank Scale'; break;
        case 'skewed': skewControl.classList.remove('hidden-control'); staggerControl.classList.remove('hidden-control'); scaleLabelText = 'Overlap Scale'; defaultScale = 1.05; break;
        case 'hexagon': xLabel = 'Approx Tiles X'; yLabel = 'Approx Tiles Y'; scaleLabelText = 'Hexagon Scale'; showHelpText = true; break;
        case 'semi_octagon_square': xLabel = 'Approx Tiles X'; yLabel = 'Approx Tiles Y'; scaleLabelText = 'Shape Scale'; showHelpText = true; break;
        case 'l_shape_square': xLabel = 'Approx Units X'; yLabel = 'Approx Units Y'; scaleLabelText = 'Shape Scale'; showHelpText = true; break;
        case 'hexagon_triangle': xLabel = 'Approx Hex X'; yLabel = 'Approx Hex Y'; scaleLabelText = 'Shape Scale'; showHelpText = true; break;
        case 'square_triangle': xLabel = 'Approx Units X'; yLabel = 'Approx Units Y'; scaleLabelText = 'Shape Scale'; showHelpText = true; break;
        case 'rhombus': xLabel = 'Rhombus Count X'; yLabel = 'Rhombus Count Y'; scaleLabelText = 'Rhombus Scale'; break;
    }

    tilesXLabel.textContent = xLabel;
    tilesYLabel.textContent = yLabel;
    scaleLabel.textContent = scaleLabelText;
    // Only reset scale if the slider exists and value differs
    if (scaleSlider.value !== defaultScale.toString()) {
         scaleSlider.value = defaultScale;
    }
    scaleValueSpan.textContent = defaultScale.toFixed(2);
    tilesXYHelpText.classList.toggle('hidden-control', !showHelpText);

    // Don't trigger update here directly, let the calling context decide when
    // handleSliderChangeFunc(); // Remove this direct call
}

/**
 * Updates visibility of PRE-EFFECT controls based on the selected effect.
 * @param {object} elements - Object containing references to pre-effect UI elements.
 */
export function updatePreEffectControlsVisibility(elements) {
    const {
        preEffectSelector, preEffectOptionsContainer, preEffectIntensityControl,
        preEffectIntensitySlider, preEffectIntensityValue, preEffectWaveDistortionOptions,
        preEffectRealtimeWarning
    } = elements;

    // Ensure necessary elements exist
    if (!preEffectSelector || !preEffectOptionsContainer || !preEffectIntensityControl || !preEffectWaveDistortionOptions || !preEffectRealtimeWarning) {
         console.warn("Missing pre-effect control elements for visibility update.");
         return;
    }

    const selectedEffect = preEffectSelector.value;

    // Hide all specific option groups first
    preEffectOptionsContainer.querySelectorAll('.effect-option-group').forEach(el => el.classList.add('hidden'));
    preEffectRealtimeWarning.classList.add('hidden'); // Hide warning by default

    if (selectedEffect === 'none') {
        // No controls needed for 'none'
    } else if (selectedEffect === 'waveDistortion') {
        preEffectWaveDistortionOptions.classList.remove('hidden');
        preEffectIntensityControl.classList.add('hidden'); // Hide generic intensity for wave
    } else {
        // Show generic intensity slider for effects that use it (noise, scanlines, fractalZoom)
        const usesGenericIntensity = ['noise', 'scanLines', 'fractalZoom'];
        const showIntensity = usesGenericIntensity.includes(selectedEffect);
        preEffectIntensityControl.classList.toggle('hidden', !showIntensity);

        if (showIntensity) {
            // Update generic slider label based on effect
            const intensityLabel = preEffectIntensityControl.querySelector('label'); // Find label within the control
            if (intensityLabel) { // Check if label exists
                if (selectedEffect === 'fractalZoom') {
                    intensityLabel.textContent = 'Intensity/Depth:';
                    // Adjust min/max if needed for fractalZoom specifically
                    // preEffectIntensitySlider.max = 10; // Example: if fractal zoom used different range
                     if(preEffectIntensitySlider) preEffectIntensitySlider.max = 100; // Reset range if needed
                     if(preEffectIntensitySlider) preEffectIntensitySlider.min = 1;
                } else if (selectedEffect === 'scanLines'){
                     intensityLabel.textContent = 'Darkness:'
                     if(preEffectIntensitySlider) preEffectIntensitySlider.max = 100;
                     if(preEffectIntensitySlider) preEffectIntensitySlider.min = 0;
                }
                else { // Default for noise etc.
                    intensityLabel.textContent = 'Intensity:';
                    // Ensure standard range for others
                     if(preEffectIntensitySlider) preEffectIntensitySlider.max = 100;
                     if(preEffectIntensitySlider) preEffectIntensitySlider.min = 1;
                }
            }
            // Ensure slider value is within new bounds if min/max changed
             if(preEffectIntensitySlider) {
                 preEffectIntensitySlider.value = Math.max(parseFloat(preEffectIntensitySlider.min), Math.min(parseFloat(preEffectIntensitySlider.max), parseFloat(preEffectIntensitySlider.value)));
             }
            // Update display value
             if(preEffectIntensityValue && preEffectIntensitySlider) preEffectIntensityValue.textContent = preEffectIntensitySlider.value;
        }

        // Show warning for potentially slow effects
        if (drawingPreEffects.includes(selectedEffect)) {
             preEffectRealtimeWarning.classList.remove('hidden');
        }
    }
}


/**
 * Updates the transform (pan/zoom) of the source preview image.
 * @param {object} elements - UI elements including sourcePreview, sourcePreviewContainer.
 * @param {object} state - Application state including sourceZoomLevel, currentOffsetX, currentOffsetY.
 * @returns {{ clampedX: number, clampedY: number }} The clamped offset values.
 */
export function updateSourcePreviewTransform(elements, state) {
   // ... (keep existing updateSourcePreviewTransform function) ...
    const { sourcePreview, sourcePreviewContainer } = elements;
    let { sourceZoomLevel, currentOffsetX, currentOffsetY } = state;

    if (!sourcePreview || !sourcePreviewContainer || !sourcePreview.width || !sourcePreview.height) {
        if (sourcePreview) sourcePreview.style.transform = 'translate(0px, 0px) scale(1)';
        return { clampedX: 0, clampedY: 0 };
    }

    const previewWidth = sourcePreview.width;
    const previewHeight = sourcePreview.height;
    const containerWidth = sourcePreviewContainer.clientWidth;
    const containerHeight = sourcePreviewContainer.clientHeight;
    const scaledWidth = previewWidth * sourceZoomLevel;
    const scaledHeight = previewHeight * sourceZoomLevel;
    const maxOffsetX = Math.max(0, (containerWidth - scaledWidth) / 2);
    const maxOffsetY = Math.max(0, (containerHeight - scaledHeight) / 2);
    const minOffsetX = containerWidth - scaledWidth - maxOffsetX;
    const minOffsetY = containerHeight - scaledHeight - maxOffsetY;
    const clampedX = Math.max(minOffsetX || 0, Math.min(maxOffsetX, currentOffsetX)); // Add fallback for minOffset if NaN/Infinity
    const clampedY = Math.max(minOffsetY || 0, Math.min(maxOffsetY, currentOffsetY));
    sourcePreview.style.transform = `translate(${clampedX}px, ${clampedY}px) scale(${sourceZoomLevel})`;
    return { clampedX, clampedY };
}

/**
 * Handles changes in the output dimension inputs to maintain aspect ratio.
 * @param {Event} event - The input event.
 * @param {object} elements - UI elements including outputWidthInput, outputHeightInput, keepAspectRatioCheckbox.
 * @param {object} state - Application state including originalAspectRatio, currentImage.
 */
export function handleDimensionChange(event, elements, state) {
    // ... (keep existing handleDimensionChange function) ...
    const { outputWidthInput, outputHeightInput, keepAspectRatioCheckbox } = elements;
    const { currentImage, originalAspectRatio } = state;
    if (!currentImage || !keepAspectRatioCheckbox?.checked || !originalAspectRatio) return;
    const changedInput = event.target;
    if (!changedInput) return;
    const newValue = parseInt(changedInput.value, 10);
    if (isNaN(newValue) || newValue <= 0) return;
    if (changedInput === outputWidthInput && outputHeightInput) {
        outputHeightInput.value = Math.round(newValue / originalAspectRatio);
    } else if (changedInput === outputHeightInput && outputWidthInput) {
        outputWidthInput.value = Math.round(newValue * originalAspectRatio);
    }
}

/**
 * Resets the application state and UI elements to their initial (unloaded) state.
 * @param {object} elements - All relevant UI elements.
 * @param {object} state - The application state object to reset.
 * @param {Function} updateTilingControlsVisibilityFunc - Callback to update tiling controls visibility.
 * @param {Function} updatePreEffectControlsVisibilityFunc - Callback to update pre-effect controls visibility.
 * @param {Function} handleSliderChangeFunc - Callback to handle slider changes (to reset values).
 */
export function resetState(elements, state, updateTilingControlsVisibilityFunc, updatePreEffectControlsVisibilityFunc, handleSliderChangeFunc) {
    const {
        // Destructure all needed elements
        imageLoader, sourcePreview, sourcePreviewText, finalPreview, finalPreviewText,
        saveButton, tileShapeOptions, mirrorOptions, sliders, selects,
        outputWidthInput, outputHeightInput, keepAspectRatioCheckbox, sourceZoomValueSpan,
        canvas, preTileCanvas, mirrorCanvas, sourceEffectCanvas, sourcePreviewContainer,
        // Pre-effect controls
        preEffectSelector, preEffectIntensitySlider, preEffectWaveAmplitudeSlider,
        preEffectWaveFrequencySlider, preEffectWavePhaseSlider, preEffectWaveDirection,
        preEffectWaveType, addEffectButton, clearEffectStackButton, effectStackDisplay
    } = elements;

    // --- Reset UI Elements ---
    if (imageLoader) imageLoader.value = '';
    if (sourcePreview) { sourcePreview.classList.add('hidden'); sourcePreview.src = '#'; sourcePreview.style.transform = 'translate(0px, 0px) scale(1)'; }
    if (sourcePreviewText) { sourcePreviewText.classList.remove('hidden'); sourcePreviewText.textContent = "Load image to pan/zoom source"; }
    if (finalPreview) { finalPreview.classList.add('hidden'); finalPreview.src = '#'; }
    if (finalPreviewText) { finalPreviewText.classList.remove('hidden'); finalPreviewText.textContent = "Preview will appear here"; }
    if(sourcePreviewContainer) sourcePreviewContainer.style.cursor = 'default';
    if (saveButton) saveButton.disabled = true;


    // Disable/Reset Tiling Controls
    tileShapeOptions?.forEach(opt => { opt.disabled = true; if (opt.value === 'grid') opt.checked = true; });
    mirrorOptions?.forEach(opt => { opt.disabled = true; if (opt.value === 'none') opt.checked = true; });
    if (outputWidthInput) { outputWidthInput.disabled = true; outputWidthInput.value = ''; }
    if (outputHeightInput) { outputHeightInput.disabled = true; outputHeightInput.value = ''; }
    if (keepAspectRatioCheckbox) { keepAspectRatioCheckbox.disabled = true; keepAspectRatioCheckbox.checked = true; }
    // Reset Tiling Slider Values & Display (using elements directly for default values)
    if (elements.tilesXSlider) elements.tilesXSlider.value = 1; // Keep 1x1 default
    if (elements.tilesYSlider) elements.tilesYSlider.value = 1; // Keep 1x1 default
    if (elements.skewSlider) elements.skewSlider.value = 0.5;
    if (elements.staggerSlider) elements.staggerSlider.value = 0.5;
    if (elements.scaleSlider) elements.scaleSlider.value = 1.0;
    if (elements.preTileXSlider) elements.preTileXSlider.value = 1; // Keep 1x1 default
    if (elements.preTileYSlider) elements.preTileYSlider.value = 1; // Keep 1x1 default
    if (elements.sourceZoomSlider) elements.sourceZoomSlider.value = 1.0;
    if (sourceZoomValueSpan) sourceZoomValueSpan.textContent = '1.0';


    // --- Disable/Reset Pre-Effect Controls ---
    if (preEffectSelector) { preEffectSelector.disabled = true; preEffectSelector.value = 'none'; }
    if (addEffectButton) addEffectButton.disabled = true; // Disable Add button
    if (clearEffectStackButton) clearEffectStackButton.disabled = true; // Disable Clear button
    if (effectStackDisplay) { // Clear stack display
         effectStackDisplay.innerHTML = '<span class="text-gray-400">No effects added yet.</span>';
    }

    // Disable all sliders and selects (covers both tiling and effect controls)
    sliders?.forEach(el => { if(el) el.disabled = true; });
    selects?.forEach(el => { if(el) el.disabled = true; });

    // Reset pre-effect slider values to defaults
    if (elements.preEffectIntensitySlider) elements.preEffectIntensitySlider.value = 50;
    if (elements.preEffectWaveAmplitudeSlider) elements.preEffectWaveAmplitudeSlider.value = 10;
    if (elements.preEffectWaveFrequencySlider) elements.preEffectWaveFrequencySlider.value = 5;
    if (elements.preEffectWavePhaseSlider) elements.preEffectWavePhaseSlider.value = 0;
    if (elements.preEffectWaveDirection) elements.preEffectWaveDirection.value = 'horizontal';
    if (elements.preEffectWaveType) elements.preEffectWaveType.value = 'sine';


    // Clear Canvases
    [canvas, preTileCanvas, mirrorCanvas, sourceEffectCanvas].forEach(c => { // Added sourceEffectCanvas
        if (c && c.width > 0) {
            try { // Add try-catch for context retrieval
                const ctx = c.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, c.width, c.height);
            } catch(e) {
                console.error("Error clearing canvas:", c.id, e);
            }
        }
    });

    // --- Reset State Variables ---
    state.currentImage = null;
    state.originalWidth = 0; state.originalHeight = 0; state.originalAspectRatio = 1;
    state.originalFileName = 'downloaded-image.png';
    state.isProcessing = false; state.isDragging = false;
    state.currentOffsetX = 0; state.currentOffsetY = 0;
    state.startOffsetX = 0; state.startOffsetY = 0;
    state.sourceZoomLevel = 1.0;
    if(state.debounceTimer) clearTimeout(state.debounceTimer);
    state.debounceTimer = null;
    // --- Clear effect stack in state ---
    state.effectStack = [];


    // Update UI based on reset state
    // Ensure callbacks are functions before calling
    if (typeof updateTilingControlsVisibilityFunc === 'function') {
        updateTilingControlsVisibilityFunc();
    }
    if (typeof updatePreEffectControlsVisibilityFunc === 'function') {
        updatePreEffectControlsVisibilityFunc();
    }
    if (typeof handleSliderChangeFunc === 'function') {
        handleSliderChangeFunc(); // Update slider value displays based on reset values
    } else {
        // Manually update spans if callback is missing (fallback) - Requires element access
        if(elements.tilesXValueSpan && elements.tilesXSlider) elements.tilesXValueSpan.textContent = elements.tilesXSlider.value;
        // ... update other spans similarly ...
        if(elements.preEffectIntensityValue && elements.preEffectIntensitySlider) elements.preEffectIntensityValue.textContent = elements.preEffectIntensitySlider.value;
        // ... etc.
    }
}


// --- Panning Logic ---
/** Starts the panning operation */
export function startPan(event, elements, state) {
   // ... (keep existing startPan function) ...
    if (!state.currentImage || event.button !== 0) return;
    if (event.target === elements.sourcePreview) { event.preventDefault(); }
    state.isDragging = true;
    state.dragStartX = event.pageX; state.dragStartY = event.pageY;
    state.startOffsetX = state.currentOffsetX; state.startOffsetY = state.currentOffsetY;
    if(elements.sourcePreviewContainer) elements.sourcePreviewContainer.style.cursor = 'grabbing';
}

/** Handles mouse movement during panning */
export function panMove(event, elements, state, updateSourcePreviewTransformFunc, handleSliderChangeFunc) {
   // ... (keep existing panMove function) ...
    if (!state.isDragging) return;
    const dx = event.pageX - state.dragStartX;
    const dy = event.pageY - state.dragStartY;
    state.currentOffsetX = state.startOffsetX + dx;
    state.currentOffsetY = state.startOffsetY + dy;
    const { clampedX, clampedY } = updateSourcePreviewTransformFunc();
    state.currentOffsetX = clampedX; state.currentOffsetY = clampedY;
    if (typeof handleSliderChangeFunc === 'function') handleSliderChangeFunc(); // Trigger processing update
}

/** Ends the panning operation */
export function endPan(elements, state) {
   // ... (keep existing endPan function) ...
   if (!state.isDragging) return;
   state.isDragging = false;
   if(elements.sourcePreviewContainer) elements.sourcePreviewContainer.style.cursor = 'grab';
}

/** Handles zoom slider input */
export function handleSourceZoom(elements, state, updateSourcePreviewTransformFunc, handleSliderChangeFunc) {
   // ... (keep existing handleSourceZoom function) ...
    if (!state.currentImage || !elements.sourceZoomSlider) return;
    state.sourceZoomLevel = parseFloat(elements.sourceZoomSlider.value);
    if (elements.sourceZoomValueSpan) elements.sourceZoomValueSpan.textContent = state.sourceZoomLevel.toFixed(1);
    const { clampedX, clampedY } = updateSourcePreviewTransformFunc();
    state.currentOffsetX = clampedX; state.currentOffsetY = clampedY;
    if (typeof handleSliderChangeFunc === 'function') handleSliderChangeFunc(); // Trigger processing update
}

/**
* Sets up an event listener for a slider to update its display value and optionally trigger a callback.
* @param {HTMLInputElement | null} slider - The slider input element.
* @param {HTMLElement | null} valueDisplay - The element to display the slider's value.
* @param {Function} [callback] - Optional function to call when the slider value changes.
* @param {Function} [formatter=val => val] - Optional function to format the displayed value.
*/
export function setupSliderListener(slider, valueDisplay, callback, formatter = val => val) {
    if (!slider || !valueDisplay) {
        // console.warn("setupSliderListener: Slider or ValueDisplay element not found.");
        return; // Basic check
    }
    const update = () => {
        if (valueDisplay) valueDisplay.textContent = formatter(slider.value); // Check again inside closure
        if (typeof callback === 'function') {
            callback();
        }
    };
    slider.addEventListener('input', update);
    update(); // Call once to set initial value display
}
