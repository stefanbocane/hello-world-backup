import React, { useState } from 'react';
import { Button } from '@swc-react/button';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
// Use CDN worker for pdfjs-dist (version must match installed version)
GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.1.91/pdf.worker.min.js';

const TextSimplifier = ({ sandboxProxy }) => {
    const [inputText, setInputText] = useState('');
    const [simplifiedText, setSimplifiedText] = useState('');
    const [flowchartNodes, setFlowchartNodes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [summaryJson, setSummaryJson] = useState(null);
    const [titleJson, setTitleJson] = useState(null);
    const [statsJson, setStatsJson] = useState(null);

    const handleSimplify = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        setError('');
        setSummaryJson(null);
        setTitleJson(null);
        setStatsJson(null);
        setFlowchartNodes([]); // Reset flowchart nodes
        
        try {
            const apiKey = process.env.DEEPSEEK_API_KEY;
            if (!apiKey) {
                // Fallback: split inputText into sentences
                const sentences = inputText
                    .split(/[\.\n]+/)  // split on periods or newlines
                    .map(s => s.trim())
                    .filter(s => s);
                const nodes = sentences.map(s => ({ title: s, description: '' }));
                setFlowchartNodes(nodes);
                setSimplifiedText(JSON.stringify(nodes, null, 2));
                // Generate fallback JSON
                const summary = sentences.slice(0, 5).join('. ') + (sentences.length > 5 ? '...' : '');
                setSummaryJson({ summary });
                const title = inputText.split(/\s+/).slice(0, 5).join(' ');
                setTitleJson({ title });
                const stats = (inputText.match(/\d[\d.,]*/g) || []).slice(0, 3);
                setStatsJson({ stats });
                setIsLoading(false);
                return;
            }

            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that simplifies text and breaks it down into flowchart nodes. Each node should be a clear, concise step or concept. Return ONLY the JSON array of nodes, without any explanation. The JSON array should contain objects with 'title' and 'description' keys."
                        },
                        {
                            role: "user",
                            content: `Please break down this text into flowchart nodes: ${inputText}`
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to simplify text');
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            console.log('API Response:', content);
            
            try {
                // Try parsing the JSON response directly
                let nodes;
                try {
                    nodes = JSON.parse(content.trim());
                } catch (firstError) {
                    console.warn('Direct JSON parse failed, attempting to extract array...', firstError);
                    // Fallback: extract first JSON array in the text
                    const match = content.match(/\[([\s\S]*)\]/);
                    if (match) {
                        nodes = JSON.parse(match[0]);
                    } else {
                        throw firstError;
                    }
                }
                console.log('Parsed nodes:', nodes);
                setFlowchartNodes(nodes);
                setSimplifiedText(JSON.stringify(nodes, null, 2)); // Pretty print the JSON
            } catch (parseError) {
                console.error('Error parsing flowchart nodes:', parseError);
                // Fallback: split content into sentences for nodes
                const sentences = content
                    .split(/[\.\n]+/)             
                    .map(s => s.trim())
                    .filter(s => s);
                const fallbackNodes = sentences.map((s, i) => ({ title: s, description: '' }));
                console.log('Fallback nodes:', fallbackNodes);
                setFlowchartNodes(fallbackNodes);
                setSimplifiedText(JSON.stringify(fallbackNodes, null, 2)); // Pretty print fallback nodes
            }

            // Now generate Summary, Title, and Statistics JSONs via Deepseek
            try {
                // Summary
                const sumRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model:'deepseek-chat',
                        messages:[
                            {role:'system', content:'You are a helpful assistant that generates a concise 3-5 sentence summary of the given text. Return only a JSON object with a summary key without extra text.'},
                            {role:'user', content:inputText}
                        ]
                    })
                });
                if (sumRes.ok) {
                    const { choices } = await sumRes.json();
                    const c = choices[0].message.content.trim();
                    let obj;
                    try { obj = JSON.parse(c); } catch { const m = c.match(/\{[\s\S]*\}/); obj = m ? JSON.parse(m[0]) : { summary:c }; }
                    setSummaryJson(obj);
                }
                // Title
                const titRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model:'deepseek-chat',
                        messages:[
                            {role:'system', content:'You are a helpful assistant that generates a concise 3-5 word title for the given text. Return only a JSON object with a title key without extra text.'},
                            {role:'user', content:inputText}
                        ]
                    })
                });
                if (titRes.ok) {
                    const { choices } = await titRes.json();
                    const c = choices[0].message.content.trim();
                    let obj;
                    try { obj = JSON.parse(c); } catch { const m = c.match(/\{[\s\S]*\}/); obj = m ? JSON.parse(m[0]) : { title:c }; }
                    setTitleJson(obj);
                }
                // Statistics
                const statRes = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model:'deepseek-chat',
                        messages:[
                            {role:'system', content:'You are a helpful assistant that extracts three major statistics from the given text. Return only a JSON object with a stats key containing an array of three statistics without extra text.'},
                            {role:'user', content:inputText}
                        ]
                    })
                });
                if (statRes.ok) {
                    const { choices } = await statRes.json();
                    const c = choices[0].message.content.trim();
                    let obj;
                    try { obj = JSON.parse(c); } catch { const m = c.match(/\{[\s\S]*\}/); obj = m ? JSON.parse(m[0]) : { stats:[] }; }
                    setStatsJson(obj);
                }
            } catch(e) {
                console.error('Error generating JSON:',e);
            }
        } catch (error) {
            console.error('Error:', error);
            setError(error.message || 'Error occurred while simplifying text.');
            setSimplifiedText('');
            setFlowchartNodes([]);
        } finally {
            setIsLoading(false);
        }
    };

    const createFlowchart = async () => {
        // Determine nodes to use
        let nodesToUse = flowchartNodes;
        // Fallback: split simplifiedText if no nodes parsed
        if (!nodesToUse.length && simplifiedText) {
            const sentences = simplifiedText
                .split(/[\.\n]+/)             
                .map(s => s.trim())
                .filter(s => s);
            nodesToUse = sentences.map(s => ({ title: s, description: '' }));
            setFlowchartNodes(nodesToUse);
        }
        if (!nodesToUse.length) {
            setError('Cannot create flowchart: no nodes available');
            return;
        }

        try {
            // Stack scaled-down boxes vertically with centered text
            const boxWidth = 150;       // 200 * 0.75
            const boxHeight = 45;       // 60 * 0.75
            const startX = 10;
            const startY = 10;
            const spacing = 15;         // 20 * 0.75
            const titleFont = 5;        // decreased font size by 1
            const descFont = 5;         // increased font size by 1
            for (let i = 0; i < nodesToUse.length; i++) {
                const node = nodesToUse[i];
                const x = startX;
                const y = startY + i * (boxHeight + spacing);
                // Draw box
                await sandboxProxy.createRectangleWithProps({ width: boxWidth, height: boxHeight, x, y, colorHex: '#E8EAF6' });
                // Centered Title (bold)
                await sandboxProxy.createTextWithProps({ 
                    text: node.title, 
                    x: x + boxWidth / 2, 
                    y: y + 8, 
                    fontSize: titleFont, 
                    colorHex: '#000000', 
                    align: 'center',
                    fontWeight: 'bold'  // Added bold
                });
                // Centered and wrapped Description (max 4 lines)
                if (node.description) {
                    const words = node.description.split(' ');
                    const lines = [];
                    let currentLine = '';
                    const maxChars = 33;  // increased width boundary
                    for (const word of words) {
                        const test = currentLine ? currentLine + ' ' + word : word;
                        if (test.length > maxChars) {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                        } else {
                            currentLine = test;
                        }
                    }
                    if (currentLine) lines.push(currentLine);
                    // Limit to 4 rows and add ellipsis if truncated
                    let renderLines = lines.slice(0, 4);
                    if (lines.length > 4) {
                        renderLines[3] = renderLines[3] + '...';
                    }
                    const textYStart = y + 21;  // shifted up one line for description
                    for (let li = 0; li < renderLines.length; li++) {
                        const lineText = renderLines[li];
                        const lineY = textYStart + li * (descFont + 2);
                        await sandboxProxy.createTextWithProps({ text: lineText, x: x + boxWidth / 2, y: lineY, fontSize: descFont, colorHex: '#000000', align: 'center' });
                    }
                }
            }
        } catch (error) {
            console.error('Error creating flowchart:', error);
            setError('Error creating flowchart: ' + error.message);
        }
    };

    // Helper to draw an array of nodes as flowchart boxes
    const drawNodes = async (nodes) => {
        const boxWidth = 150;
        const boxHeight = 45;
        const startX = 10;
        const startY = 10;
        const spacing = 15;
        const titleFont = 5;
        const descFont = 5;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const x = startX;
            const y = startY + i * (boxHeight + spacing);
            await sandboxProxy.createRectangleWithProps({ width: boxWidth, height: boxHeight, x, y, colorHex: '#E8EAF6' });
            await sandboxProxy.createTextWithProps({ text: node.title, x: x + boxWidth / 2, y: y + 8, fontSize: titleFont, colorHex: '#000000', align: 'center' });
            if (node.description) {
                // optional: render description if provided (not used for summary/title/stats)
            }
        }
    };

    // Draw a 3-5 sentence summary inside flowchart boxes
    const createSummaryBox = async () => {
        if (!summaryJson) return;
        try {
            const boxWidth = 180;  // Doubled width
            const boxHeight = 100;
            const x = 200;
            const y = 150;
            
            // Create the box with a different color
            await sandboxProxy.createRectangleWithProps({
                width: boxWidth,
                height: boxHeight,
                x,
                y,
                colorHex: '#E3F2FD'  // Light blue color
            });

            // Add "Summary" title (bold)
            await sandboxProxy.createTextWithProps({
                text: "Summary",
                x: x + boxWidth/2,
                y: y + 15,
                fontSize: 5,
                colorHex: '#000000',
                align: 'center',
                fontWeight: 'bold'
            });

            // Add the summary text, wrapped to fit the new width
            const summaryText = summaryJson.summary || '';
            const sentences = summaryText.split(/[.!?]+/).slice(0, 3);
            const maxChars = 62; // 30% wider boundary
            let yOffset = y + 30; // Moved up one line
            for (let i = 0; i < sentences.length; i++) {
                const words = sentences[i].trim().split(' ');
                let line = '';
                for (let w = 0; w < words.length; w++) {
                    const testLine = line ? line + ' ' + words[w] : words[w];
                    if (testLine.length > maxChars) {
                        await sandboxProxy.createTextWithProps({
                            text: line,
                            x: x + boxWidth/2,
                            y: yOffset,
                            fontSize: 2, // Decreased font size by 2
                            colorHex: '#000000',
                            align: 'center'
                        });
                        yOffset += 8; // Adjusted spacing for smaller font
                        line = words[w];
                    } else {
                        line = testLine;
                    }
                }
                if (line) {
                    await sandboxProxy.createTextWithProps({
                        text: line,
                        x: x + boxWidth/2,
                        y: yOffset,
                        fontSize: 2, // Decreased font size by 2
                        colorHex: '#000000',
                        align: 'center'
                    });
                    yOffset += 8; // Adjusted spacing for smaller font
                }
            }
        } catch (error) {
            console.error('Error creating summary box:', error);
            setError('Error creating summary box: ' + error.message);
        }
    };

    // Draw a 3-5 word title inside flowchart boxes
    const createTitleBox = async () => {
        if (!titleJson) return;
        try {
            const boxWidth = 200;
            const boxHeight = 60;
            const x = 200;
            const y = 30;
            
            // Create the box with a different color
            await sandboxProxy.createRectangleWithProps({
                width: boxWidth,
                height: boxHeight,
                x,
                y,
                colorHex: '#FFF9C4'  // Light yellow color
            });

            // Add "Title" label (bold)
            await sandboxProxy.createTextWithProps({
                text: "Title",
                x: x + boxWidth/2,
                y: y + 15,
                fontSize: 6,
                colorHex: '#000000',
                align: 'center',
                fontWeight: 'bold'
            });

            // Add the title text
            const titleText = titleJson.title || '';
            await sandboxProxy.createTextWithProps({
                text: titleText,
                x: x + boxWidth/2,
                y: y + 35,
                fontSize: 5,
                colorHex: '#000000',
                align: 'center'
            });
        } catch (error) {
            console.error('Error creating title box:', error);
            setError('Error creating title box: ' + error.message);
        }
    };

    // Draw a bulleted list of 3 major stats inside flowchart boxes
    const createStatsBox = async () => {
        if (!statsJson) return;
        try {
            const boxWidth = 180;  // Doubled width
            const boxHeight = 100;
            const x = 200;
            const y = 300;
            
            // Create the box with a different color
            await sandboxProxy.createRectangleWithProps({
                width: boxWidth,
                height: boxHeight,
                x,
                y,
                colorHex: '#F1F8E9'  // Light green color
            });

            // Add "Statistics" title (bold)
            await sandboxProxy.createTextWithProps({
                text: "Statistics",
                x: x + boxWidth/2,
                y: y + 15,
                fontSize: 5,
                colorHex: '#000000',
                align: 'center',
                fontWeight: 'bold'
            });

            // Add the statistics, wrapped to fit the new width
            const stats = statsJson.stats || [];
            let yOffset = y + 30; // Moved up one line
            const maxChars = 62; // 30% wider boundary
            for (let i = 0; i < stats.length; i++) {
                const words = stats[i].split(' ');
                let line = '';
                for (let w = 0; w < words.length; w++) {
                    const testLine = line ? line + ' ' + words[w] : words[w];
                    if (testLine.length > maxChars) {
                        await sandboxProxy.createTextWithProps({
                            text: line,
                            x: x + boxWidth/2,
                            y: yOffset,
                            fontSize: 2, // Decreased font size by 2
                            colorHex: '#000000',
                            align: 'center'
                        });
                        yOffset += 8; // Adjusted spacing for smaller font
                        line = words[w];
                    } else {
                        line = testLine;
                    }
                }
                if (line) {
                    await sandboxProxy.createTextWithProps({
                        text: line,
                        x: x + boxWidth/2,
                        y: yOffset,
                        fontSize: 2, // Decreased font size by 2
                        colorHex: '#000000',
                        align: 'center'
                    });
                    yOffset += 8; // Adjusted spacing for smaller font
                }
            }
        } catch (error) {
            console.error('Error creating stats box:', error);
            setError('Error creating stats box: ' + error.message);
        }
    };

    // PDF upload handler
    const handlePdfUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsLoading(true);
        setError('');
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await getDocument({ data: arrayBuffer }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n';
            }
            setInputText(text);
        } catch (err) {
            setError('Failed to extract text from PDF: ' + (err && err.message ? err.message : String(err)));
            console.error('PDF extraction error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Debug log to check button state
    console.log('Flowchart nodes:', flowchartNodes);
    console.log('Button disabled:', !flowchartNodes.length || !sandboxProxy);

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Text Simplifier & Flowchart Creator</h2>
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to simplify and convert to flowchart..."
                style={{
                    width: '100%',
                    minHeight: '150px',
                    marginBottom: '20px',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                }}
            />
            {/* PDF Upload Feature */}
            <div style={{ marginBottom: '20px' }}>
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    disabled={isLoading}
                />
                <span style={{ marginLeft: '10px', fontSize: '0.95em', color: '#555' }}>
                    Upload PDF to extract and process its text
                </span>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <Button onClick={handleSimplify} disabled={isLoading || !inputText.trim()}>
                    {isLoading ? 'Simplifying...' : 'Simplify Text'}
                </Button>
                <Button onClick={createFlowchart} disabled={flowchartNodes.length === 0}>
                    Create Flowchart
                </Button>
                <Button onClick={createSummaryBox} disabled={!inputText.trim()}>
                    Generate Summary
                </Button>
                <Button onClick={createTitleBox} disabled={!inputText.trim()}>
                    Generate Title
                </Button>
                <Button onClick={createStatsBox} disabled={!inputText.trim()}>
                    Generate Statistics
                </Button>
            </div>
            {error && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    borderRadius: '4px',
                    border: '1px solid #ef9a9a',
                    marginBottom: '20px'
                }}>
                    {error}
                </div>
            )}
            {simplifiedText && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    border: '1px solid #ddd'
                }}>
                    <h3>Simplified Text:</h3>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{simplifiedText}</pre>
                </div>
            )}
            {summaryJson && (
                <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #90caf9', marginTop: '20px' }}>
                    <h3>Summary JSON:</h3>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(summaryJson, null, 2)}</pre>
                </div>
            )}
            {titleJson && (
                <div style={{ padding: '15px', backgroundColor: '#fff9c4', borderRadius: '4px', border: '1px solid #fff59d', marginTop: '20px' }}>
                    <h3>Title JSON:</h3>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(titleJson, null, 2)}</pre>
                </div>
            )}
            {statsJson && (
                <div style={{ padding: '15px', backgroundColor: '#f1f8e9', borderRadius: '4px', border: '1px solid #c5e1a5', marginTop: '20px' }}>
                    <h3>Statistics JSON:</h3>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(statsJson, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default TextSimplifier;