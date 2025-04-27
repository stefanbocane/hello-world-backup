// To support: system="express" scale="medium" color="light"
// import these spectrum web components modules:
import "@spectrum-web-components/theme/express/scale-medium.js";
import "@spectrum-web-components/theme/express/theme-light.js";

// To learn more about using "swc-react" visit:
// https://opensource.adobe.com/spectrum-web-components/using-swc-react/
import { Button } from "@swc-react/button";
import { Theme } from "@swc-react/theme";
import React from 'react';
import "./App.css";
import TextSimplifier from '../TextSimplifier';

// Simplified App: receives sandboxProxy from UI entry point and renders TextSimplifier
const App = ({ sandboxProxy }) => {
    return (
        <Theme>
            <div style={{
                padding: '20px',
                backgroundColor: '#ffffff',
                minHeight: '100vh',
                fontFamily: 'Arial, sans-serif'
            }}>
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    <TextSimplifier sandboxProxy={sandboxProxy} />
                </div>
            </div>
        </Theme>
    );
};

export default App;
