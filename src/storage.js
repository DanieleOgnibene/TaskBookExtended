#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const config = require('./config');
const render = require('./render');
const {exec} = require("child_process");
const {write} = require('./utils/file-writer');

const {join} = path;

class Storage {
    constructor() {
        this._storageDir = join(this._mainAppDir, 'storage');
        this._archiveDir = join(this._mainAppDir, 'archive');
        this._tempDir = join(this._mainAppDir, '.temp');
        this._archiveFile = join(this._archiveDir, 'archive.json');
        this._mainStorageFile = join(this._storageDir, 'storage.json');

        this._ensureDirectories();
    }

    get _mainAppDir() {
        return config.get().taskbookDirectory;
    }

    _ensureMainAppDir() {
        if (!fs.existsSync(this._mainAppDir)) {
            fs.mkdirSync(this._mainAppDir);
        }
    }

    _ensureStorageDir() {
        if (!fs.existsSync(this._storageDir)) {
            fs.mkdirSync(this._storageDir);
        }
    }

    _ensureTempDir() {
        if (!fs.existsSync(this._tempDir)) {
            fs.mkdirSync(this._tempDir);
        }
    }

    _ensureArchiveDir() {
        if (!fs.existsSync(this._archiveDir)) {
            fs.mkdirSync(this._archiveDir);
        }
    }

    _cleanTempDir() {
        const tempFiles = fs.readdirSync(this._tempDir).map(x => join(this._tempDir, x));

        if (tempFiles.length !== 0) {
            tempFiles.forEach(tempFile => fs.unlinkSync(tempFile));
        }
    }

    _ensureDirectories() {
        this._ensureMainAppDir();
        this._ensureStorageDir();
        this._ensureArchiveDir();
        this._ensureTempDir();
        this._cleanTempDir();
    }


    get() {
        let data = {};
        if (fs.existsSync(this._mainStorageFile)) {
            const content = fs.readFileSync(this._mainStorageFile, 'utf8');
            data = JSON.parse(content);
        }

        return data;
    }

    getArchive() {
        let archive = {};

        if (fs.existsSync(this._archiveFile)) {
            const content = fs.readFileSync(this._archiveFile, 'utf8');
            archive = JSON.parse(content);
        }

        return archive;
    }

    set(data) {
        write(data, this._mainStorageFile, this._tempDir);
    }

    setArchive(archive) {
        write(archive, this._archiveFile, this._tempDir);
    }

    pushOnline() {
        const pushCommand = `git -C ${config.get().taskbookDirectory} commit -a -m "${new Date().toLocaleString('en-GB')}" && git -C ${config.get().taskbookDirectory} push`;
        render.savingData();
        exec(pushCommand, (error, gitError) => {
            if (error) {
                render.errorMessage(gitError);
                return;
            }
            render.successSaveData();
        });
    }

    saveNewTaskbookDirectory(newDirectory) {
        if (!fs.existsSync(newDirectory)) {
            render.invalidCustomAppDir(newDirectory);
        }
        config.setNewTaskbookDirectory(newDirectory);
        render.savedCustomAppDir();
    }
}

module.exports = Storage;
