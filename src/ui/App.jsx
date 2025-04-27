import React from 'react';
import { Theme } from '@swc-react/theme';
import TextSimplifier from './TextSimplifier';

const App = () => {
    return (
        <Theme>
            <div style={{ padding: '20px' }}>
                <TextSimplifier />
            </div>
        </Theme>
    );
};

export default App; 