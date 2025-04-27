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
            textNode.fullContent.text = text;
            textNode.translation = { x, y };
            // Apply alignment if provided
            if (align && constants.TextAlignment[align]) {
                textNode.textAlignment = constants.TextAlignment[align];
            }
            const styles = { fontFamily: 'Times New Roman' };
            if (fontSize) styles.fontSize = fontSize;
            if (colorHex) styles.color = colorUtils.fromHex(colorHex);
            if (Object.keys(styles).length) {
                textNode.fullContent.applyCharacterStyles(styles);
            }
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
        }
    };

    // Expose `sandboxApi` to the UI runtime.
    runtime.exposeApi(sandboxApi);
}

start();
