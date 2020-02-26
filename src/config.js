'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const pkg = require('../package.json');
const {write} = require('./utils/file-writer');

const {join} = path;
const {default: defaultConfig} = pkg.configuration;

class Config {
    constructor() {
        this._homeDirPath = os.homedir();
        this._configFilePath = join(this._homeDirPath, '.taskbook.json');
        this._ensureConfigFile();
    }

    _ensureConfigFile() {
        if (fs.existsSync(this._configFilePath)) {
            return;
        }
        const data = this._getJsonFromObject(defaultConfig);
        fs.writeFileSync(this._configFilePath, data, 'utf8');
    }

    _getJsonFromObject(object) {
        return JSON.stringify(object, null, 4);
    }

    _formatTaskbookDir(path) {
        return join(os.homedir(), path.replace(/^~/g, ''));
    }

    _getConfig() {
        const content = fs.readFileSync(this._configFilePath, 'utf8');
        return JSON.parse(content);
    }

    _writeConfig(newConfig) {
        write(newConfig, this._configFilePath, this._homeDirPath);
    }

    get() {
        let config = this._getConfig();
        try {
            if (config.taskbookDirectory.startsWith('~')) {
                config.taskbookDirectory = this._formatTaskbookDir(config.taskbookDirectory);
            }
        } catch (err) {
            this._writeConfig(defaultConfig);
            return this.get();
        }
        return Object.assign({}, defaultConfig, config);
    }

    setNewTaskbookDirectory(newDirectoryPath) {
        const config = this._getConfig();
        config.taskbookDirectory = newDirectoryPath;
        this._writeConfig(config);
    }
}

module.exports = new Config();
