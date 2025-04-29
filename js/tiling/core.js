// js/tiling/core.js (Reverted Version - Accepts prepared source canvas)
import {
    drawHexagonPath, drawOctagonPath, drawSquarePath,
    drawLTrominoPath, drawTrianglePath, drawRhombusPath
} from '../utils/drawingUtils.js';

/**
 * Core function to process the image: mirror, pre-tile, and apply selected tiling.
 * @param {HTMLCanvasElement} sourceCanvasForMirroring - The canvas containing the source image (potentially after pre-effects).
 * @param {object} elements - UI elements including canvases, previews, sliders.
 * @param {object} state - Application state including original dimensions etc.
 * @param {Function} showMessageFunc - Function to display messages.
 */
export function processAndPreviewImage(sourceCanvasForMirroring, elements, state, showMessageFunc) {
    // --- Get necessary elements and state ---
    const {
        mirrorCanvas, preTileCanvas, canvas, finalPreview, finalPreviewText,
        scaleSlider, preTileXSlider, preTileYSlider, tilesXSlider, tilesYSlider,
        skewSlider, staggerSlider
    } = elements;

    if (!sourceCanvasForMirroring || state.isProcessing) return;
    state.isProcessing = true;

    // --- Get Contexts ---
    const mirrorCtx = mirrorCanvas?.getContext('2d');
    const preTileCtx = preTileCanvas?.getContext('2d');
    const ctx = canvas?.getContext('2d'); // Final output canvas context

    if (!mirrorCtx || !preTileCtx || !ctx) { /* ... error handling ... */ }

    // --- Read Controls (Tiling Parameters) ---
    const scaleFactor = parseFloat(scaleSlider?.value || 1.0);
    const preTileGridX = parseInt(preTileXSlider?.value || 1, 10); // Default 1
    const preTileGridY = parseInt(preTileYSlider?.value || 1, 10); // Default 1
    const mirrorType = document.querySelector('input[name="mirrorOption"]:checked')?.value || 'none';
    const selectedShape = document.querySelector('input[name="tileShape"]:checked')?.value || 'grid';
    const numTilesX = parseInt(tilesXSlider?.value || 1, 10); // Default 1
    const numTilesY = parseInt(tilesYSlider?.value || 1, 10); // Default 1
    const skewMagnitude = parseFloat(skewSlider?.value || 0.5);
    const staggerFactor = parseFloat(staggerSlider?.value || 0.5);

    // --- Step 0: Create Mirrored Image ---
    if (!state.originalWidth || !state.originalHeight) { /* ... error handling ... */ }
    mirrorCanvas.width = state.originalWidth; mirrorCanvas.height = state.originalHeight;
    mirrorCtx.clearRect(0, 0, mirrorCanvas.width, mirrorCanvas.height);
    mirrorCtx.save();
    let scaleMx = 1, scaleMy = 1, transMx = 0, transMy = 0;
    if (mirrorType === 'horizontal' || mirrorType === 'both') { scaleMx = -1; transMx = mirrorCanvas.width; }
    if (mirrorType === 'vertical' || mirrorType === 'both') { scaleMy = -1; transMy = mirrorCanvas.height; }
    if (transMx !== 0 || transMy !== 0) mirrorCtx.translate(transMx, transMy);
    if (scaleMx !== 1 || scaleMy !== 1) mirrorCtx.scale(scaleMx, scaleMy);
    try {
        mirrorCtx.drawImage( sourceCanvasForMirroring, 0, 0, mirrorCanvas.width, mirrorCanvas.height );
    } catch (e) { /* ... error handling ... */ }
    mirrorCtx.restore();

    // --- Step 1: Create Pre-Tiled Image ---
    preTileCanvas.width = state.originalWidth; preTileCanvas.height = state.originalHeight;
    preTileCtx.clearRect(0, 0, preTileCanvas.width, preTileCanvas.height);
    const safePreTileGridX = Math.max(1, preTileGridX); const safePreTileGridY = Math.max(1, preTileGridY);
    const preTileW = preTileCanvas.width / safePreTileGridX; const preTileH = preTileCanvas.height / safePreTileGridY;
    for (let py = 0; py < safePreTileGridY; py++) {
        for (let px = 0; px < safePreTileGridX; px++) {
             try { preTileCtx.drawImage(mirrorCanvas, px * preTileW, py * preTileH, preTileW, preTileH); }
             catch (e) { /* ... error handling ... */ }
        }
    }

    // --- Step 2: Draw Final Tiled Image onto 'canvas' ---
    canvas.width = state.originalWidth; canvas.height = state.originalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawSourceWidth = preTileCanvas.width; const drawSourceHeight = preTileCanvas.height;

    try {
        // --- Shape-Specific Drawing Logic (using preTileCanvas as source) ---
        // ... (Keep the large if/else if block for all the tiling shapes exactly as it was) ...
        // Make sure to use the imported draw...Path functions where applicable.
        if (selectedShape === 'grid') { const tileWidth=canvas.width/numTilesX;const tileHeight=canvas.height/numTilesY;const scaledTileWidth=tileWidth*scaleFactor;const scaledTileHeight=tileHeight*scaleFactor;for(let y=0;y<numTilesY;y++){for(let x=0;x<numTilesX;x++){const tileX=x*tileWidth;const tileY=y*tileHeight;const offsetX=(tileWidth-scaledTileWidth)/2;const offsetY=(tileHeight-scaledTileHeight)/2;ctx.drawImage(preTileCanvas,tileX+offsetX,tileY+offsetY,scaledTileWidth,scaledTileHeight);}} }
        else if (selectedShape === 'brick_wall') { const tileWidth=canvas.width/numTilesX;const tileHeight=canvas.height/numTilesY;const scaledTileWidth=tileWidth*scaleFactor;const scaledTileHeight=tileHeight*scaleFactor;const startY=-1;const endY=numTilesY+1;const startX=-2;const endX=numTilesX+2;for(let y=startY;y<endY;y++){let xOffset=(y%2!==0)?tileWidth/2:0;for(let x=startX;x<endX;x++){const tileX=(x*tileWidth)-xOffset;const tileY=y*tileHeight;const drawOffsetX=(tileWidth-scaledTileWidth)/2;const drawOffsetY=(tileHeight-scaledTileHeight)/2;ctx.drawImage(preTileCanvas,tileX+drawOffsetX,tileY+drawOffsetY,scaledTileWidth,scaledTileHeight);}} }
        // ... include all other else if blocks for herringbone, skewed, hexagon, etc. ...
        else if (selectedShape === 'basketweave') { const plankWidth=canvas.width/numTilesX;const plankHeight=canvas.height/numTilesY;const numCols=numTilesX+2;const numRows=numTilesY+2;for(let r=-1;r<numRows;r++){for(let c=-1;c<numCols;c++){const x=c*plankWidth;const y=r*plankHeight;const isHorizontal=((Math.floor(r/2)+Math.floor(c/2))%2===0);ctx.save();ctx.beginPath();ctx.rect(x,y,plankWidth,plankHeight);ctx.clip();if(!isHorizontal){ctx.translate(x+plankWidth/2,y+plankHeight/2);ctx.rotate(Math.PI/2);ctx.translate(-(x+plankWidth/2),-(y+plankHeight/2));ctx.drawImage(preTileCanvas,x+plankWidth/2-drawSourceHeight/2,y+plankHeight/2-drawSourceWidth/2,drawSourceHeight,drawSourceWidth);}else{ctx.drawImage(preTileCanvas,x+plankWidth/2-drawSourceWidth/2,y+plankHeight/2-drawSourceHeight/2,drawSourceWidth,drawSourceHeight);} ctx.restore();}} }


    } catch (e) { /* ... error handling ... */ }

    // --- Step 3: Update Final Result Preview ---
    try {
        const dataURL = canvas.toDataURL('image/png');
        if (finalPreview) { finalPreview.src = dataURL; finalPreview.classList.remove('hidden'); }
        if (finalPreviewText) finalPreviewText.classList.add('hidden');
    } catch (error) { /* ... error handling ... */ }

    state.isProcessing = false;
}
