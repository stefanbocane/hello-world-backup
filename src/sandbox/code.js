import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor, colorUtils, constants } from "express-document-sdk";

// Get the document sandbox runtime.
const { runtime } = addOnSandboxSdk.instance;

function start() {
    // APIs to be exposed to the UI runtime
    // i.e., to the `index.html` file of this add-on.
    const sandboxApi = {
        // Creates and appends a rectangle with given properties
        createRectangleWithProps: ({ width, height, x, y, colorHex }) => {
            const rectangle = editor.createRectangle();
            rectangle.width = width;
            rectangle.height = height;
            rectangle.translation = { x, y };
            if (colorHex) {
                rectangle.fill = editor.makeColorFill(colorUtils.fromHex(colorHex));
            }
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(rectangle);
        },
        // Creates and appends a text node with given properties
        createTextWithProps: ({ text, x, y, fontSize, colorHex, align }) => {
            const textNode = editor.createText();
            // Set the text content
            textNode.fullContent.text = text;
            
            // Get artboard dimensions to ensure text is visible
            const artboard = editor.context.currentPage.artboards.first;
            const artboardWidth = artboard ? artboard.width : 800;
            const artboardHeight = artboard ? artboard.height : 600;
            
            // Ensure text appears in a visible area (top-left corner with padding)
            const visibleX = x || 50;
            const visibleY = y || 50;
            
            // Position the text node
            textNode.translation = { x: visibleX, y: visibleY };
            
            // Apply alignment if provided
            if (align && constants.TextAlignment[align]) {
                textNode.textAlignment = constants.TextAlignment[align];
            }
            
            // Prepare character styles: always include fontFamily
            const styles = { fontFamily: 'Times New Roman' };
            if (fontSize) styles.fontSize = fontSize;
            if (colorHex) styles.color = colorUtils.fromHex(colorHex);
            
            // Apply character styles if any are set
            if (Object.keys(styles).length) {
                textNode.fullContent.applyCharacterStyles(styles);
            }
            
            // Append the text node to the document
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(textNode);
        },
        createLineWithProps: ({ x1, y1, x2, y2 }) => {
            const line = editor.createLine();
            // Set start and end points
            line.start = { x: x1, y: y1 };
            line.end = { x: x2, y: y2 };
            // Append to document
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(line);
        },
        getArtboardWidth: () => {
            const artboard = editor.context.currentPage.artboards.first;
            return artboard ? artboard.width : 0;
        },
        // Returns the current artboard height
        getArtboardHeight: () => {
            const artboard = editor.context.currentPage.artboards.first;
            return artboard ? artboard.height : 0;
        }
    };

    // Expose `sandboxApi` to the UI runtime.
    runtime.exposeApi(sandboxApi);
}

start();
