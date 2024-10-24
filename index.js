#!/usr/bin/env node

import figlet from 'figlet';
import chokidar from 'chokidar';
import { exec } from 'child_process';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

figlet('LYNX', (err, data) => {
  if (err) {
    console.error('Error generating ASCII art');
    return;
  }
  console.log(chalk.hex('#FFA500')(data));
  console.log(chalk.hex('#FFA500')('Welcome to lynx-watcher! Let\'s get started.'));

  const argv = yargs(hideBin(process.argv))
    .option('path', {
      alias: 'p',
      description: 'Path to watch files',
      type: 'string',
      default: '**/*.{js,phtml,xml,less}'
    })
    .option('cache', {
      alias: 'c',
      description: 'Specify cache types to clear',
      type: 'string',
      default: 'block_html layout full_page'
    })
    .option('theme', {
      alias: 't',
      description: 'Specify custom theme directory (can be used multiple times for projects with multiple themes)',
      type: 'array',
    })
    .help()
    .alias('help', 'h')
    .parse();

  const defaultPaths = [
    'app/code/**/*.js', 
    'app/code/**/*.phtml',
    'app/code/**/*.xml',
    'app/code/**/*.less',
    'vendor/magento/**/*.js',
    'vendor/magento/**/*.phtml',
    'vendor/magento/**/*.xml',
    'app/design/frontend/**/*.js',
    'app/design/frontend/**/*.phtml',
    'app/design/frontend/**/*.xml',
    'app/design/frontend/**/*.less',
    'pub/static/frontend/**/*.js',
    'pub/static/frontend/**/*.less',
  ];

  const autoDetectThemes = () => {
    const themeBasePath = 'vendor/vaimo/';
    let detectedThemes = [];

    try {
      const themes = fs.readdirSync(themeBasePath).filter(file => fs.statSync(path.join(themeBasePath, file)).isDirectory());
      detectedThemes = themes.map(theme => `${themeBasePath}${theme}`);
      if (detectedThemes.length) {
        console.log(chalk.green(`Auto-detected themes: ${detectedThemes.join(', ')}`));
      } else {
        console.log(chalk.yellow('No themes detected in vendor/vaimo/.'));
      }
    } catch (err) {
      console.error(chalk.red(`Could not detect themes: ${err.message}`));
    }

    return detectedThemes;
  };

  let themePaths = autoDetectThemes();

  if (argv.theme) {
    themePaths = themePaths.concat(argv.theme);
  }

  themePaths.forEach(themePath => {
    defaultPaths.push(`${themePath}/**/*.js`);
    defaultPaths.push(`${themePath}/**/*.phtml`);
    defaultPaths.push(`${themePath}/**/*.xml`);
    defaultPaths.push(`${themePath}/**/*.less`);
  });

  const watchPaths = argv.path ? [argv.path] : defaultPaths;

  console.log(chalk.hex('#FFA500')(`Watching Magento files for changes...`));

  const cleanCache = (cacheTypes) => {
    console.log(chalk.green(`Cleaning caches: ${cacheTypes}`));
    exec(`php bin/magento cache:clean ${cacheTypes}`, (err, stdout, stderr) => {
      if (err) {
        console.error(chalk.red(`Error clearing cache: ${stderr}`));
        return;
      }
      console.log(chalk.green(`Cache cleared: ${stdout}`));
    });
  };

  const watcher = chokidar.watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    ignored: /node_modules/
  });

  watcher.on('change', (path) => {
    console.log(chalk.blue(`File changed: ${path}`));
    cleanCache(argv.cache);
  });

  watcher.on('error', (error) => console.error(chalk.red(`Watcher error: ${error}`)));

  process.on('SIGINT', () => {
    console.log(chalk.yellow("\nStopping watcher..."));
    process.exit();
  });
});
