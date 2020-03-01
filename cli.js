#!/usr/bin/env node
'use strict';
const meow = require('meow');
const updateNotifier = require('update-notifier');
const help = require('./src/help');
const pkg = require('./package.json');
const taskbook = require('.');

const cli = meow(help, {
    flags: {
        table: {
            type: 'boolean',
            alias: 'table'
        },
        initDir: {
            type: 'boolean',
            alias: 'initDir'
        },
        help: {
            type: 'boolean',
            alias: 'h'
        },
        version: {
            type: 'boolean',
            alias: 'v'
        },
        archive: {
            type: 'boolean',
            alias: 'a'
        },
        restore: {
            type: 'boolean',
            alias: 'r'
        },
        task: {
            type: 'boolean',
            alias: 't'
        },
        note: {
            type: 'boolean',
            alias: 'n'
        },
        delete: {
            type: 'boolean',
            alias: 'd'
        },
        check: {
            type: 'boolean',
            alias: 'c'
        },
        begin: {
            type: 'boolean',
            alias: 'b'
        },
        bug: {
            type: 'boolean',
            alias: 'bug'
        },
        star: {
            type: 'boolean',
            alias: 's'
        },
        copy: {
            type: 'boolean',
            alias: 'y'
        },
        timeline: {
            type: 'boolean',
            alias: 'i'
        },
        boards: {
            type: 'boolean',
            alias: 'boards'
        },
        priority: {
            type: 'boolean',
            alias: 'p'
        },
        find: {
            type: 'boolean',
            alias: 'f'
        },
        list: {
            type: 'boolean',
            alias: 'l'
        },
        edit: {
            type: 'boolean',
            alias: 'e'
        },
        move: {
            type: 'boolean',
            alias: 'm'
        },
        moveToToday: {
            type: 'boolean',
            alias: 'today'
        },
        moveToDate: {
            type: 'boolean',
            alias: 'moveToDate'
        },
        resetDate: {
            type: 'boolean',
            alias: 'resetDate'
        },
        clearTimer: {
            type: 'boolean',
            alias: 'clearTimer'
        },
        clearTime: {
            type: 'boolean',
            alias: 'clearTime'
        },
        addTime: {
            type: 'boolean',
            alias: 'addTime'
        },
        removeTime: {
            type: 'boolean',
            alias: 'removeTime'
        },
        addBoard: {
            type: 'boolean',
            alias: 'addBoard'
        },
        removeBoard: {
            type: 'boolean',
            alias: 'removeBoard'
        },
        removeDeadline: {
            type: 'boolean',
            alias: 'removeDeadline'
        },
        setLink: {
          type: 'boolean',
          alias: 'addLink'
        },
        removeLink: {
          type: 'boolean',
          alias: 'removeLink'
        },
        viewLink: {
          type: 'boolean',
          alias: 'viewLink'
        },
        clear: {
            type: 'boolean'
        },
        save: {
            type: 'boolean'
        }
    }
});

updateNotifier({pkg}).notify();

taskbook(cli.input, cli.flags);
