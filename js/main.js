// Replace the existing handleImageLoad function in js/main.js with this:

function handleImageLoad(event) {
    console.log("handleImageLoad: Function triggered."); // Log 1

    // Wrap resetState calls for clarity
    const resetFunc = () => resetState(elements, state,
        () => updateTilingControlsVisibility(elements, handleSliderChange),
        () => updatePreEffectControlsVisibility(elements),
        handleSliderChange
    );

    const file = event.target.files?.[0];
    if (!file) {
        console.log("handleImageLoad: No file selected."); // Log 2
        resetFunc();
        showMessage('No file selected.', true, elements.messageBox);
        return;
    }
    if (!file.type.startsWith('image/')) {
        console.log("handleImageLoad: Invalid file type selected."); // Log 3
        resetFunc();
        showMessage('Please select a valid image file.', true, elements.messageBox);
        return;
    }

    state.originalFileName = file.name;
    console.log(`handleImageLoad: File selected - ${state.originalFileName}`); // Log 4
    const reader = new FileReader();

    reader.onload = (e) => {
        console.log("handleImageLoad: FileReader onload triggered."); // Log 5
        const img = new Image();

        img.onload = () => {
            console.log("handleImageLoad: Image object onload triggered."); // Log 6
            state.currentImage = img; // <-- Set the image in state
            state.originalWidth = img.naturalWidth;
            state.originalHeight = img.naturalHeight;
            state.originalAspectRatio = state.originalWidth / state.originalHeight;
            console.log(`handleImageLoad: Image dimensions set - ${state.originalWidth}x${state.originalHeight}`); // Log 7
            console.log("handleImageLoad: state.currentImage is now:", state.currentImage); // Log 7.1 Check state

            if(elements.outputWidthInput) elements.outputWidthInput.value = state.originalWidth;
            if(elements.outputHeightInput) elements.outputHeightInput.value = state.originalHeight;

            if(elements.sourcePreview) {
                 elements.sourcePreview.src = e.target.result;
                 elements.sourcePreview.width = state.originalWidth; // Set dimensions for calculations
                 elements.sourcePreview.height = state.originalHeight;
                 elements.sourcePreview.classList.remove('hidden');
                 console.log("handleImageLoad: Source preview updated."); // Log 8
            }
            if(elements.sourcePreviewText) elements.sourcePreviewText.classList.add('hidden');
            if(elements.sourcePreviewContainer) elements.sourcePreviewContainer.style.cursor = 'grab';

            // Reset pan/zoom
            state.currentOffsetX = 0; state.currentOffsetY = 0; state.startOffsetX = 0; state.startOffsetY = 0;
            state.sourceZoomLevel = 1.0;
            if(elements.sourceZoomSlider) elements.sourceZoomSlider.value = 1.0;
            if(elements.sourceZoomValueSpan) elements.sourceZoomValueSpan.textContent = '1.0';
            console.log("handleImageLoad: Pan/Zoom reset."); // Log 9

            const { clampedX, clampedY } = updateSourcePreviewTransform(elements, state); // Apply initial transform
            state.currentOffsetX = clampedX; state.currentOffsetY = clampedY;
            console.log("handleImageLoad: Initial source transform applied."); // Log 10

            // Enable controls
            if(elements.saveButton) elements.saveButton.disabled = false;
            elements.tileShapeOptions?.forEach(opt => opt.disabled = false);
            elements.mirrorOptions?.forEach(opt => opt.disabled = false);
            elements.sliders?.forEach(s => { if(s) s.disabled = false; }); // Combined sliders
            elements.selects?.forEach(s => { if(s) s.disabled = false; }); // Enable selects
            if(elements.outputWidthInput) elements.outputWidthInput.disabled = false;
            if(elements.outputHeightInput) elements.outputHeightInput.disabled = false;
            if(elements.keepAspectRatioCheckbox) elements.keepAspectRatioCheckbox.disabled = false;
            console.log("handleImageLoad: Controls enabled."); // Log 11

            // Update UI visibility for both tiling and effects
            updateTilingControlsVisibility(elements, handleSliderChange);
            updatePreEffectControlsVisibility(elements);
            handleSliderChange(); // Trigger initial value display update for sliders
            console.log("handleImageLoad: Control visibility and sliders updated."); // Log 12

            // --- Clear stack on new image load ---
            state.effectStack = [];
            updateEffectStackDisplay(); // Make sure this function exists and is imported/defined correctly
            console.log("handleImageLoad: Effect stack cleared."); // Log 13

            // --- Enable Add/Clear buttons ---
            if(elements.addEffectButton) elements.addEffectButton.disabled = false;
            if(elements.clearEffectStackButton) elements.clearEffectStackButton.disabled = state.effectStack.length === 0;
            console.log("handleImageLoad: Stack buttons enabled/disabled."); // Log 14


            requestProcessAndPreview(); // Trigger initial processing
            console.log("handleImageLoad: Initial process/preview requested."); // Log 15

            showMessage('Image loaded. Adjust effects/tiling.', false, elements.messageBox);
        };

        img.onerror = () => {
             console.error("handleImageLoad: Image object onerror triggered."); // Log Error 1
             resetFunc();
             showMessage('Error loading image data. Check image file format/integrity.', true, elements.messageBox); // Added more specific message
        };
        console.log("handleImageLoad: Setting Image src."); // Log 16
        img.src = e.target.result; // This triggers img.onload or img.onerror
    };

    reader.onerror = () => {
         console.error("handleImageLoad: FileReader onerror triggered."); // Log Error 2
         resetFunc();
         showMessage('Error reading file.', true, elements.messageBox);
    };
    console.log("handleImageLoad: Reading file as DataURL."); // Log 17
    reader.readAsDataURL(file);
    event.target.value = null; // Allow re-selecting same file
}

// Make sure updateEffectStackDisplay is defined if not imported from uiUtils
// If it's only used here, define it here:
function updateEffectStackDisplay() {
    if (!elements.effectStackDisplay) return;
    elements.effectStackDisplay.innerHTML = '';
    if (state.effectStack.length === 0) {
        elements.effectStackDisplay.innerHTML = '<span class="text-gray-400">No effects added yet.</span>';
    } else {
        state.effectStack.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'text-xs p-1 border-b border-gray-100';
            div.textContent = `${index + 1}: ${item.effect}`;
            elements.effectStackDisplay.appendChild(div);
        });
    }
    if (elements.clearEffectStackButton) {
        elements.clearEffectStackButton.disabled = state.effectStack.length === 0;
    }
}

// Define handleSliderChange if it's not defined elsewhere in main.js (it should be)
// This is just a placeholder if you removed it accidentally
function handleSliderChange() {
    // ... (Update value spans for sliders) ...
    if(elements.tilesXValueSpan && elements.tilesXSlider) elements.tilesXValueSpan.textContent = elements.tilesXSlider.value;
    // ... etc ...
    requestProcessAndPreview(); // Request processing
}
