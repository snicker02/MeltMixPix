// js/main.js

// --- Utility Imports ---
import {
    showMessage, updateTilingControlsVisibility, updatePreEffectControlsVisibility, // Added pre-effect visibility update
    updateSourcePreviewTransform, handleDimensionChange, resetState,
    startPan, panMove, endPan, handleSourceZoom, setupSliderListener // Added setupSliderListener
 } from './utils/uiUtils.js';
 // Drawing utils might not be needed directly in main, but core.js uses them
// import * as drawingUtils from './utils/drawingUtils.js';
import { processAndPreviewImage } from './tiling/core.js';

// --- Effect Imports ---
import { applyNoise } from './effects/noise.js';
import { applyScanLines } from './effects/scanLines.js';
import { applyWaveDistortion } from './effects/waveDistortion.js';
import { applyFractalZoom } from './effects/fractalZoom.js';

// --- DOM Element References ---
const elements = {
    // Existing Tiler Elements
    imageLoader: document.getElementById('imageLoader'),
    sourcePreviewContainer: document.getElementById('sourcePreviewContainer'),
    sourcePreview: document.getElementById('sourcePreview'),
    sourcePreviewText: document.getElementById('sourcePreviewText'),
    finalPreviewContainer: document.getElementById('finalPreviewContainer'),
    finalPreview: document.getElementById('finalPreview'),
    finalPreviewText: document.getElementById('finalPreviewText'),
    mirrorCanvas: document.getElementById('mirrorCanvas'),
    preTileCanvas: document.getElementById('preTileCanvas'),
    canvas: document.getElementById('imageCanvas'), // Final output canvas
    sourceEffectCanvas: document.getElementById('sourceEffectCanvas'), // NEW Canvas for effects
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

    // --- NEW Pre-Effect Elements ---
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

    // Group sliders for easier enabling/disabling
    sliders: [ // Combined tiling and effect sliders that need enable/disable
        document.getElementById('tilesX'), document.getElementById('tilesY'),
        document.getElementById('skewFactor'), document.getElementById('staggerOffset'),
        document.getElementById('tileScale'), document.getElementById('preTileX'),
        document.getElementById('preTileY'), document.getElementById('sourceZoom'),
        document.getElementById('preEffectIntensitySlider'), document.getElementById('preEffectWaveAmplitudeSlider'),
        document.getElementById('preEffectWaveFrequencySlider'), document.getElementById('preEffectWavePhaseSlider')
        // Add other effect sliders here if they are added later
    ],
     // Group selects that need enable/disable
     selects: [
        document.getElementById('preEffectSelector'), // Include main selector
        document.getElementById('preEffectWaveDirection'),
        document.getElementById('preEffectWaveType')
        // Add other effect selects here
     ]
};

// --- State Variables ---
const state = {
    currentImage: null,
    originalFileName: 'downloaded-image.png',
    originalWidth: 0,
    originalHeight: 0,
    originalAspectRatio: 1,
    isProcessing: false,
    debounceTimer: null,
    isDragging: false,
    dragStartX: 0, dragStartY: 0,
    currentOffsetX: 0, // Panning offset X
    currentOffsetY: 0, // Panning offset Y
    startOffsetX: 0, // Offset at the start of a drag
    startOffsetY: 0, // Offset at the start of a drag
    sourceZoomLevel: 1.0,
    // Add contexts for hidden canvases to state
    sourceEffectCtx: elements.sourceEffectCanvas?.getContext('2d', { willReadFrequently: true }) // Use willReadFrequently
};

 // --- Effect Function Map ---
 const effectFunctions = {
    'noise': applyNoise,
    'scanLines': applyScanLines,
    'waveDistortion': applyWaveDistortion,
    'fractalZoom': applyFractalZoom,
    'none': null // Explicitly handle 'none'
};

// --- Debounced Processing Function ---
function requestProcessAndPreview() {
    if (state.debounceTimer) clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => {
         // Ensure state is valid before processing
        if (state.currentImage && !state.isProcessing && state.originalWidth > 0 && state.originalHeight > 0 && state.sourceEffectCtx) {
            // --- New Step: Apply Pre-Effect to Source ---
            const sourceCanvasForMirroring = applySourceEffect(); // Get canvas with effect applied
            if (sourceCanvasForMirroring) {
                 // Pass the potentially modified canvas to the tiling core
                 processAndPreviewImage(
                     sourceCanvasForMirroring,
                     elements, state,
                     (msg, isErr) => showMessage(msg, isErr, elements.messageBox)
                 );
            } else {
                 console.error("Failed to get source canvas for mirroring.");
                 showMessage("Error preparing source image.", true, elements.messageBox);
            }
        }
    }, 150); // Debounce delay
}

// --- NEW: Function to Apply Pre-Effect ---
/**
 * Draws the zoomed/panned source region and applies the selected effect.
 * @returns {HTMLCanvasElement | null} The canvas with the effect applied, or null on error.
 */
function applySourceEffect() {
    if (!state.currentImage || !elements.sourceEffectCanvas || !state.sourceEffectCtx || !state.originalWidth || !state.originalHeight) {
         return null;
    }

    const canvas = elements.sourceEffectCanvas;
    const ctx = state.sourceEffectCtx;
    canvas.width = state.originalWidth;
    canvas.height = state.originalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate source rectangle based on pan/zoom (same as mirror logic previously)
    const sourceRectWidth = canvas.width / state.sourceZoomLevel;
    const sourceRectHeight = canvas.height / state.sourceZoomLevel;
    const sourceRectX = Math.abs(state.currentOffsetX / state.sourceZoomLevel);
    const sourceRectY = Math.abs(state.currentOffsetY / state.sourceZoomLevel);

    // Draw the selected source region onto the effect canvas
    try {
        ctx.drawImage(
            state.currentImage,
            sourceRectX, sourceRectY, sourceRectWidth, sourceRectHeight,
            0, 0, canvas.width, canvas.height
        );
    } catch (e) {
        console.error("Error drawing source image for effect:", e);
        showMessage("Error drawing source region.", true, elements.messageBox);
        return null;
    }

    // Apply the selected effect (if not 'none')
    const { effect, params } = getCurrentEffectAndParams(); // Get selected effect info
    const effectFunction = effectFunctions[effect];

    if (effectFunction) {
        console.log(`Applying effect: ${effect} with params:`, params); // Debug log
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Prepare context for effects that need it (like sourceImageData for sampling)
             const effectContext = {
                sourceImageData: new ImageData( // Pass a copy of the drawn source
                    new Uint8ClampedArray(imageData.data),
                    imageData.width,
                    imageData.height
                )
             };
            effectFunction(imageData, params, effectContext); // Apply effect IN PLACE
            ctx.putImageData(imageData, 0, 0); // Put modified data back
        } catch (e) {
             console.error(`Error applying effect '${effect}':`, e);
             showMessage(`Error applying effect: ${e.message || 'Unknown error'}.`, true, elements.messageBox);
             // Continue without effect if it fails? Or return null? Return null for safety.
             return null;
        }
    }
    // If effect is 'none' or successful, return the canvas
    return canvas;
}

// --- NEW: Get Current Effect Parameters ---
function getCurrentEffectAndParams() {
    const effect = elements.preEffectSelector?.value || 'none';
    const params = {
        intensity: parseInt(elements.preEffectIntensitySlider?.value || 50, 10)
    };

    switch (effect) {
        case 'waveDistortion':
            params.amplitude = parseInt(elements.preEffectWaveAmplitudeSlider?.value || 10, 10);
            params.frequency = parseInt(elements.preEffectWaveFrequencySlider?.value || 5, 10);
            params.phase = parseInt(elements.preEffectWavePhaseSlider?.value || 0, 10) * (Math.PI / 180); // Radians
            params.direction = elements.preEffectWaveDirection?.value || 'horizontal';
            params.waveType = elements.preEffectWaveType?.value || 'sine';
            break;
        case 'scanLines':
             // params.thickness = parseInt(elements.scanLinesThicknessSlider?.value || 2, 10); // Example if thickness added
            break;
         // fractalZoom uses intensity only by default
    }
    return { effect, params };
}


// --- Event Handlers ---

function handleSliderChange() {
    // Update displayed values immediately for TILING sliders
    if(elements.tilesXValueSpan && elements.tilesXSlider) elements.tilesXValueSpan.textContent = elements.tilesXSlider.value;
    if(elements.tilesYValueSpan && elements.tilesYSlider) elements.tilesYValueSpan.textContent = elements.tilesYSlider.value;
    if(elements.skewValueSpan && elements.skewSlider) elements.skewValueSpan.textContent = parseFloat(elements.skewSlider.value).toFixed(1);
    if(elements.staggerValueSpan && elements.staggerSlider) elements.staggerValueSpan.textContent = parseFloat(elements.staggerSlider.value).toFixed(2);
    if(elements.scaleValueSpan && elements.scaleSlider) elements.scaleValueSpan.textContent = parseFloat(elements.scaleSlider.value).toFixed(2);
    if(elements.preTileXValueSpan && elements.preTileXSlider) elements.preTileXValueSpan.textContent = elements.preTileXSlider.value;
    if(elements.preTileYValueSpan && elements.preTileYSlider) elements.preTileYValueSpan.textContent = elements.preTileYSlider.value;

    // Update displayed values for EFFECT sliders (handled by setupSliderListener now)

    // Request processing with debounce
    requestProcessAndPreview();
}

function handleOptionChange(event) {
    const target = event.target;
    if (!target) return;

    if (target.name === 'tileShape') {
        // Update tiling controls UI first
        updateTilingControlsVisibility(elements, handleSliderChange); // Pass handleSliderChange for consistency (though it won't be called directly from here)
        requestProcessAndPreview(); // Re-process with new shape
    } else if (target.name === 'mirrorOption') {
        requestProcessAndPreview(); // Re-process with new mirror option
    } else if (target.id === 'preEffectSelector') { // Handle pre-effect dropdown change
         updatePreEffectControlsVisibility(elements); // Update effect controls visibility
         requestProcessAndPreview(); // Re-process with new/no effect
    } else if (target.closest('#preEffectOptionsContainer')) { // Handle changes within effect options (sliders handled separately)
        // This catches changes on selects like wave direction/type
        requestProcessAndPreview();
    }
}

function handleImageLoad(event) {
    // Wrap resetState calls for clarity
    const resetFunc = () => resetState(elements, state,
        () => updateTilingControlsVisibility(elements, handleSliderChange),
        () => updatePreEffectControlsVisibility(elements),
        handleSliderChange
    );

    const file = event.target.files?.[0];
    if (!file) { resetFunc(); showMessage('No file selected.', true, elements.messageBox); return; }
    if (!file.type.startsWith('image/')) { resetFunc(); showMessage('Please select a valid image file.', true, elements.messageBox); return; }

    state.originalFileName = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            state.currentImage = img;
            state.originalWidth = img.naturalWidth;
            state.originalHeight = img.naturalHeight;
            state.originalAspectRatio = state.originalWidth / state.originalHeight;
            if(elements.outputWidthInput) elements.outputWidthInput.value = state.originalWidth;
            if(elements.outputHeightInput) elements.outputHeightInput.value = state.originalHeight;

            if(elements.sourcePreview) {
                 elements.sourcePreview.src = e.target.result;
                 elements.sourcePreview.width = state.originalWidth; // Set dimensions for calculations
                 elements.sourcePreview.height = state.originalHeight;
                 elements.sourcePreview.classList.remove('hidden');
            }
            if(elements.sourcePreviewText) elements.sourcePreviewText.classList.add('hidden');
            if(elements.sourcePreviewContainer) elements.sourcePreviewContainer.style.cursor = 'grab';

            // Reset pan/zoom
            state.currentOffsetX = 0; state.currentOffsetY = 0; state.startOffsetX = 0; state.startOffsetY = 0;
            state.sourceZoomLevel = 1.0;
            if(elements.sourceZoomSlider) elements.sourceZoomSlider.value = 1.0;
            if(elements.sourceZoomValueSpan) elements.sourceZoomValueSpan.textContent = '1.0';
            const { clampedX, clampedY } = updateSourcePreviewTransform(elements, state); // Apply initial transform
            state.currentOffsetX = clampedX; state.currentOffsetY = clampedY;

            // Enable controls
            if(elements.saveButton) elements.saveButton.disabled = false;
            elements.tileShapeOptions?.forEach(opt => opt.disabled = false);
            elements.mirrorOptions?.forEach(opt => opt.disabled = false);
            elements.sliders?.forEach(s => { if(s) s.disabled = false; }); // Combined sliders
            elements.selects?.forEach(s => { if(s) s.disabled = false; }); // Enable selects
            if(elements.outputWidthInput) elements.outputWidthInput.disabled = false;
            if(elements.outputHeightInput) elements.outputHeightInput.disabled = false;
            if(elements.keepAspectRatioCheckbox) elements.keepAspectRatioCheckbox.disabled = false;

            // Update UI visibility for both tiling and effects
            updateTilingControlsVisibility(elements, handleSliderChange);
            updatePreEffectControlsVisibility(elements);
            handleSliderChange(); // Trigger initial value display update for sliders
            requestProcessAndPreview(); // Trigger initial processing
            showMessage('Image loaded. Adjust effects/tiling.', false, elements.messageBox);
        };
        img.onerror = () => { resetFunc(); showMessage('Error loading image data.', true, elements.messageBox); };
        img.src = e.target.result;
    };
    reader.onerror = () => { resetFunc(); showMessage('Error reading file.', true, elements.messageBox); };
    reader.readAsDataURL(file);
    event.target.value = null; // Allow re-selecting same file
}


function saveImage() {
    // ... (Keep existing saveImage function - updated filename logic is already there) ...
    if (!state.currentImage || state.isProcessing) { showMessage('Cannot save now.', true, elements.messageBox); return; }
    if (!elements.canvas || !elements.outputWidthInput || !elements.outputHeightInput) { showMessage('Required elements missing for save.', true, elements.messageBox); return; }
    try {
        const targetWidth = parseInt(elements.outputWidthInput.value, 10);
        const targetHeight = parseInt(elements.outputHeightInput.value, 10);
        if (isNaN(targetWidth) || isNaN(targetHeight) || targetWidth <= 0 || targetHeight <= 0) { showMessage('Invalid output dimensions specified.', true, elements.messageBox); return; }
        const outputCanvas = document.createElement('canvas'); outputCanvas.width = targetWidth; outputCanvas.height = targetHeight;
        const outputCtx = outputCanvas.getContext('2d'); if (!outputCtx) throw new Error("Could not create output canvas context.");
        outputCtx.imageSmoothingQuality = "high";
        outputCtx.drawImage(elements.canvas, 0, 0, elements.canvas.width, elements.canvas.height, 0, 0, targetWidth, targetHeight); // Draw final canvas
        const dataURL = outputCanvas.toDataURL('image/png');
        const link = document.createElement('a'); link.href = dataURL;

        // --- Generate descriptive filename ---
        const selectedShape = document.querySelector('input[name="tileShape"]:checked')?.value || 'grid';
        const mirrorType = document.querySelector('input[name="mirrorOption"]:checked')?.value || 'none';
        const preEffect = elements.preEffectSelector?.value || 'none'; // Get selected effect
        const shapeMap = { grid:'grid',brick_wall:'brick',herringbone:'herring',hexagon:'hex',skewed:'skw',semi_octagon_square:'octsq',l_shape_square:'lsq',hexagon_triangle:'hextri',square_triangle:'sqtri',rhombus:'rho',basketweave:'bask'};
        const shapeStr = shapeMap[selectedShape] || 'unk';
        const mirrorStr = mirrorType !== 'none' ? `_m${mirrorType.substring(0,1)}` : '';
        const preEffectStr = preEffect !== 'none' ? `_fx-${preEffect}` : ''; // Add effect string
        const tileStr = `_t${elements.tilesXSlider?.value}x${elements.tilesYSlider?.value}`;
        const preTileStr = `_p${elements.preTileXSlider?.value}x${elements.preTileYSlider?.value}`;
        const scaleStr = `_sc${elements.scaleSlider?.value}`;
        let shapeParams = ''; if (selectedShape === 'skewed') { shapeParams = `_sk${elements.skewSlider?.value}_st${elements.staggerSlider?.value}`; }
        const baseName = state.originalFileName.substring(0, state.originalFileName.lastIndexOf('.')) || state.originalFileName;
        const extension = state.originalFileName.substring(state.originalFileName.lastIndexOf('.')) || '.png';
        link.download = `${baseName}${preEffectStr}_${shapeStr}${mirrorStr}${tileStr}${preTileStr}${shapeParams}${scaleStr}_${targetWidth}x${targetHeight}${extension}`
            .replace(/_none/g,'').replace(/_fx-none/g,'') // Remove _none for mirror and effect
            .replace(/__/g,'_').replace(/^_|_$/g, ''); // Clean up underscores

        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showMessage('Image saved successfully!', false, elements.messageBox);
    } catch (error) { console.error('Error saving image:', error); showMessage(`Could not save the image: ${error.message}`, true, elements.messageBox); }
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

    // Pre-Effect controls
    elements.preEffectSelector?.addEventListener('change', handleOptionChange);
    // Use setupSliderListener for effect sliders to update their value displays & trigger preview
    setupSliderListener(elements.preEffectIntensitySlider, elements.preEffectIntensityValue, requestProcessAndPreview);
    setupSliderListener(elements.preEffectWaveAmplitudeSlider, elements.preEffectWaveAmplitudeValue, requestProcessAndPreview);
    setupSliderListener(elements.preEffectWaveFrequencySlider, elements.preEffectWaveFrequencyValue, requestProcessAndPreview);
    setupSliderListener(elements.preEffectWavePhaseSlider, elements.preEffectWavePhaseValue, requestProcessAndPreview, val => val + '°');
    elements.preEffectWaveDirection?.addEventListener('change', handleOptionChange); // Also trigger on select change
    elements.preEffectWaveType?.addEventListener('change', handleOptionChange); // Also trigger on select change


    // Source Zoom
    elements.sourceZoomSlider?.addEventListener('input', () => handleSourceZoom(
        elements, state,
        () => updateSourcePreviewTransform(elements, state),
        handleSliderChange // Trigger full update on zoom
    ));

    // Output Dimensions
    elements.outputWidthInput?.addEventListener('input', (e) => handleDimensionChange(e, elements, state));
    elements.outputHeightInput?.addEventListener('input', (e) => handleDimensionChange(e, elements, state));
    elements.keepAspectRatioCheckbox?.addEventListener('change', () => {
        if (elements.keepAspectRatioCheckbox?.checked && state.currentImage) {
            handleDimensionChange({ target: elements.outputWidthInput }, elements, state);
        }
    });

    // Panning listeners
     elements.sourcePreviewContainer?.addEventListener('mousedown', (e) => startPan(e, elements, state));
     document.addEventListener('mousemove', (e) => panMove(
         e, elements, state,
         () => updateSourcePreviewTransform(elements, state),
         handleSliderChange // Trigger update on pan
     ));
     document.addEventListener('mouseup', () => endPan(elements, state));
     elements.sourcePreviewContainer?.addEventListener('mouseleave', () => endPan(elements, state));
}


// --- Initial Application State ---
function initializeApp() {
     // Initial reset needs to know about all update functions
     resetState(
         elements, state,
         () => updateTilingControlsVisibility(elements, handleSliderChange), // Pass tiling visibility updater
         () => updatePreEffectControlsVisibility(elements), // Pass effect visibility updater
         handleSliderChange // Pass slider handler
     );
     setupEventListeners();
     console.log("Image Tiler Initialized with Effects");
}

// Start the application once the DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
