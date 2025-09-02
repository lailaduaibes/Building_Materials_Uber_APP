const fs = require('fs');
const chalk = require('chalk');

module.exports = {
  input: [
    'screens/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'src/**/*.{js,jsx,ts,tsx}',
    // Add other directories as needed
    '!**/node_modules/**',
    '!**/*.test.{js,jsx,ts,tsx}',
    '!src/i18n/**'
  ],
  output: './src/i18n/locales',
  options: {
    debug: true,
    func: {
      list: ['t', 'i18next.t', 'i18n.t'],
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    lngs: ['en', 'ar', 'hi', 'ur'], // Our target languages
    ns: ['translation'], // Namespaces
    defaultLng: 'en',
    defaultNs: 'translation',
    defaultValue: function(lng, ns, key) {
      if (lng === 'en') {
        // Return the key itself for English as placeholder
        return key;
      }
      // Return empty string for other languages to be filled by translators
      return '';
    },
    resource: {
      loadPath: '{{lng}}.json',
      savePath: '{{lng}}.json',
      jsonIndent: 2,
      lineEnding: '\n'
    },
    nsSeparator: ':', // namespace separator
    keySeparator: '.', // key separator
    interpolation: {
      prefix: '{{',
      suffix: '}}'
    },
    // Custom transform function to handle nested keys
    transform: function(file, enc, done) {
      'use strict';
      const parser = this.parser;
      const content = fs.readFileSync(file.path, enc);
      
      // Log which file is being processed
      console.log(chalk.blue('Scanning:'), file.path);
      
      parser.parseFuncFromString(content, { list: ['t'] }, (key, options) => {
        // Handle nested keys like 'support.categories.general'
        parser.set(key, options.defaultValue || key);
      });
      
      done();
    }
  }
};
