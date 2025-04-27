import React from 'react';
import { Button } from '@swc-react/button';

const ShapeCreator = ({ sandboxProxy }) => {
    const createShape = async () => {
        try {
            console.log('Calling sandboxProxy.createRectangle');
            await sandboxProxy.createRectangle();
            console.log('Shape created via sandbox proxy');
        } catch (error) {
            console.error('Error creating shape via sandbox proxy:', error);
        }
    };

    return (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <Button onClick={createShape}>
                Create Shape
            </Button>
        </div>
    );
};

export default ShapeCreator; 