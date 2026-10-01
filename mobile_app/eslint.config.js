const reactPlugin = require("eslint-plugin-react");
const unusedImportsPlugin = require("eslint-plugin-unused-imports");

module.exports = [
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        console: "readonly",
        require: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        alert: "readonly",
        FormData: "readonly",
        URLSearchParams: "readonly",
        __DEV__: "readonly",
        module: "readonly",
        fetch: "readonly",
        window: "readonly"
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        }
      }
    },
    plugins: {
      react: reactPlugin,
      "unused-imports": unusedImportsPlugin,
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": "off",
      "react/no-unescaped-entities": "off"
    }
  }
];
