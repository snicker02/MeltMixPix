// js/main.js

// --- Utility Imports ---
import {
    showMessage, updateTilingControlsVisibility, updatePreEffectControlsVisibility,
    updateSourcePreviewTransform, handleDimensionChange, resetState,
    startPan, panMove, endPan, handleSourceZoom, setupSliderListener
 } from './utils/uiUtils.js';
import { processAndPreviewImage } from './tiling/core.js';

// --- Effect Imports ---
import { applyNoise } from './effects/noise.js';
import { applyScanLines } from './effects/scanLines.js';
import { applyWaveDistortion } from './effects/waveDistortion.js';
import { applyFractalZoom } from './effects/fractalZoom.js';

// --- DOM Element References ---
const elements = {
    // Existing Tiler Elements...
    imageLoader: document.getElementById('imageLoader'),
    sourcePreviewContainer: document.getElementById('sourcePreviewContainer'),
    sourcePreview: document.getElementById('sourcePreview'),
    sourcePreviewText: document.getElementById('sourcePreviewText'),
    finalPreviewContainer: document.getElementById('finalPreviewContainer'),
    finalPreview: document.getElementById('finalPreview'),
    finalPreviewText: document.getElementById('finalPreviewText'),
    mirrorCanvas: document.getElementById('mirrorCanvas'),
    preTileCanvas: document.getElementById('preTileCanvas'),
    canvas: document.getElementById('imageCanvas'),
    sourceEffectCanvas: document.getElementById('sourceEffectCanvas'),
    saveButton: document.getElementById('saveButton'),
    messageBox: document.getElementById('messageBox'),
    tileShapeOptions: document.querySelectorAll('input[name="tileShape"]'),
    mirrorOptions: document.querySelectorAll('input[name="mirrorOption"]'),
    tilesXSlider: document.getElementById('tilesX'),
    tilesYSlider: document.getElementById('tilesY'),
    skewSlider: document.getElementById('skewFactor'),
    staggerSlider: document.getElementById('staggerOffset'),
    scaleSlider: document.getElementById('tileScale'),
    preTileXSlider: document.getElementById('preTileX'),
    preTileYSlider: document.getElementById('preTileY'),
    sourceZoomSlider: document.getElementById('sourceZoom'),
    outputWidthInput: document.getElementById('outputWidth'),
    outputHeightInput: document.getElementById('outputHeight'),
    keepAspectRatioCheckbox: document.getElementById('keepAspectRatio'),
    tilesXValueSpan: document.getElementById('tilesXValue'),
    tilesYValueSpan: document.getElementById('tilesYValue'),
    skewValueSpan: document.getElementById('skewValue'),
    staggerValueSpan: document.getElementById('staggerValue'),
    scaleValueSpan: document.getElementById('scaleValue'),
    preTileXValueSpan: document.getElementById('preTileXValue'),
    preTileYValueSpan: document.getElementById('preTileYValue'),
    sourceZoomValueSpan: document.getElementById('sourceZoomValue'),
    skewControl: document.getElementById('skewControl'),
    staggerControl: document.getElementById('staggerControl'),
    tilesXLabel: document.getElementById('tilesXLabel'),
    tilesYLabel: document.getElementById('tilesYLabel'),
    scaleLabel: document.getElementById('scaleLabel'),
    tilesXYHelpText: document.getElementById('tilesXYHelpText'),
    preEffectSelector: document.getElementById('preEffectSelector'),
    preEffectOptionsContainer: document.getElementById('preEffectOptionsContainer'),
    preEffectIntensityControl: document.getElementById('preEffectIntensityControl'),
    preEffectIntensitySlider: document.getElementById('preEffectIntensitySlider'),
    preEffectIntensityValue: document.getElementById('preEffectIntensityValue'),
    preEffectWaveDistortionOptions: document.getElementById('preEffectWaveDistortionOptions'),
    preEffectWaveAmplitudeSlider: document.getElementById('preEffectWaveAmplitudeSlider'),
    preEffectWaveAmplitudeValue: document.getElementById('preEffectWaveAmplitudeValue'),
    preEffectWaveFrequencySlider: document.getElementById('preEffectWaveFrequencySlider'),
    preEffectWaveFrequencyValue: document.getElementById('preEffectWaveFrequencyValue'),
    preEffectWavePhaseSlider: document.getElementById('preEffectWavePhaseSlider'),
    preEffectWavePhaseValue: document.getElementById('preEffectWavePhaseValue'),
    preEffectWaveDirection: document.getElementById('preEffectWaveDirection'),
    preEffectWaveType: document.getElementById('preEffectWaveType'),
    preEffectRealtimeWarning: document.getElementById('preEffectRealtimeWarning'),

    // --- NEW Stacking Elements ---
    addEffectButton: document.getElementById('addEffectButton'),
    effectStackDisplay: document.getElementById('effectStackDisplay'),
    clearEffectStackButton: document.getElementById('clearEffectStackButton'),


    // Group sliders/selects
    sliders: [ /* ... (same as before) ... */ document.getElementById('tilesX'), document.getElementById('tilesY'), document.getElementById('skewFactor'), document.getElementById('staggerOffset'), document.getElementById('tileScale'), document.getElementById('preTileX'), document.getElementById('preTileY'), document.getElementById('sourceZoom'), document.getElementById('preEffectIntensitySlider'), document.getElementById('preEffectWaveAmplitudeSlider'), document.getElementById('preEffectWaveFrequencySlider'), document.getElementById('preEffectWavePhaseSlider')],
    selects: [ /* ... (same as before) ... */ document.getElementById('preEffectSelector'), document.getElementById('preEffectWaveDirection'), document.getElementById('preEffectWaveType')]
};

// --- State Variables ---
const state = {
    currentImage: null,
    originalFileName: 'downloaded-image.png',
    originalWidth: 0, originalHeight: 0, originalAspectRatio: 1,
    isProcessing: false, debounceTimer: null, isDragging: false,
    dragStartX: 0, dragStartY: 0,
    currentOffsetX: 0, currentOffsetY: 0,
    startOffsetX: 0, startOffsetY: 0,
    sourceZoomLevel: 1.0,
    sourceEffectCtx: elements.sourceEffectCanvas?.getContext('2d', { willReadFrequently: true }),
    // --- NEW: Effect Stack ---
    effectStack: [] // Array to hold { effect: 'name', params: {...} } objects
};

 // --- Effect Function Map ---
 const effectFunctions = { /* ... (same as before) ... */ 'noise':applyNoise,'scanLines':applyScanLines,'waveDistortion':applyWaveDistortion,'fractalZoom':applyFractalZoom,'none':null };

// --- Debounced Processing Function ---
function requestProcessAndPreview() {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
        if (state.currentImage && !state.isProcessing && state.originalWidth > 0 && state.originalHeight > 0 && state.sourceEffectCtx) {
            // Apply the *entire* effect stack now
            const sourceCanvasForMirroring = applyStackedSourceEffects(); // Use new function
            if (sourceCanvasForMirroring) {
                 processAndPreviewImage(
                     sourceCanvasForMirroring, elements, state,
                     (msg, isErr) => showMessage(msg, isErr, elements.messageBox)
                 );
            } else { /* ... error handling ... */ }
        }
    }, 150);
}

// --- UPDATED: Function to Apply *Stacked* Pre-Effects ---
/**
 * Draws the zoomed/panned source region and applies the stack of effects sequentially.
 * @returns {HTMLCanvasElement | null} The canvas with all effects applied, or null on error.
 */
function applyStackedSourceEffects() {
    if (!state.currentImage || !elements.sourceEffectCanvas || !state.sourceEffectCtx || !state.originalWidth || !state.originalHeight) {
         return null;
    }

    const canvas = elements.sourceEffectCanvas;
    const ctx = state.sourceEffectCtx;
    canvas.width = state.originalWidth;
    canvas.height = state.originalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw the selected source region onto the effect canvas
    const sourceRectWidth = canvas.width / state.sourceZoomLevel;
    const sourceRectHeight = canvas.height / state.sourceZoomLevel;
    const sourceRectX = Math.abs(state.currentOffsetX / state.sourceZoomLevel);
    const sourceRectY = Math.abs(state.currentOffsetY / state.sourceZoomLevel);
    try {
        ctx.drawImage( state.currentImage, sourceRectX, sourceRectY, sourceRectWidth, sourceRectHeight, 0, 0, canvas.width, canvas.height );
    } catch (e) { /* ... error handling ... */ return null; }

    // 2. Apply effects sequentially from the stack
    if (state.effectStack.length > 0) {
        let currentImageData = null;
        try {
             currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
             console.error("Error getting initial image data for effects stack:", e);
             showMessage("Error preparing image for effects.", true, elements.messageBox);
             return null; // Cannot proceed without image data
        }


        for (const effectItem of state.effectStack) {
            const effectFunction = effectFunctions[effectItem.effect];
            if (effectFunction && currentImageData) {
                console.log(`Applying stacked effect: ${effectItem.effect} with params:`, effectItem.params);
                 try {
                    // Prepare context for effects needing source (pass the result of the *previous* step)
                    const effectContext = {
                         sourceImageData: new ImageData(
                             new Uint8ClampedArray(currentImageData.data),
                             currentImageData.width,
                             currentImageData.height
                         )
                     };
                    // Apply effect IN PLACE on currentImageData
                    effectFunction(currentImageData, effectItem.params, effectContext);
                 } catch (e) {
                    console.error(`Error applying stacked effect '${effectItem.effect}':`, e);
                    showMessage(`Error in effect '${effectItem.effect}'. Skipping subsequent effects.`, true, elements.messageBox);
                    // Decide whether to stop or continue? Stop seems safer.
                    currentImageData = null; // Mark as failed
                    break; // Exit the loop
                 }
            }
        }

        // 3. Put the final result (after all effects) back onto the canvas
        if (currentImageData) {
            ctx.putImageData(currentImageData, 0, 0);
        } else {
             // If an effect failed, the canvas still holds the state *before* the failed effect.
             // Might be confusing, maybe clear it? Or return null? Let's return null.
             console.error("Effect stack application failed.");
             return null;
        }
    }
    // Return the canvas (with original source or stacked effects applied)
    return canvas;
}


// Get Current Effect Parameters (Reads from UI, doesn't know about stack)
function getCurrentEffectAndParams() {
     // ... (Keep existing getCurrentEffectAndParams function - needed for adding to stack) ...
    const effect = elements.preEffectSelector?.value || 'none';
    const params = { intensity: parseInt(elements.preEffectIntensitySlider?.value || 50, 10) };
    switch (effect) {
        case 'waveDistortion': params.amplitude = parseInt(elements.preEffectWaveAmplitudeSlider?.value || 10, 10); params.frequency = parseInt(elements.preEffectWaveFrequencySlider?.value || 5, 10); params.phase = parseInt(elements.preEffectWavePhaseSlider?.value || 0, 10) * (Math.PI / 180); params.direction = elements.preEffectWaveDirection?.value || 'horizontal'; params.waveType = elements.preEffectWaveType?.value || 'sine'; break;
        case 'scanLines': /* params.thickness = ... */ break;
    } return { effect, params };
}

// --- NEW: Update Stack Display ---
function updateEffectStackDisplay() {
    if (!elements.effectStackDisplay) return;
    elements.effectStackDisplay.innerHTML = ''; // Clear existing display
    if (state.effectStack.length === 0) {
        elements.effectStackDisplay.innerHTML = '<span class="text-gray-400">No effects added yet.</span>';
    } else {
        state.effectStack.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'text-xs p-1 border-b border-gray-100';
            // Simple display: index + effect name
            // Could potentially show parameters too later
            div.textContent = `${index + 1}: ${item.effect}`;
            elements.effectStackDisplay.appendChild(div);
        });
    }
    // Enable/disable clear button
    if (elements.clearEffectStackButton) {
        elements.clearEffectStackButton.disabled = state.effectStack.length === 0;
    }
}

// --- Event Handlers ---

function handleSliderChange() {
    // ... (Keep existing slider value updates) ...
    if(elements.tilesXValueSpan && elements.tilesXSlider) elements.tilesXValueSpan.textContent = elements.tilesXSlider.value;
    if(elements.tilesYValueSpan && elements.tilesYSlider) elements.tilesYValueSpan.textContent = elements.tilesYSlider.value;
    if(elements.skewValueSpan && elements.skewSlider) elements.skewValueSpan.textContent = parseFloat(elements.skewSlider.value).toFixed(1);
    if(elements.staggerValueSpan && elements.staggerSlider) elements.staggerValueSpan.textContent = parseFloat(elements.staggerSlider.value).toFixed(2);
    if(elements.scaleValueSpan && elements.scaleSlider) elements.scaleValueSpan.textContent = parseFloat(elements.scaleSlider.value).toFixed(2);
    if(elements.preTileXValueSpan && elements.preTileXSlider) elements.preTileXValueSpan.textContent = elements.preTileXSlider.value;
    if(elements.preTileYValueSpan && elements.preTileYSlider) elements.preTileYValueSpan.textContent = elements.preTileYSlider.value;

    // When ANY slider changes (tiling or effect param), request a preview update
    requestProcessAndPreview();
}

function handleOptionChange(event) {
    // ... (Keep existing option change logic) ...
    const target = event.target; if (!target) return;
    if (target.name === 'tileShape') { updateTilingControlsVisibility(elements, handleSliderChange); requestProcessAndPreview(); }
    else if (target.name === 'mirrorOption') { requestProcessAndPreview(); }
    else if (target.id === 'preEffectSelector') { updatePreEffectControlsVisibility(elements); requestProcessAndPreview(); } // Update visibility but *don't* process yet, let user adjust params
    else if (target.closest('#preEffectOptionsContainer')) { requestProcessAndPreview(); } // Process if effect selects change
}

function handleImageLoad(event) {
    // Reset function needs to be updated for stack
     const resetFunc = () => resetState(elements, state,
         () => updateTilingControlsVisibility(elements, handleSliderChange),
         () => updatePreEffectControlsVisibility(elements),
         handleSliderChange
     );
     // ... (Keep image loading logic, but ensure resetFunc is called correctly) ...
     // After successful load and enabling controls:
     // ...
     updateTilingControlsVisibility(elements, handleSliderChange);
     updatePreEffectControlsVisibility(elements);
     handleSliderChange(); // Update initial display values
     // --- Clear stack on new image load ---
     state.effectStack = [];
     updateEffectStackDisplay();
     // --- Enable Add/Clear buttons ---
     if(elements.addEffectButton) elements.addEffectButton.disabled = false;
     if(elements.clearEffectStackButton) elements.clearEffectStackButton.disabled = state.effectStack.length === 0;

     requestProcessAndPreview(); // Trigger initial processing
     showMessage('Image loaded. Add effects or adjust tiling.', false, elements.messageBox); // Updated message
     // ... rest of load/error handling ...
}

// --- NEW Event Handlers for Stack ---
function handleAddEffect() {
    const { effect, params } = getCurrentEffectAndParams();
    if (effect === 'none') {
        showMessage("Select an effect first before adding.", true, elements.messageBox);
        return;
    }
    // Add a *copy* of the params object
    state.effectStack.push({ effect: effect, params: { ...params } });
    console.log("Added to stack:", state.effectStack);
    updateEffectStackDisplay();
    requestProcessAndPreview(); // Update preview with new stack
}

function handleClearStack() {
    state.effectStack = [];
    updateEffectStackDisplay();
    requestProcessAndPreview(); // Update preview with empty stack
}

function saveImage() {
     // ... (Keep existing saveImage function - filename logic needs update) ...
      if (!state.currentImage || state.isProcessing) { /* ... */ }
      // ... (canvas creation, drawing final image) ...
      try {
         // ... (canvas creation, drawing final image) ...
        const targetWidth = parseInt(elements.outputWidthInput.value, 10);
        const targetHeight = parseInt(elements.outputHeightInput.value, 10);
        // ... (validation) ...
        const outputCanvas = document.createElement('canvas'); /* ... */
        const outputCtx = outputCanvas.getContext('2d'); /* ... */
        outputCtx.drawImage(elements.canvas, 0, 0, elements.canvas.width, elements.canvas.height, 0, 0, targetWidth, targetHeight);
        const dataURL = outputCanvas.toDataURL('image/png');
        const link = document.createElement('a'); link.href = dataURL;

        // --- Generate descriptive filename ---
        const selectedShape = document.querySelector('input[name="tileShape"]:checked')?.value || 'grid';
        const mirrorType = document.querySelector('input[name="mirrorOption"]:checked')?.value || 'none';
        // Generate stack string
        const stackStr = state.effectStack.map(item => item.effect.substring(0, 3)).join('-') || 'none'; // e.g., noi-wav-fra
        const shapeMap = { /* ... map ... */ grid:'grid',brick_wall:'brick',herringbone:'herring',hexagon:'hex',skewed:'skw',semi_octagon_square:'octsq',l_shape_square:'lsq',hexagon_triangle:'hextri',square_triangle:'sqtri',rhombus:'rho',basketweave:'bask'};
        const shapeStr = shapeMap[selectedShape] || 'unk';
        const mirrorStr = mirrorType !== 'none' ? `_m${mirrorType.substring(0,1)}` : '';
        const preEffectStr = stackStr !== 'none' ? `_fx-${stackStr}` : ''; // Use stack string
        const tileStr = `_t${elements.tilesXSlider?.value}x${elements.tilesYSlider?.value}`;
        const preTileStr = `_p${elements.preTileXSlider?.value}x${elements.preTileYSlider?.value}`;
        const scaleStr = `_sc${elements.scaleSlider?.value}`;
        let shapeParams = ''; if (selectedShape === 'skewed') { shapeParams = `_sk${elements.skewSlider?.value}_st${elements.staggerSlider?.value}`; }
        const baseName = state.originalFileName.substring(0, state.originalFileName.lastIndexOf('.')) || state.originalFileName;
        const extension = state.originalFileName.substring(state.originalFileName.lastIndexOf('.')) || '.png';
        link.download = `${baseName}${preEffectStr}_${shapeStr}${mirrorStr}${tileStr}${preTileStr}${shapeParams}${scaleStr}_${targetWidth}x${targetHeight}${extension}`
            .replace(/_none/g,'').replace(/_fx-none/g,'')
            .replace(/__/g,'_').replace(/^_|_$/g, '');

        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showMessage('Image saved successfully!', false, elements.messageBox);
     } catch (error) { /* ... error handling ... */ }
}


// --- Event Listeners Setup ---
function setupEventListeners() {
    elements.imageLoader?.addEventListener('change', handleImageLoad);
    elements.saveButton?.addEventListener('click', saveImage);

    // Tiling controls
    elements.tileShapeOptions?.forEach(opt => opt.addEventListener('change', handleOptionChange));
    elements.mirrorOptions?.forEach(opt => opt.addEventListener('change', handleOptionChange));
    const tilingSliders = [ elements.tilesXSlider, elements.tilesYSlider, elements.skewSlider, elements.staggerSlider, elements.scaleSlider, elements.preTileXSlider, elements.preTileYSlider ];
    tilingSliders.forEach(slider => { if(slider) slider.addEventListener('input', handleSliderChange); });

    // Pre-Effect selection controls
    elements.preEffectSelector?.addEventListener('change', handleOptionChange); // Updates visibility, no processing yet
    // Use setupSliderListener for effect sliders - *only* updates display, processing happens via Add button or other changes
    setupSliderListener(elements.preEffectIntensitySlider, elements.preEffectIntensityValue, requestProcessAndPreview); // Update preview on slider change
    setupSliderListener(elements.preEffectWaveAmplitudeSlider, elements.preEffectWaveAmplitudeValue, requestProcessAndPreview);
    setupSliderListener(elements.preEffectWaveFrequencySlider, elements.preEffectWaveFrequencyValue, requestProcessAndPreview);
    setupSliderListener(elements.preEffectWavePhaseSlider, elements.preEffectWavePhaseValue, requestProcessAndPreview, val => val + '°');
    elements.preEffectWaveDirection?.addEventListener('change', handleOptionChange); // Also trigger preview on select change
    elements.preEffectWaveType?.addEventListener('change', handleOptionChange); // Also trigger preview on select change

    // --- NEW Stack Buttons ---
    elements.addEffectButton?.addEventListener('click', handleAddEffect);
    elements.clearEffectStackButton?.addEventListener('click', handleClearStack);


    // Source Zoom
    elements.sourceZoomSlider?.addEventListener('input', () => handleSourceZoom(
        elements, state,
        () => updateSourcePreviewTransform(elements, state),
        handleSliderChange // Trigger full update on zoom
    ));

    // Output Dimensions
    elements.outputWidthInput?.addEventListener('input', (e) => handleDimensionChange(e, elements, state));
    elements.outputHeightInput?.addEventListener('input', (e) => handleDimensionChange(e, elements, state));
    elements.keepAspectRatioCheckbox?.addEventListener('change', () => { /* ... */ });

    // Panning listeners
     elements.sourcePreviewContainer?.addEventListener('mousedown', (e) => startPan(e, elements, state));
       document.addEventListener('mousemove', (e) => {
    // --- ADD THIS CHECK ---
    if (!state) {
         console.error("mousemove listener triggered, but state is undefined!");
         return; // Stop execution if state is missing
    }
    // If state exists, proceed to call panMove
    panMove(
         e, elements, state,
         () => updateSourcePreviewTransform(elements, state),
         handleSliderChange
    );
 });
     document.addEventListener('mouseup', () => endPan(elements, state));
     elements.sourcePreviewContainer?.addEventListener('mouseleave', () => endPan(elements, state));
}


// --- Initial Application State ---
function initializeApp() {
     // Initial reset needs to know about all update functions
     resetState(
         elements, state,
         () => updateTilingControlsVisibility(elements, handleSliderChange),
         () => updatePreEffectControlsVisibility(elements),
         handleSliderChange
     );
     setupEventListeners();
     updateEffectStackDisplay(); // Initial stack display
     console.log("Image Tiler Initialized with Stacking Effects");
}

// Start the application once the DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
