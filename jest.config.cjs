/** @type {import('jest').Config} */
const config = {
    // Informa ao Jest para usar o ambiente Node.js
    testEnvironment: 'node',

    // Permite que o Jest processe módulos ES6
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
};

module.exports = config;