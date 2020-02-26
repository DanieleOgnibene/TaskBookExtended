#!/usr/bin/env node
'use strict';
const taskbook = require('./src/taskbook');

const taskbookCLI = (input, flags) => {
    if (flags.archive) {
        return taskbook.displayArchive();
    }

    if (flags.task) {
        return taskbook.createTask(input);
    }

    if (flags.restore) {
        return taskbook.restoreItems(input);
    }

    if (flags.note) {
        return taskbook.createNote(input);
    }

    if (flags.delete) {
        return taskbook.deleteItems(input);
    }

    if (flags.check) {
        return taskbook.checkTasks(input);
    }

    if (flags.begin) {
        return taskbook.beginTasks(input);
    }

    if (flags.star) {
        return taskbook.starItems(input);
    }

    if (flags.bug) {
        return taskbook.bugItems(input);
    }

    if (flags.priority) {
        return taskbook.updatePriority(input);
    }

    if (flags.copy) {
        return taskbook.copyToClipboard(input);
    }

    if (flags.timeline) {
        taskbook.displayByDate();
        return taskbook.displayStats();
    }

    if (flags.activeTimeLine) {
        taskbook.displayByActiveDate();
        return taskbook.displayStats();
    }

    if (flags.find) {
        taskbook.findItems(input);
        return taskbook.displayStats();
    }

    if (flags.list) {
        taskbook.listByAttributes(input);
        return taskbook.displayStats();
    }

    if (flags.edit) {
        return taskbook.editDescription(input);
    }

    if (flags.move) {
        return taskbook.moveBoards(input);
    }

    if (flags.addBoard) {
        return taskbook.addBoard(input);
    }

    if (flags.removeBoard) {
        return taskbook.removeBoard(input);
    }

    if (flags.moveToToday) {
        return taskbook.moveToToday(input);
    }

    if (flags.moveToDate) {
        return taskbook.moveItemsToDate(input);
    }

    if (flags.resetDate) {
        return taskbook.resetDate(input);
    }

    if (flags.clearTimer) {
        return taskbook.clearTimer(input);
    }

    if (flags.clearTime) {
        return taskbook.clearTime(input);
    }

    if (flags.addTime) {
        return taskbook.addTime(input);
    }

    if (flags.removeTime) {
        return taskbook.removeTime(input);
    }

    if (flags.clear) {
        return taskbook.clear();
    }

    taskbook.displayByBoard();
    return taskbook.displayStats();
};

module.exports = taskbookCLI;
