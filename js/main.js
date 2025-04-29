// --- Utility Imports ---
import { getCanvasAndContext, loadImageOntoCanvas, getCanvasImageData, createSaveCanvas } from './utils/canvasUtils.js';
import { resetUI, updateVisibleControls, handleDimensionChange, applyZoom, resetZoom, zoomIn, zoomOut, setupSliderListener, drawingEffects } from './utils/uiUtils.js';
import { updateUndoRedoButtons, clearHistory, pushHistoryState, undo, redo } from './utils/historyUtils.js';

// --- Effect Imports ---
import { applyNoise } from './effects/noise.js';
import { applyScanLines } from './effects/scanLines.js';
import { applyWaveDistortion } from './effects/waveDistortion.js';
import { applyFractalZoom } from './effects/fractalZoom.js';

// --- DOM Element References ---
// Group elements for easier passing to utils
const elements = {
    imageLoader: document.getElementById('imageLoader'),
    imageCanvas: document.getElementById('imageCanvas'),
    canvasPlaceholder: document.getElementById('canvasPlaceholder'),
    canvasContainer: document.getElementById('canvasContainer'),
    fileNameDisplay: document.getElementById('fileName'),
    controlsDiv: document.getElementById('controls'),
    effectSelector: document.getElementById('effectSelector'),
    effectOptionsContainer: document.getElementById('effectOptionsContainer'),
    realtimeWarning: document.getElementById('realtimeWarning'),
    saveWidthInput: document.getElementById('saveWidth'),
    saveHeightInput: document.getElementById('saveHeight'),
    keepAspectRatioCheckbox: document.getElementById('keepAspectRatio'),
    zoomControlsDiv: document.getElementById('zoomControls'),
    zoomOutButton: document.getElementById('zoomOutButton'),
    zoomResetButton: document.getElementById('zoomResetButton'),
    zoomInButton: document.getElementById('zoomInButton'),
    applyEffectButton: document.getElementById('applyEffectButton'),
    resetButton: document.getElementById('resetButton'),
    saveButton: document.getElementById('saveButton'),
    undoButton: document.getElementById('undoButton'),
    redoButton: document.getElementById('redoButton'),
    // Effect Option Elements
    intensityControl: document.getElementById('intensityControl'),
    intensitySlider: document.getElementById('intensitySlider'),
    intensityValue: document.getElementById('intensityValue'),
    waveDistortionOptions: document.getElementById('waveDistortionOptions'),
    waveAmplitudeSlider: document.getElementById('waveAmplitudeSlider'),
    waveAmplitudeValue: document.getElementById('waveAmplitudeValue'),
    waveFrequencySlider: document.getElementById('waveFrequencySlider'),
    waveFrequencyValue: document.getElementById('waveFrequencyValue'),
    wavePhaseSlider: document.getElementById('wavePhaseSlider'),
    wavePhaseValue: document.getElementById('wavePhaseValue'),
    waveDirection: document.getElementById('waveDirection'),
    waveType: document.getElementById('waveType'),
};

// --- State Variables ---
// Group state for easier management
const state = {
    ctx: null,
    originalImageData: null,        // The initially loaded image data
    lastAppliedImageData: null,     // The image data *after* the last 'Apply' click (or initial load)
    currentImage: null,             // The HTML Image element
    currentImageAspectRatio: 1,
    currentFileName: 'image.png',
    isRealtimeUpdatePending: false,
    currentZoomLevel: 1.0,
    history: [],
    historyIndex: -1,
    // Add canvas reference to state for easier access in utils
    imageCanvas: elements.imageCanvas,
};

// --- Effect Function Map ---
// Map effect selector values to their corresponding functions
const effectFunctions = {
    'noise': applyNoise,
    'scanLines': applyScanLines,
    'waveDistortion': applyWaveDistortion,
    'fractalZoom': applyFractalZoom
};

// --- Initialization ---
function initialize() {
    const canvasData = getCanvasAndContext('imageCanvas');
    if (!canvasData) {
        alert("Failed to initialize canvas. Please ensure the canvas element exists.");
        return;
    }
    state.ctx = canvasData.ctx;
    state.imageCanvas = canvasData.canvas; // Ensure state holds the correct canvas ref

    setupEventListeners();
    // Initial UI reset (no image loaded yet)
    resetUI(false, elements, state,
        () => clearHistory(state, updateUndoRedoButtonsWrapper, elements), // Pass wrapped functions
        (imgData) => pushHistoryState(imgData, state, updateUndoRedoButtonsWrapper, elements),
        updateUndoRedoButtonsWrapper,
        resetZoomWrapper
    );
     updateVisibleControls(elements, state); // Set initial control visibility
}

// --- Helper Function Wrappers for Passing to Utils ---
// These wrappers ensure the correct arguments (elements, state) are passed to the history/UI utils
function updateUndoRedoButtonsWrapper() {
    updateUndoRedoButtons(elements, state);
}
function resetZoomWrapper() {
    state.currentZoomLevel = resetZoom(state.imageCanvas, state, elements);
}


// --- Core Logic Functions ---

function resetImageToOriginal() {
    if (state.originalImageData && state.ctx) {
        state.ctx.putImageData(state.originalImageData, 0, 0);
        // Reset lastAppliedImageData to a fresh copy of the original
        state.lastAppliedImageData = new ImageData(
            new Uint8ClampedArray(state.originalImageData.data),
            state.originalImageData.width,
            state.originalImageData.height
        );
        // Reset history
        clearHistory(state, updateUndoRedoButtonsWrapper, elements);
        pushHistoryState(state.originalImageData, state, updateUndoRedoButtonsWrapper, elements); // Push original state back
        console.log("Image reset to original.");
    } else {
        alert("No original image data found to reset to.");
    }
}

/** Returns the currently selected effect and its parameters */
function getCurrentEffectAndParams() {
    const effect = elements.effectSelector.value;
    const params = {
        // Generic intensity/depth is always read
        intensity: parseInt(elements.intensitySlider.value, 10)
    };

    // Add effect-specific parameters
    switch (effect) {
        case 'waveDistortion':
            params.amplitude = parseInt(elements.waveAmplitudeSlider.value, 10);
            params.frequency = parseInt(elements.waveFrequencySlider.value, 10);
            // Convert degrees to radians for phase
            params.phase = parseInt(elements.wavePhaseSlider.value, 10) * (Math.PI / 180);
            params.direction = elements.waveDirection.value;
            params.waveType = elements.waveType.value;
            break;
        // Add cases for other effects if they have unique parameters beyond intensity
        // case 'scanLines':
        //     // Example if scanLines had more options:
        //     // params.direction = elements.scanLinesDirection.value;
        //     // params.thickness = parseInt(elements.scanLinesThickness.value, 10);
        //     break;
    }
    return { effect, params };
}

/** Applies the selected effect logic */
function applyEffectLogic(imageData, effect, params) {
    const effectFunction = effectFunctions[effect];
    if (effectFunction) {
        // Pass the necessary context (like the source data for sampling effects)
        const context = {
             // Pass a *copy* of the last committed state as the source for effects like wave/zoom
            sourceImageData: state.lastAppliedImageData ? new ImageData(
                new Uint8ClampedArray(state.lastAppliedImageData.data),
                state.lastAppliedImageData.width,
                state.lastAppliedImageData.height
            ) : null,
            // Add other context if needed by effects: ctx, width, height, etc.
            // ctx: state.ctx,
            // width: imageData.width,
            // height: imageData.height
        };
        effectFunction(imageData, params, context);
    } else {
        console.warn(`Effect function for "${effect}" not found.`);
    }
}

// --- Real-time Update Logic ---
function requestRealtimeUpdate() {
    // Only proceed if an image is loaded and the effect supports real-time
    if (!state.originalImageData || drawingEffects.includes(elements.effectSelector.value)) {
        return;
    }
    // If an update isn't already pending, schedule one
    if (!state.isRealtimeUpdatePending) {
        state.isRealtimeUpdatePending = true;
        requestAnimationFrame(handleRealtimeUpdate);
    }
}

function handleRealtimeUpdate() {
    state.isRealtimeUpdatePending = false;
    if (!state.lastAppliedImageData || !state.ctx) return; // Need the last committed state to preview from

    // Create a copy of the *last applied* state to apply the preview effect onto
    const previewImageData = new ImageData(
        new Uint8ClampedArray(state.lastAppliedImageData.data),
        state.lastAppliedImageData.width,
        state.lastAppliedImageData.height
    );

    const { effect, params } = getCurrentEffectAndParams();
    applyEffectLogic(previewImageData, effect, params); // Apply effect to the copy

    state.ctx.putImageData(previewImageData, 0, 0); // Draw the preview
}

// --- Event Listener Setup ---
function setupEventListeners() {
    // Image Loading
    elements.imageLoader.addEventListener('change', handleImageLoad);

    // Effect Selection
    elements.effectSelector.addEventListener('change', handleEffectSelection);

    // Sliders and Dropdowns (Real-time updates)
    setupSliderListener(elements.intensitySlider, elements.intensityValue, requestRealtimeUpdate);
    setupSliderListener(elements.waveAmplitudeSlider, elements.waveAmplitudeValue, requestRealtimeUpdate);
    setupSliderListener(elements.waveFrequencySlider, elements.waveFrequencyValue, requestRealtimeUpdate);
    setupSliderListener(elements.wavePhaseSlider, elements.wavePhaseValue, requestRealtimeUpdate, val => val + '°');
    elements.waveDirection.addEventListener('change', requestRealtimeUpdate);
    elements.waveType.addEventListener('change', requestRealtimeUpdate);

    // Dimension Inputs & Aspect Ratio
    elements.saveWidthInput.addEventListener('input', () => handleDimensionChange('width', elements, state));
    elements.saveHeightInput.addEventListener('input', () => handleDimensionChange('height', elements, state));

    // Zoom Buttons
    elements.zoomInButton.addEventListener('click', () => state.currentZoomLevel = zoomIn(state.imageCanvas, state, elements));
    elements.zoomOutButton.addEventListener('click', () => state.currentZoomLevel = zoomOut(state.imageCanvas, state, elements));
    elements.zoomResetButton.addEventListener('click', resetZoomWrapper);

    // Action Buttons
    elements.applyEffectButton.addEventListener('click', handleApplyEffect);
    elements.resetButton.addEventListener('click', resetImageToOriginal);
    elements.saveButton.addEventListener('click', handleSaveImage);
    elements.undoButton.addEventListener('click', () => undo(state, updateUndoRedoButtonsWrapper, elements));
    elements.redoButton.addEventListener('click', () => redo(state, updateUndoRedoButtonsWrapper, elements));
}

// --- Event Handlers ---
async function handleImageLoad(event) {
    const files = event.target.files;
    if (files && files[0] && state.imageCanvas && state.ctx) {
        const file = files[0];
        state.currentFileName = file.name;
        try {
            // Load image onto canvas using utility function
            state.currentImage = await loadImageOntoCanvas(file, state.imageCanvas, state.ctx);
            // Get initial image data *after* drawing
            state.originalImageData = getCanvasImageData(state.ctx, state.imageCanvas);

            if (state.originalImageData) {
                // Set lastAppliedImageData to a copy of the original initially
                state.lastAppliedImageData = new ImageData(
                    new Uint8ClampedArray(state.originalImageData.data),
                    state.originalImageData.width,
                    state.originalImageData.height
                );
                // Reset UI for loaded state
                 resetUI(true, elements, state,
                    () => clearHistory(state, updateUndoRedoButtonsWrapper, elements),
                    (imgData) => pushHistoryState(imgData, state, updateUndoRedoButtonsWrapper, elements),
                    updateUndoRedoButtonsWrapper,
                    resetZoomWrapper
                 );
            } else {
                // Handle case where getting image data failed (e.g., CORS)
                resetUI(false, elements, state,
                    () => clearHistory(state, updateUndoRedoButtonsWrapper, elements),
                    (imgData) => pushHistoryState(imgData, state, updateUndoRedoButtonsWrapper, elements),
                    updateUndoRedoButtonsWrapper,
                    resetZoomWrapper
                ); // Reset UI to unloaded state
            }
        } catch (error) {
            console.error("Error loading image:", error);
            alert(`Could not load image: ${error.message}`);
             resetUI(false, elements, state,
                () => clearHistory(state, updateUndoRedoButtonsWrapper, elements),
                (imgData) => pushHistoryState(imgData, state, updateUndoRedoButtonsWrapper, elements),
                updateUndoRedoButtonsWrapper,
                resetZoomWrapper
             );
        }
    } else {
        // No file selected or canvas context issue
         resetUI(false, elements, state,
            () => clearHistory(state, updateUndoRedoButtonsWrapper, elements),
            (imgData) => pushHistoryState(imgData, state, updateUndoRedoButtonsWrapper, elements),
            updateUndoRedoButtonsWrapper,
            resetZoomWrapper
         );
    }
    // Clear the file input value so the 'change' event fires even if the same file is selected again
    event.target.value = null;
}

function handleEffectSelection() {
    updateVisibleControls(elements, state);

    // Re-evaluate if the intensity slider should trigger real-time updates
    // (Remove old listener and add new one based on current effect's real-time status)
    const newCallback = drawingEffects.includes(elements.effectSelector.value) ? null : requestRealtimeUpdate;
    // Need a way to remove the old listener before adding a new one, or structure setupSliderListener differently.
    // For simplicity now, we assume setupSliderListener adds, might lead to multiple listeners.
    // A better approach would involve storing/removing listeners.
    // setupSliderListener(elements.intensitySlider, elements.intensityValue, newCallback); // Re-setup intensity


    // If switching TO a drawing effect, reset the canvas view to the last *applied* state
    if (drawingEffects.includes(elements.effectSelector.value)) {
        if (state.lastAppliedImageData && state.ctx) {
            state.ctx.putImageData(state.lastAppliedImageData, 0, 0);
        }
    } else {
        // If switching TO a real-time effect, trigger an update
        requestRealtimeUpdate();
    }
}

function handleApplyEffect() {
    if (!state.originalImageData || !state.lastAppliedImageData || !state.ctx) {
        alert("Load an image and ensure it's processed correctly before applying effects.");
        return;
    }

    const { effect, params } = getCurrentEffectAndParams();

    // Create a fresh copy of the *last applied* state to modify
    let imageDataToModify = new ImageData(
        new Uint8ClampedArray(state.lastAppliedImageData.data),
        state.lastAppliedImageData.width,
        state.lastAppliedImageData.height
    );

    // If it's a drawing effect, ensure the canvas shows the base image before applying
    // (applyEffectLogic for drawing effects might draw directly or return modified data)
    if (drawingEffects.includes(effect)) {
         state.ctx.putImageData(state.lastAppliedImageData, 0, 0);
    }

    // Apply the effect logic to the copy
    applyEffectLogic(imageDataToModify, effect, params);

    // Put the final modified data onto the canvas *after* the effect is done
    // This ensures drawing effects also update the canvas correctly if they modify imageDataToModify directly
    state.ctx.putImageData(imageDataToModify, 0, 0);

    // Update the lastAppliedImageData state with the newly modified data
    // Important: Create a new ImageData object for the history and state
     const finalImageData = getCanvasImageData(state.ctx, state.imageCanvas); // Read back from canvas to be sure
     if (finalImageData) {
        state.lastAppliedImageData = finalImageData;
        // Push the *newly applied* state to history
        pushHistoryState(state.lastAppliedImageData, state, updateUndoRedoButtonsWrapper, elements);
        console.log(`Effect "${effect}" applied permanently.`);
     } else {
         console.error("Could not read final image data after applying effect.");
         alert("Failed to finalize the applied effect. Resetting image.");
         resetImageToOriginal(); // Attempt to recover
     }
}

function handleSaveImage() {
     if (!state.currentImage || !state.lastAppliedImageData || !state.imageCanvas) {
        alert("No image loaded or processed to save.");
        return;
    }

    let saveWidth = parseInt(elements.saveWidthInput.value, 10);
    let saveHeight = parseInt(elements.saveHeightInput.value, 10);

    // Validate dimensions, default to current canvas size if invalid
    if (isNaN(saveWidth) || saveWidth <= 0) {
        saveWidth = state.imageCanvas.width;
        console.warn("Invalid save width, using current canvas width.");
        elements.saveWidthInput.value = saveWidth;
    }
    if (isNaN(saveHeight) || saveHeight <= 0) {
        saveHeight = state.imageCanvas.height;
        console.warn("Invalid save height, using current canvas height.");
        elements.saveHeightInput.value = saveHeight;
    }

    // Use utility to create a temporary canvas for saving potentially resized image
    const tempCanvas = createSaveCanvas(state.imageCanvas, saveWidth, saveHeight);

    if (!tempCanvas) {
        alert("Could not create image for saving.");
        return;
    }

    // Create download link
    const link = document.createElement('a');
    const baseName = state.currentFileName.substring(0, state.currentFileName.lastIndexOf('.')) || 'download';
    link.download = `${baseName}-${elements.effectSelector.value}-${saveWidth}x${saveHeight}.png`; // Include effect name

    try {
        link.href = tempCanvas.toDataURL('image/png'); // Get data URL from temp canvas
        link.click(); // Simulate click to trigger download
        link.remove(); // Clean up the link element
    } catch (error) {
        console.error("Error saving image:", error);
        alert("Could not save the image. This might be due to canvas security restrictions (if using external images without CORS) or size limitations.");
    }
}


// --- Start the application ---
document.addEventListener('DOMContentLoaded', initialize);